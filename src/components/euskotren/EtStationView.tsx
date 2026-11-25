'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { AlertTriangle, ArrowLeft, CalendarClock, ChevronDown, Clock, Heart, MapPin, TrainFront } from 'lucide-react';
import { useFavorites } from '@/context/FavoritesContext';
import { getEtStation } from '@/lib/euskotren/catalog';
import { scopeOfLines } from '@/lib/euskotren/scopes';
import { refreshEuskotrenLive, useEtStation } from '@/lib/euskotren/hooks';
import type { EtArrival, EtStationLive } from '@/lib/euskotren/types';
import { useLastGood, useOnline } from '@/lib/metro/hooks';
import { ErrorState, HeroSkeleton, LiveBadge, Minutes, OfflineBanner, SPRING, StateCard } from '@/components/metro/parts';
import { NetworkBadge } from '@/components/shared/brand';
import { titleCase } from '@/components/shared/bus';
import { DelayTag, EtChip, RefreshNote } from './EtUi';
import { DepartureTimesSheet } from './EtTimes';

/** Agrupa por destino ("hacia Bermeo"), con los destinos más próximos primero. */
function byDestination(arrivals: EtArrival[]) {
    const groups = new Map<string, EtArrival[]>();
    for (const a of arrivals) (groups.get(a.towards) ?? groups.set(a.towards, []).get(a.towards)!).push(a);
    return [...groups.entries()].sort((a, b) => a[1][0].time - b[1][0].time);
}

