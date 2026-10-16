'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, CheckCircle2, Route, ArrowUpDown, Crosshair, Map as MapIcon, Navigation, Search, X } from 'lucide-react';
import { useFavorites } from '@/context/FavoritesContext';
import { useGeolocation } from '@/context/GeolocationContext';
import { getStation, searchStations, STATIONS, type CatalogStation } from '@/lib/metro/catalog';
import { refreshMetroLive, useMetroIncidents, useMetroStation, useMetroStatus, useOldestFetchedAt } from '@/lib/metro/hooks';
import { useOnboarding } from '@/hooks/useOnboarding';
import { LineChip, LiveBadge, Minutes, SPRING } from './parts';
import { IncidentsBanner } from './IncidentsSheet';
import { TrainStrip } from './ui';

/* ───────── Selector de estación con búsqueda local ───────── */
function StationField({
    label,
    value,
    onChange,
    className,
}: {
    label: string;
    value: CatalogStation | null;
    onChange: (s: CatalogStation | null) => void;
    className?: string;
}) {
    const [q, setQ] = useState('');
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const results = useMemo(() => searchStations(q), [q]);

    useEffect(() => {
        const close = (e: PointerEvent) => {
            if (!ref.current?.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('pointerdown', close);
        return () => document.removeEventListener('pointerdown', close);
    }, []);

    return (
        <div ref={ref} className="relative">
            <div className="flex min-h-14 items-center gap-3 rounded-[14px] px-3.5" style={{ background: 'var(--surface-2)' }}>
                <span className="w-14 shrink-0 text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--ink-2)' }}>
                    {label}
                </span>
                {value ? (
                    <>
                        <span className="min-w-0 flex-1 truncate text-[17px] font-semibold" style={{ color: 'var(--ink)' }}>{value.name}</span>
                        <button onClick={() => { onChange(null); setQ(''); }} aria-label={`Quitar ${label}`} className="bt-press grid h-11 w-11 place-items-center">
                            <X className="h-4 w-4" style={{ color: 'var(--ink-2)' }} />
                        </button>
                    </>
                ) : (
                    <input
                        className={`${className ?? ''} min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-[var(--ink-2)]`}
                        style={{ color: 'var(--ink)' }}
                        placeholder="Buscar estación"
                        value={q}
                        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
                        onFocus={() => setOpen(true)}
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        enterKeyHint="search"
                        aria-label={label}
                    />
                )}
            </div>
            <AnimatePresence>
                {open && !value && results.length > 0 && (
                    <motion.ul
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.1 } }}
                        transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                        style={{ transformOrigin: 'top' }}
                        className="bt-card absolute inset-x-0 top-full z-30 mt-2 overflow-hidden p-1.5"
                    >
                        {results.map((s) => (
                            <li key={s.code}>
                                <button
                                    onClick={() => { onChange(s); setOpen(false); setQ(''); }}
                                    className="bt-press flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left hover:bg-[var(--surface-2)]"
                                >
                                    <span className="flex-1 truncate text-[16px] font-medium" style={{ color: 'var(--ink)' }}>{s.name}</span>
                                    <span className="flex gap-1">{s.lines.map((l) => <LineChip key={l} line={l} size="sm" />)}</span>
                                </button>
                            </li>
                        ))}
                    </motion.ul>
                )}
            </AnimatePresence>
        </div>
    );
}

