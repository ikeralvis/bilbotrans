'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, useScroll, useTransform } from 'motion/react';
import { AlertTriangle, ArrowLeft, DoorOpen, FileText, Heart, MapPin, Accessibility, Landmark } from 'lucide-react';
import { useFavorites } from '@/context/FavoritesContext';
import { getStation } from '@/lib/metro/catalog';
import { refreshMetroLive, useMetroIncidents, useMetroStation, useMetroStatus } from '@/lib/metro/hooks';
import { sidesServed } from '@/lib/metro/direction';
import { IncidentsBanner } from './IncidentsSheet';
import { Disclosure, DirectionSection, ExitBadges, GroupSkeleton, LineChip, LiveBadge, SPRING } from './parts';

export function MetroStationView({ code }: { code: string }) {
    const router = useRouter();
    const station = getStation(code);
    const { data, error, isLoading, isValidating } = useMetroStation(station ? station.code : null);
    const { data: status } = useMetroStatus();
    const { data: incidents } = useMetroIncidents();
    const { favorites, addFavorite, removeFavorite } = useFavorites();
    const { scrollY } = useScroll();
    const heroY = useTransform(scrollY, [0, 240], [0, 24]);

    if (!station) {
        return (
            <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center" style={{ background: 'var(--bg)' }}>
                <AlertTriangle className="h-8 w-8" style={{ color: 'var(--warn)' }} aria-hidden />
                <p className="font-semibold" style={{ color: 'var(--ink)' }}>Estación no encontrada</p>
                <Link href="/" className="bt-press rounded-full px-5 py-2.5 text-sm font-semibold text-white" style={{ background: 'var(--metro)' }}>
                    Volver al inicio
                </Link>
            </main>
        );
    }

    const favEntry = favorites.find((f) => f.agency === 'metro' && f.stopId.replace(/[12]$/, '').toUpperCase() === station.code);
    const fav = Boolean(favEntry);
    const served = sidesServed(station.code);
    const groups = (data?.groups ?? []).filter((g) => served.includes(g.side) || g.trains.length > 0);
    const stale = Boolean(error);
    const pois = station.pois.filter((p) => p.name.trim());

    const toggleFav = () => {
        if (favEntry) removeFavorite(favEntry.id);
        else addFavorite({ stopId: station.code, name: station.name, agency: 'metro', lat: station.lat ?? undefined, lon: station.lon ?? undefined });
    };

    return (
        <div className="min-h-dvh pb-[max(2rem,env(safe-area-inset-bottom))]" style={{ background: 'var(--bg)' }}>
            {/* Hero */}
            <div className="relative h-[280px] w-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                <motion.div style={{ y: heroY }} className="absolute inset-0 -top-6">
                    <Image
                        src={station.img}
                        alt={`Estación de ${station.name}`}
                        fill
                        priority
                        sizes="(max-width: 768px) 100vw, 768px"
                        className="object-cover"
                    />
                </motion.div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/25" />

                <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))]">
                    <button
                        onClick={() => (window.history.length > 1 ? router.back() : router.push('/'))}
                        aria-label="Volver"
                        className="bt-press bt-glass grid h-11 w-11 place-items-center rounded-full"
                    >
                        <ArrowLeft className="h-5 w-5" style={{ color: 'var(--ink)' }} />
                    </button>
                    <button
                        onClick={toggleFav}
                        aria-label={fav ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                        aria-pressed={fav}
                        className="bt-press bt-glass grid h-11 w-11 place-items-center rounded-full"
                    >
                        <motion.span key={String(fav)} initial={{ scale: 0.7 }} animate={{ scale: 1 }} transition={SPRING}>
                            <Heart className="h-5 w-5" style={{ color: fav ? 'var(--danger)' : 'var(--ink)', fill: fav ? 'var(--danger)' : 'none' }} />
                        </motion.span>
                    </button>
                </div>

                <div className="absolute inset-x-0 bottom-0 px-4 pb-5 text-white">
                    <div className="mb-2 flex items-center gap-1.5">
                        {station.lines.map((l) => (
                            <LineChip key={l} line={l} />
                        ))}
                        {station.zone && (
                            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold backdrop-blur">{station.zone}</span>
                        )}
                    </div>
                    <h1 className="text-[32px] font-bold leading-9 tracking-[-0.02em]">{station.name}</h1>
                </div>
            </div>

            <main className="mx-auto -mt-3 max-w-2xl space-y-3 px-4">
                <div className="flex items-center justify-between pt-1">
                    <LiveBadge fetchedAt={data?.fetchedAt} stale={stale} refreshing={isValidating} onRefresh={() => refreshMetroLive()} />
                    {station.map && (
                        <a
                            href={station.map}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bt-press inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold"
                            style={{ color: 'var(--metro)' }}
                        >
                            <FileText className="h-4 w-4" aria-hidden />
                            Plano
                        </a>
                    )}
                </div>

                {status?.blocked && (
                    <div className="flex gap-2.5 rounded-2xl px-4 py-3 text-sm" style={{ background: 'color-mix(in srgb, var(--warn) 16%, var(--surface))', color: 'var(--ink)' }} role="status">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--warn)' }} aria-hidden />
                        <p>El servicio de Metro Bilbao está en mantenimiento.</p>
                    </div>
                )}

                <IncidentsBanner
                    service={[]}
                    installation={(incidents?.installationIssues ?? []).filter((i) => i.station.code === station.code)}
                />

                {isLoading && !data ? (
                    <>
                        <GroupSkeleton />
                        <GroupSkeleton />
                    </>
                ) : error && !data ? (
                    <div className="bt-card px-4 py-8 text-center">
                        <p className="font-semibold" style={{ color: 'var(--ink)' }}>No se pudo cargar el tiempo real</p>
                        <p className="mt-1 text-sm" style={{ color: 'var(--ink-2)' }}>Reintentando automáticamente…</p>
                    </div>
                ) : (
                    groups.map((g, i) => <DirectionSection key={g.side} group={g} index={i} />)
                )}

                <Disclosure title="Salidas" icon={<DoorOpen className="h-4 w-4" style={{ color: 'var(--ink-2)' }} aria-hidden />} defaultOpen>
                    <ul className="space-y-2">
                        {station.exits.map((e) => (
                            <li key={e.id} className="flex items-center gap-3">
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[15px] font-medium" style={{ color: 'var(--ink)' }}>{e.name}</p>
                                    {e.address && <p className="truncate text-xs" style={{ color: 'var(--ink-2)' }}>{e.address}</p>}
                                </div>
                                <ExitBadges elevator={e.elevator} nocturnal={e.nocturnal} accessible={e.accessible} />
                            </li>
                        ))}
                    </ul>
                </Disclosure>

                {pois.length > 0 && (
                    <Disclosure title="Cerca de la estación" icon={<Landmark className="h-4 w-4" style={{ color: 'var(--ink-2)' }} aria-hidden />}>
                        <ul className="space-y-2">
                            {pois.map((p, i) => (
                                <li key={i} className="flex items-baseline justify-between gap-3 text-sm">
                                    <span style={{ color: 'var(--ink)' }}>{p.name}</span>
                                    <span className="shrink-0 text-xs" style={{ color: 'var(--ink-2)' }}>
                                        {p.exit}{p.distance ? ` · ${p.distance}` : ''}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </Disclosure>
                )}

                {station.accessibility.es && (
                    <Disclosure title="Accesibilidad" icon={<Accessibility className="h-4 w-4" style={{ color: 'var(--ink-2)' }} aria-hidden />}>
                        <p className="whitespace-pre-line text-sm leading-6" style={{ color: 'var(--ink-2)' }}>{station.accessibility.es}</p>
                    </Disclosure>
                )}

                {station.lat && station.lon && (
                    <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lon}&travelmode=walking`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bt-card bt-press flex min-h-12 items-center gap-3 px-4 py-3 text-[15px] font-semibold"
                        style={{ color: 'var(--ink)' }}
                    >
                        <MapPin className="h-4 w-4" style={{ color: 'var(--metro)' }} aria-hidden />
                        Cómo llegar a pie
                    </a>
                )}
            </main>
        </div>
    );
}