export function EtStationView({ id }: { id: string }) {
    const router = useRouter();
    const station = getEtStation(id);
    const scope = scopeOfLines(station?.lines ?? []);
    const { data, error, isLoading, isValidating } = useEtStation(station ? id : null);
    const { favorites, addFavorite, removeFavorite } = useFavorites();
    const online = useOnline();
    const [timesLine, setTimesLine] = useState<string | null>(null);
    const saved = useLastGood<EtStationLive>(station ? `/api/euskotren/station/${id}` : null);
    const [lineFilter, setLineFilter] = useState<string | null>(null);
    const [expanded, setExpanded] = useState(false);
    const shown = useMemo(() => (data?.arrivals ?? []).filter((a) => !lineFilter || a.line === lineFilter), [data, lineFilter]);

    if (!station) {
        return (
            <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center" style={{ background: 'var(--bg)' }}>
                <AlertTriangle className="h-8 w-8" style={{ color: 'var(--warn)' }} aria-hidden />
                <p className="font-semibold" style={{ color: 'var(--ink)' }}>Estación no encontrada</p>
                <Link href="/euskotren" className="bt-press rounded-full px-5 py-2.5 text-sm font-semibold text-white" style={{ background: 'var(--accent)' }}>
                    Buscar otra estación
                </Link>
            </main>
        );
    }

    const favEntry = favorites.find((f) => f.agency === 'euskotren' && f.stopId === id);
    const toggleFav = () => {
        if (favEntry) removeFavorite(favEntry.id);
        else addFavorite({ stopId: id, name: station.name, stopName: station.name, agency: 'euskotren', lat: station.lat, lon: station.lon });
    };

    const first = shown[0];
    const VISIBLE = 6;
    const list = expanded ? shown : shown.slice(0, VISIBLE);
    const multiLine = station.lines.length > 1;
    const scheduled = data?.source === 'schedule';

    return (
        <div className={`${scope.theme} min-h-dvh pb-[max(2rem,env(safe-area-inset-bottom))]`} style={{ background: 'var(--bg)' }}>
            <header className="bt-glass sticky top-0 z-20 border-b" style={{ borderColor: 'var(--hairline)' }}>
                <div className="mx-auto flex max-w-2xl items-center gap-2 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
                    <button onClick={() => (window.history.length > 1 ? router.back() : router.push(scope.href))} aria-label="Volver" className="bt-press grid h-11 w-11 place-items-center rounded-full">
                        <ArrowLeft className="h-5 w-5" style={{ color: 'var(--ink)' }} />
                    </button>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-[17px] font-bold tracking-[-0.01em]" style={{ color: 'var(--ink)' }}>{station.name}</p>
                        <p className="truncate text-xs" style={{ color: 'var(--ink-2)' }}>{station.desc || station.lines.join(' · ')}</p>
                    </div>
                    <NetworkBadge network={scope.mark} />
                    <button onClick={toggleFav} aria-label={favEntry ? 'Quitar de favoritos' : 'Añadir a favoritos'} aria-pressed={Boolean(favEntry)} className="bt-press grid h-11 w-11 place-items-center rounded-full">
                        <motion.span key={String(Boolean(favEntry))} initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={SPRING} className="grid place-items-center">
                            <Heart className="h-5 w-5" style={{ color: favEntry ? 'var(--danger)' : 'var(--ink-2)', fill: favEntry ? 'var(--danger)' : 'none' }} />
                        </motion.span>
                    </button>
                </div>
            </header>

            <main className="mx-auto max-w-2xl space-y-3 px-4 pt-4">
                <div className="flex flex-wrap items-center gap-2">
                    <LiveBadge fetchedAt={data?.fetchedAt} stale={Boolean(error)} refreshing={isValidating} onRefresh={() => refreshEuskotrenLive()} />
                    {station.accessible && <span className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}>Accesible</span>}
                </div>

                {scheduled && (
                    <div className="flex gap-2.5 rounded-2xl px-4 py-3 text-sm" style={{ background: 'color-mix(in srgb, var(--warn) 16%, var(--surface))', color: 'var(--ink)' }} role="status">
                        <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--warn)' }} aria-hidden />
                        <p>Euskotren no da tiempo real para esta estación ahora. Estas son las próximas salidas del <strong>horario programado</strong>.</p>
                    </div>
                )}

                {multiLine && data && data.arrivals.length > 0 && (
                    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Filtrar por línea">
                        {[null, ...station.lines.filter((l) => data.arrivals.some((a) => a.line === l))].map((l) => (
                            <button
                                key={l ?? 'all'}
                                type="button"
                                onClick={() => {
                                    setLineFilter(l);
                                    setExpanded(false);
                                }}
                                aria-pressed={lineFilter === l}
                                className="bt-press inline-flex min-h-10 shrink-0 items-center rounded-full px-3.5 text-sm font-semibold"
                                style={{ background: lineFilter === l ? 'var(--accent)' : 'var(--surface-2)', color: lineFilter === l ? '#fff' : 'var(--ink)' }}
                            >
                                {l ? <EtChip line={l} size="sm" /> : 'Todas'}
                            </button>
                        ))}
                    </div>
                )}

                {isLoading && !data ? (
                    <HeroSkeleton />
                ) : error && !data ? (
                    <>
                        <OfflineBanner offline={!online} lastAt={saved?.at} />
                        {saved ? (
                            <div className="bt-card p-2" aria-label="Último dato guardado">
                                {byDestination(saved.data.arrivals).map(([towards, list]) => (
                                    <div key={towards} className="flex items-center gap-3 px-3.5 py-2.5">
                                        <EtChip line={list[0].line} />
                                        <p className="min-w-0 flex-1 truncate text-[15px] font-semibold" style={{ color: 'var(--ink)' }}>{titleCase(towards)}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <ErrorState offline={!online} onRetry={() => refreshEuskotrenLive()} retrying={isValidating} service="Euskotren" live="los trenes" />
                        )}
                    </>
                ) : first ? (
                    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={SPRING} className="space-y-3" aria-label="Próximos trenes">
                        {!online && <OfflineBanner offline />}
                        <div className="bt-card p-5">
                            <p className="text-[13px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--ink-2)' }}>{scheduled ? 'Próxima salida programada' : 'Próximo tren'}</p>
                            <div className="mt-3 flex items-end justify-between gap-4">
                                <div className="min-w-0 flex-1 pb-1">
                                    <div className="flex flex-col items-start gap-2">
                                        <div className="flex items-center gap-2">
                                            <EtChip line={first.line} size="lg" />
                                            <DelayTag delay={first.delay} />
                                        </div>
                                        <p className="line-clamp-2 min-w-0 text-[22px] font-bold leading-6 tracking-[-0.02em]" style={{ color: 'var(--ink)' }}>{titleCase(first.towards)}</p>
                                    </div>
                                </div>
                                <Minutes value={first.minutes} huge />
                            </div>
                            <button type="button" onClick={() => setTimesLine(first.line)} className="bt-press mt-4 inline-flex min-h-10 items-center gap-2 rounded-full px-3.5 text-sm font-semibold" style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}>
                                <Clock className="h-4 w-4" strokeWidth={1.75} aria-hidden /> Horario de la {first.line}
                            </button>
                        </div>

                        {shown.length > 1 && (
                            <section className="bt-card p-1.5" aria-label="Siguientes salidas">
                                <h2 className="px-3.5 pb-1 pt-2.5 text-[13px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--ink-2)' }}>Siguientes</h2>
                                {list.slice(1).map((a, i) => (
                                    <div key={`${a.line}${a.time}${i}`} className="flex items-center gap-3 px-3.5 py-2.5">
                                        <EtChip line={a.line} />
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-[15px] font-semibold" style={{ color: 'var(--ink)' }}>{titleCase(a.towards)}</span>
                                            <span className="bt-num block text-xs" style={{ color: 'var(--ink-2)' }}>
                                                {new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit' }).format(new Date(a.time * 1000))}
                                            </span>
                                        </span>
                                        <DelayTag delay={a.delay} />
                                        <Minutes value={a.minutes} compact />
                                    </div>
                                ))}
                                {shown.length > VISIBLE && (
                                    <button type="button" onClick={() => setExpanded((v) => !v)} className="bt-press flex min-h-11 w-full items-center justify-center gap-1.5 text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>
                                        {expanded ? 'Ver menos' : `Ver ${shown.length - VISIBLE} más`}
                                        <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden />
                                    </button>
                                )}
                            </section>
                        )}
                    </motion.section>
                ) : (
                    <StateCard
                        icon={<TrainFront className="h-6 w-6" style={{ color: 'var(--ink-2)' }} />}
                        title="Sin trenes ahora"
                        message={lineFilter ? `No hay salidas próximas de la ${lineFilter}. Prueba con otra línea o mira su horario.` : 'No hay salidas próximas de esta estación. Puede ser fuera de horario: mira el horario de sus líneas.'}
                    />
                )}

                {multiLine && (
                <section className="bt-card p-4" aria-label="Horarios por línea">
                    <h2 className="mb-2.5 text-[13px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--ink-2)' }}>Horarios</h2>
                    <ul className="flex flex-wrap gap-2">
                        {station.lines.map((l) => (
                            <li key={l}>
                                <button type="button" onClick={() => setTimesLine(l)} className="bt-press inline-flex min-h-10 items-center gap-2 rounded-full px-3" style={{ background: 'var(--surface-2)' }}>
                                    <EtChip line={l} size="sm" /> <Clock className="h-4 w-4" style={{ color: 'var(--ink-2)' }} aria-hidden />
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
                )}

                <a href={`https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lon}&travelmode=walking`} target="_blank" rel="noopener noreferrer" className="bt-card bt-press flex min-h-12 items-center gap-3 px-4 py-3 text-[15px] font-semibold" style={{ color: 'var(--ink)' }}>
                    <MapPin className="h-4 w-4" style={{ color: 'var(--accent)' }} aria-hidden />
                    Cómo llegar a pie
                </a>

                <RefreshNote />
                <p className="px-1 text-center text-xs" style={{ color: 'var(--ink-2)' }}>Datos: Euskotren / Open Data Euskadi</p>
            </main>
            <DepartureTimesSheet open={timesLine !== null} onClose={() => setTimesLine(null)} station={id} line={timesLine} stationName={station.name} />
        </div>
    );
}