/* ───────── Tarjeta compacta de estación con próximos trenes en vivo ───────── */
function LiveStationCard({ station, distanceKm }: { station: CatalogStation; distanceKm?: number | null }) {
    const { data } = useMetroStation(station.code);
    const groups = (data?.groups ?? []).filter((g) => g.trains.length > 0);
    return (
        <Link href={`/metro/station/${station.code}?agency=metro`} className="bt-card bt-press block h-full min-w-0 p-3" prefetch>
            <h3 className="truncate text-[15px] font-bold leading-5 tracking-[-0.01em]" style={{ color: 'var(--ink)' }}>{station.name}</h3>
            <p className="bt-num mb-2 truncate text-[11px] leading-4" style={{ color: 'var(--ink-2)' }}>
                {station.lines.join(' · ')}
                {typeof distanceKm === 'number' && ` · ${distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`}`}
            </p>
            {!data ? (
                <div className="space-y-1.5" aria-hidden>
                    <div className="bt-skeleton h-6" />
                    <div className="bt-skeleton h-6" />
                </div>
            ) : groups.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--ink-2)' }}>Sin trenes ahora</p>
            ) : (
                <div className="space-y-1.5">
                    {groups.map((g) => {
                        const t = g.trains[0];
                        return (
                            <div key={g.side} className="flex items-center gap-1.5">
                                <LineChip line={t.line} size="sm" />
                                <span className="min-w-0 flex-1 truncate text-[13px] font-medium" style={{ color: 'var(--ink)' }}>{t.destination}</span>
                                <Minutes value={t.minutes} compact />
                            </div>
                        );
                    })}
                </div>
            )}
        </Link>
    );
}

/* ───────── Barra de actualización de la home ───────── */
function HomeLiveBar({ codes }: { codes: string[] }) {
    const [, tick] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    useEffect(() => {
        const id = setInterval(() => tick((n) => n + 1), 1000);
        return () => clearInterval(id);
    }, []);
    const fetchedAt = useOldestFetchedAt(codes);
    if (codes.length === 0) return null;
    return (
        <div className="flex justify-end">
            <LiveBadge
                fetchedAt={fetchedAt}
                refreshing={refreshing}
                onRefresh={async () => {
                    setRefreshing(true);
                    try {
                        await refreshMetroLive();
                    } finally {
                        setRefreshing(false);
                    }
                }}
            />
        </div>
    );
}

const MAX_HOME_FAVORITES = 4;

/* ───────── Home ───────── */
export default function MetroHome() {
    const router = useRouter();
    const [origin, setOrigin] = useState<CatalogStation | null>(null);
    const [dest, setDest] = useState<CatalogStation | null>(null);
    const { favorites } = useFavorites();
    const { location, requestLocation, calculateDistance } = useGeolocation();
    const { data: status } = useMetroStatus();
    const { data: incidents } = useMetroIncidents();
    const { startTour } = useOnboarding();
    const issueNames = useMemo(
        () => [...new Set(Object.values(status?.lines ?? {}).flatMap((l) => l.issues.map((i) => i.name)))],
        [status],
    );

    useEffect(() => {
        const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
        const id = idle ? idle(() => startTour()) : window.setTimeout(() => startTour(), 1200);
        return () => {
            if (!idle) window.clearTimeout(id);
        };
    }, [startTour]);

    const favStations = useMemo(() => {
        const seen = new Set<string>();
        return favorites
            .filter((f) => f.agency === 'metro')
            .map((f) => getStation(f.stopId.replace(/[12]$/, '')))
            .filter((s): s is CatalogStation => Boolean(s) && !seen.has(s!.code) && Boolean(seen.add(s!.code)));
    }, [favorites]);

    const nearby = useMemo(() => {
        if (!location) return [];
        return STATIONS.filter((s) => s.lat !== null && s.lon !== null)
            .map((s) => ({ s, km: calculateDistance(s.lat as number, s.lon as number) }))
            .sort((a, b) => a.km - b.km)
            .slice(0, 2);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location]);

    const liveCodes = useMemo(() => [...favStations.map((x) => x.code), ...nearby.map((x) => x.s.code)], [favStations, nearby]);

    const go = () => {
        if (origin && dest) router.push(`/metro/route?origin=${origin.code}&dest=${dest.code}`);
        else if (origin) router.push(`/metro/station/${origin.code}?agency=metro`);
    };

    return (
        <div className="min-h-dvh pb-[max(6rem,env(safe-area-inset-bottom))]" style={{ background: 'var(--bg)' }}>
            <header className="relative overflow-hidden rounded-b-[28px]" style={{ background: 'var(--hero)' }}>
                <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 pb-3 pt-[max(1.25rem,env(safe-area-inset-top))]">
                    <Image src="/brand/mb-logo-white-text.png" alt="Metro Bilbao" width={650} height={230} priority className="h-9 w-auto" />
                    <div className="flex-1" />
                    <Link href="/metro/lines" aria-label="Líneas" className="bt-press grid h-11 w-11 place-items-center rounded-full bg-white/10">
                        <Route className="h-5 w-5 text-white" />
                    </Link>
                    <Link href="/metro/map" aria-label="Mapa en vivo" className="bt-press grid h-11 w-11 place-items-center rounded-full bg-white/10">
                        <MapIcon className="h-5 w-5 text-white" />
                    </Link>
                </div>
                {/* El tren oficial tiene la carrocería casi negra: va sobre franja clara para que se vea en modo oscuro */}
                <div style={{ background: '#e9e9ee' }}>
                    <div className="mx-auto max-w-2xl pb-3 pt-3">
                        <TrainStrip height={44} />
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-2xl space-y-5 px-4 pt-3">
                <IncidentsBanner service={incidents?.serviceIssues ?? []} installation={incidents?.installationIssues ?? []} />
                {!status?.blocked && issueNames.length > 0 && (
                    <div className="flex gap-2.5 rounded-2xl px-4 py-3 text-sm" style={{ background: 'color-mix(in srgb, var(--warn) 16%, var(--surface))', color: 'var(--ink)' }} role="status">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--warn)' }} aria-hidden />
                        Incidencias en: {issueNames.join(', ')}
                    </div>
                )}
                {status?.blocked && (
                    <div className="flex gap-2.5 rounded-2xl px-4 py-3 text-sm" style={{ background: 'color-mix(in srgb, var(--warn) 16%, var(--surface))', color: 'var(--ink)' }} role="status">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--warn)' }} aria-hidden />
                        El servicio de Metro Bilbao está en mantenimiento.
                    </div>
                )}

                <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={SPRING} className="bt-card relative z-20 space-y-2 p-2.5">
                    <StationField label="Origen" value={origin} onChange={setOrigin} className="origin-input" />
                    <div className="relative">
                        <StationField label="Destino" value={dest} onChange={setDest} className="destination-input" />
                        {origin && dest && (
                            <button
                                onClick={() => { setOrigin(dest); setDest(origin); }}
                                aria-label="Invertir"
                                className="bt-press bt-card absolute -top-5 right-3 grid h-9 w-9 place-items-center rounded-full"
                            >
                                <ArrowUpDown className="h-4 w-4" style={{ color: 'var(--ink-2)' }} />
                            </button>
                        )}
                    </div>
                    <AnimatePresence initial={false}>
                        {origin && (
                            <motion.button
                                key="go"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 52 }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                                onClick={go}
                                className="bt-press flex w-full items-center justify-center gap-2 overflow-hidden rounded-[14px] text-[16px] font-semibold text-white"
                                style={{ background: 'var(--metro)' }}
                            >
                                <Search className="h-4 w-4" aria-hidden />
                                {dest ? 'Ver trayecto' : 'Ver trenes de la parada'}
                            </motion.button>
                        )}
                    </AnimatePresence>
                </motion.section>

                <div className="flex items-center justify-between gap-3">
                    {incidents && !status?.blocked && issueNames.length === 0 && incidents.serviceIssues.length + incidents.installationIssues.length === 0 ? (
                        <span className="inline-flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--ink-2)' }}>
                            <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--live)' }} aria-hidden />
                            Servicio normal
                        </span>
                    ) : <span />}
                    <HomeLiveBar codes={liveCodes} />
                </div>

                <section id="favoritos" className="favorites-section scroll-mt-4 space-y-3" aria-label="Favoritos">
                    <h2 className="px-1 text-[13px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--ink-2)' }}>Favoritos</h2>
                    {favStations.length === 0 ? (
                        <div className="bt-card px-4 py-6 text-center">
                            <p className="text-[15px] font-medium" style={{ color: 'var(--ink)' }}>Aún no tienes favoritos</p>
                            <p className="mt-1 text-sm" style={{ color: 'var(--ink-2)' }}>Abre una parada y pulsa el corazón para verla aquí en directo.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3">
                            {favStations.slice(0, MAX_HOME_FAVORITES).map((s, i) => (
                                <motion.div key={s.code} className="min-w-0" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING, delay: i * 0.04 }}>
                                    <LiveStationCard station={s} />
                                </motion.div>
                            ))}
                        </div>
                    )}
                    {favStations.length > MAX_HOME_FAVORITES && (
                        <p className="px-1 text-xs" style={{ color: 'var(--ink-2)' }}>Se muestran {MAX_HOME_FAVORITES} de {favStations.length} favoritas.</p>
                    )}
                </section>

                <section className="space-y-3" aria-label="Cerca de ti">
                    <h2 className="px-1 text-[13px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--ink-2)' }}>Cerca de ti</h2>
                    {nearby.length === 0 ? (
                        <button onClick={() => requestLocation()} className="bt-card bt-press flex min-h-14 w-full items-center gap-3 px-4 text-left">
                            <Crosshair className="h-5 w-5" style={{ color: 'var(--metro)' }} aria-hidden />
                            <span className="flex-1 text-[15px] font-medium" style={{ color: 'var(--ink)' }}>Usar mi ubicación</span>
                            <Navigation className="h-4 w-4" style={{ color: 'var(--ink-2)' }} aria-hidden />
                        </button>
                    ) : (
                        <div className="grid grid-cols-2 gap-3">{nearby.map(({ s, km }) => <LiveStationCard key={s.code} station={s} distanceKm={km} />)}</div>
                    )}
                </section>
            </main>
        </div>
    );
}
