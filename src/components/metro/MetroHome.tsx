'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, CheckCircle2, Route, ArrowUpDown, Crosshair, Map as MapIcon, Navigation, Search, SlidersHorizontal } from 'lucide-react';
import { useFavorites } from '@/context/FavoritesContext';
import { useGeolocation } from '@/context/GeolocationContext';
import { getStation, STATIONS, type CatalogStation } from '@/lib/metro/catalog';
import { refreshMetroLive, useMetroIncidents, useMetroStation, useMetroStatus, useOldestFetchedAt } from '@/lib/metro/hooks';
import { useMetroHomePrefs } from '@/hooks/useMetroHomePrefs';
import { LineChip, LiveBadge, Minutes, SPRING } from './parts';
import { IncidentsBanner } from './IncidentsSheet';
import { RouteLiveCard, RouteSuggestions } from './RouteCards';
import { useMetroRoutes } from '@/lib/metro/routes';
import { BottomSheet, TrainStrip } from './ui';
import { HeroAction, NetworkHero } from '@/components/shared/brand';
import { LegalFooter } from '@/components/shared/Legal';
import { StationField } from './StationField';
import { BilboMark } from '@/components/shared/BilboLogo';
import { TimeFields, windowValid, type TripMode } from './TripTimeFields';
import { defaultWindow, scheduleHref, type TripWindow } from '@/lib/metro/tripTime';

/* ───────── Tarjeta compacta de estación con próximos trenes en vivo ───────── */
export function LiveStationCard({ station, distanceKm }: { station: CatalogStation; distanceKm?: number | null }) {
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
function HomeLiveBar({ codes, hasRoutes = false }: { codes: string[]; hasRoutes?: boolean }) {
    const [, tick] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    useEffect(() => {
        const id = setInterval(() => tick((n) => n + 1), 1000);
        return () => clearInterval(id);
    }, []);
    const fetchedAt = useOldestFetchedAt(codes);
    if (codes.length === 0 && !hasRoutes) return null;
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

/* ───────── Interruptor accesible ───────── */
function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
    return (
        <button
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className="bt-press flex min-h-14 w-full items-center gap-3 rounded-2xl px-4 py-2 text-left"
            style={{ background: 'var(--surface-2)' }}
        >
            <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold" style={{ color: 'var(--ink)' }}>{label}</span>
                {hint && <span className="block text-xs" style={{ color: 'var(--ink-2)' }}>{hint}</span>}
            </span>
            <span className="relative h-7 w-12 shrink-0 rounded-full transition-colors" style={{ background: checked ? 'var(--metro)' : 'var(--ink-2)', opacity: checked ? 1 : 0.5 }} aria-hidden>
                <span className="absolute top-0.5 h-6 w-6 rounded-full bg-white transition-all" style={{ left: checked ? 22 : 2 }} />
            </span>
        </button>
    );
}

/* ───────── Home ───────── */
export default function MetroHome() {
    const router = useRouter();
    const [origin, setOrigin] = useState<CatalogStation | null>(null);
    const [dest, setDest] = useState<CatalogStation | null>(null);
    const { favorites } = useFavorites();
    const { favorites: favRoutes, suggestions } = useMetroRoutes();
    const suggested = suggestions(3);
    const { location, requestLocation, calculateDistance, isLoading: geoLoading, error: geoError } = useGeolocation();
    const { prefs, updatePrefs, last, saveLast, ready } = useMetroHomePrefs();
    const [prefsOpen, setPrefsOpen] = useState(false);
    const [locating, setLocating] = useState<number | null>(null); // instante en que se pidió "estación más cercana"
    const { data: status } = useMetroStatus();
    const { data: incidents } = useMetroIncidents();
    const flagged = useMemo(() => {
        const byCode = new Map<string, { code: string; name: string }>();
        for (const l of Object.values(status?.lines ?? {})) for (const i of l.issues) byCode.set(i.code, i);
        return [...byCode.values()];
    }, [status]);

    const favStations = useMemo(() => {
        const seen = new Set<string>();
        return favorites
            .filter((f) => f.agency === 'metro')
            .map((f) => getStation(f.stopId.replace(/[12]$/, '')))
            .filter((s): s is CatalogStation => Boolean(s) && !seen.has(s!.code) && Boolean(seen.add(s!.code)));
    }, [favorites]);

    /* Última búsqueda: se precarga una sola vez, sin pisar lo que el usuario ya haya escrito. */
    /* Cuándo viajas: ahora (tiempo real) o una franja del horario programado. La franja se calcula al elegir «Elegir hora». */
    const [mode, setMode] = useState<TripMode>('now');
    const [win, setWin] = useState<TripWindow>({ date: '', start: '', end: '' });
    const chooseMode = (m: TripMode) => {
        if (m === 'time' && !win.date) setWin(defaultWindow());
        setMode(m);
    };
    const timeOk = mode === 'now' || windowValid(win);

    const restored = useRef(false);
    useEffect(() => {
        if (!ready || restored.current) return;
        restored.current = true;
        if (!prefs.rememberSearch || !last) return;
        const o = getStation(last.origin);
        if (o) setOrigin((cur) => cur ?? o);
        const d = last.dest ? getStation(last.dest) : null;
        if (d) setDest((cur) => cur ?? d);
    }, [ready, last, prefs.rememberSearch]);

    /* Brújula del campo Origen: pide posición nueva y fija la estación más cercana. */
    const pickNearest = () => {
        setLocating(Date.now());
        void requestLocation();
    };
    useEffect(() => {
        if (locating === null) return;
        if (location && location.timestamp >= locating) {
            const best = STATIONS.filter((s) => s.lat !== null && s.lon !== null)
                .map((s) => ({ s, km: calculateDistance(s.lat as number, s.lon as number) }))
                .sort((a, b) => a.km - b.km)[0];
            if (best) setOrigin(best.s);
            setLocating(null);
        } else if (!geoLoading && geoError) {
            setLocating(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location, geoLoading, geoError, locating]);

    /* "Cerca de ti" activado: si el permiso ya está concedido, se refresca solo (sin pedir permiso al abrir). */
    useEffect(() => {
        if (!prefs.showNearby || location || !navigator.permissions?.query) return;
        navigator.permissions.query({ name: 'geolocation' }).then((p) => {
            if (p.state === 'granted') void requestLocation();
        }).catch(() => {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [prefs.showNearby]);

    const nearby = useMemo(() => {
        if (!prefs.showNearby || !location) return [];
        return STATIONS.filter((s) => s.lat !== null && s.lon !== null)
            .map((s) => ({ s, km: calculateDistance(s.lat as number, s.lon as number) }))
            .sort((a, b) => a.km - b.km)
            .slice(0, 2);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location, prefs.showNearby]);

    const liveCodes = useMemo(
        () => [...(prefs.showFavorites ? favStations.map((x) => x.code) : []), ...nearby.map((x) => x.s.code)],
        [favStations, nearby, prefs.showFavorites],
    );

    const [going, startGo] = useTransition();
    const go = () => startGo(() => {
        if (origin) saveLast({ origin: origin.code, dest: dest?.code ?? null });
        if (origin && dest && mode === 'time') router.push(scheduleHref(origin.code, dest.code, win));
        else if (origin && dest) router.push(`/metro/route?origin=${origin.code}&dest=${dest.code}`);
        else if (origin) router.push(`/metro/station/${origin.code}?agency=metro`);
    });

    return (
        <div className="min-h-dvh pb-[max(6rem,env(safe-area-inset-bottom))]" style={{ background: 'var(--bg)' }}>
            <NetworkHero
                network="metro"
                logoHeight={40}
                actions={
                    <>
                        <HeroAction href="/metro/lines" label="Líneas">
                            <Route className="h-5 w-5" strokeWidth={1.75} />
                        </HeroAction>
                        <HeroAction href="/metro/map" label="Mapa en vivo">
                            <MapIcon className="h-5 w-5" strokeWidth={1.75} />
                        </HeroAction>
                    </>
                }
            >
                {/* El tren oficial tiene la carrocería casi negra: va sobre franja clara para que se vea también en oscuro */}
                <div style={{ background: '#e9e9ee' }}>
                    <div className="mx-auto max-w-2xl pb-3 pt-3">
                        <TrainStrip height={44} />
                    </div>
                </div>
            </NetworkHero>

            <main className="mx-auto max-w-2xl space-y-5 px-4 pt-3">
                <IncidentsBanner
                    service={incidents?.serviceIssues ?? []}
                    installation={incidents?.installationIssues ?? []}
                    flagged={status?.blocked ? [] : flagged}
                />
                {status?.blocked && (
                    <div className="flex gap-2.5 rounded-2xl px-4 py-3 text-sm" style={{ background: 'color-mix(in srgb, var(--warn) 16%, var(--surface))', color: 'var(--ink)' }} role="status">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--warn)' }} aria-hidden />
                        El servicio de Metro Bilbao está en mantenimiento.
                    </div>
                )}

                <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={SPRING} className="bt-card relative z-20 space-y-2 p-2.5">
                    <StationField
                        label="Origen"
                        value={origin}
                        onChange={setOrigin}
                        className="origin-input"
                        action={
                            <button
                                onClick={pickNearest}
                                disabled={locating !== null}
                                aria-label="Usar la estación más cercana a mí"
                                className="bt-press grid h-11 w-11 shrink-0 place-items-center"
                            >
                                <Crosshair className={`h-5 w-5 ${locating !== null ? 'animate-pulse' : ''}`} style={{ color: 'var(--metro)' }} />
                            </button>
                        }
                    />
                    {geoError && locating === null && !origin && (
                        <p className="px-3 text-xs" style={{ color: 'var(--ink-2)' }} role="alert">{geoError}</p>
                    )}
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
                    {origin && dest && <TimeFields mode={mode} onMode={chooseMode} value={win} onChange={setWin} />}
                    <AnimatePresence initial={false}>
                        {origin && (
                            <motion.button
                                key="go"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 52 }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                                onClick={go}
                                disabled={!timeOk || going}
                                className="bt-press flex w-full items-center justify-center gap-2 overflow-hidden rounded-[14px] text-[16px] font-semibold text-white disabled:opacity-40"
                                style={{ background: 'var(--metro)' }}
                            >
                                {going ? <BilboMark size={22} animated tile={false} className="text-white" /> : <Search className="h-4 w-4" aria-hidden />}
                                {dest ? (mode === 'time' ? 'Ver horarios' : 'Ver trayecto') : 'Ver trenes de la parada'}
                            </motion.button>
                        )}
                    </AnimatePresence>
                </motion.section>

                <div className="flex items-center justify-between gap-3">
                    {incidents && !status?.blocked && flagged.length === 0 && incidents.serviceIssues.length + incidents.installationIssues.length === 0 ? (
                        <span className="inline-flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--ink-2)' }}>
                            <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--live)' }} aria-hidden />
                            Servicio normal
                        </span>
                    ) : <span />}
                    <HomeLiveBar codes={liveCodes} hasRoutes={favRoutes.length > 0} />
                </div>

                {favRoutes.length > 0 && (
                    <section className="space-y-3" aria-label="Mis trayectos">
                        <h2 className="px-1 text-[13px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--ink-2)' }}>Mis trayectos</h2>
                        <div className="space-y-3">
                            <AnimatePresence initial={false}>
                                {favRoutes.map((r, i) => <RouteLiveCard key={`${r.from}-${r.to}`} route={r} index={i} />)}
                            </AnimatePresence>
                        </div>
                    </section>
                )}

                <RouteSuggestions items={suggested} />

                {prefs.showFavorites && <section id="favoritos" className="favorites-section scroll-mt-4 space-y-3" aria-label="Favoritos">
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
                </section>}

                {prefs.showNearby && <section className="space-y-3" aria-label="Cerca de ti">
                    <h2 className="px-1 text-[13px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--ink-2)' }}>Cerca de ti</h2>
                    {nearby.length === 0 ? (
                        <button onClick={() => requestLocation()} disabled={geoLoading} className="bt-card bt-press flex min-h-14 w-full items-center gap-3 px-4 text-left">
                            <Crosshair className="h-5 w-5" style={{ color: 'var(--metro)' }} aria-hidden />
                            <span className="min-w-0 flex-1">
                                <span className="block text-[15px] font-medium" style={{ color: 'var(--ink)' }}>
                                    {geoLoading ? 'Buscando tu ubicación…' : 'Usar mi ubicación'}
                                </span>
                                {geoError && <span className="block text-xs" style={{ color: 'var(--ink-2)' }} role="alert">{geoError}</span>}
                            </span>
                            <Navigation className="h-4 w-4" style={{ color: 'var(--ink-2)' }} aria-hidden />
                        </button>
                    ) : (
                        <div className="grid grid-cols-2 gap-3">{nearby.map(({ s, km }) => <LiveStationCard key={s.code} station={s} distanceKm={km} />)}</div>
                    )}
                </section>}

                <button
                    onClick={() => setPrefsOpen(true)}
                    className="bt-press mx-auto flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium"
                    style={{ color: 'var(--ink-2)' }}
                >
                    <SlidersHorizontal className="h-4 w-4" aria-hidden />
                    Personalizar inicio
                </button>
                <LegalFooter network="metro" />
            </main>

            <BottomSheet open={prefsOpen} onClose={() => setPrefsOpen(false)} title="Personalizar inicio">
                <div className="space-y-2">
                    <Toggle
                        label="Cerca de ti"
                        hint="Las 2 estaciones más próximas con trenes en directo."
                        checked={prefs.showNearby}
                        onChange={(v) => {
                            updatePrefs({ showNearby: v });
                            if (v && !location) void requestLocation();
                        }}
                    />
                    <Toggle label="Favoritos" hint="Tus estaciones guardadas en directo." checked={prefs.showFavorites} onChange={(v) => updatePrefs({ showFavorites: v })} />
                    <Toggle
                        label="Recordar última búsqueda"
                        hint="Al abrir la app, origen y destino vuelven a estar rellenos."
                        checked={prefs.rememberSearch}
                        onChange={(v) => updatePrefs({ rememberSearch: v })}
                    />
                </div>
                <p className="mt-3 px-1 text-xs" style={{ color: 'var(--ink-2)' }}>
                    Para rellenar el origen con la estación más cercana, pulsa la brújula del campo Origen. La ubicación solo se pide cuando tú lo pides.
                </p>
            </BottomSheet>
        </div>
    );
}
