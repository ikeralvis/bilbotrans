'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { useState } from 'react';
import { AlertTriangle, ArrowLeft, Bus, Clock, Heart, MapPin } from 'lucide-react';
import { useFavorites } from '@/context/FavoritesContext';
import { getBbStop } from '@/lib/bilbobus/catalog';
import { refreshBilbobusLive, useBbStop } from '@/lib/bilbobus/hooks';
import { useLastGood, useOnline } from '@/lib/metro/hooks';
import type { BbStopWaiting } from '@/lib/bilbobus/types';
import { ErrorState, HeroSkeleton, LiveBadge, Minutes, OfflineBanner, SPRING, StateCard } from '@/components/metro/parts';
import { BbChip, RefreshNote, Wait, titleCase } from './BbUi';
import { NetworkBadge } from '@/components/shared/brand';
import { PassTimesSheet } from './BbTimes';

export function BbStopView({ code }: { code: string }) {
    const router = useRouter();
    const stop = getBbStop(code);
    const { data, error, isLoading, isValidating } = useBbStop(stop ? code : null);
    const { favorites, addFavorite, removeFavorite } = useFavorites();
    const online = useOnline();
    const [timesLine, setTimesLine] = useState<string | null>(null);
    const saved = useLastGood<BbStopWaiting>(stop ? `/api/bilbobus/stop/${code}` : null);

    if (!stop) {
        return (
            <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center" style={{ background: 'var(--bg)' }}>
                <AlertTriangle className="h-8 w-8" style={{ color: 'var(--warn)' }} aria-hidden />
                <p className="font-semibold" style={{ color: 'var(--ink)' }}>Parada no encontrada</p>
                <Link href="/bilbobus" className="bt-press rounded-full px-5 py-2.5 text-sm font-semibold text-white" style={{ background: 'var(--accent)' }}>
                    Buscar otra parada
                </Link>
            </main>
        );
    }

    const favEntry = favorites.find((f) => f.agency === 'bilbobus' && f.stopId === code);
    const toggleFav = () => {
        if (favEntry) removeFavorite(favEntry.id);
        else addFavorite({ stopId: code, name: stop.name, stopName: stop.name, agency: 'bilbobus', lat: stop.lat, lon: stop.lon });
    };

    const arrivals = data?.arrivals ?? [];
    const withTime = arrivals.filter((a) => a.minutes !== null);
    const noInfo = arrivals.filter((a) => a.minutes === null);
    const [first, ...rest] = withTime;

    return (
        <div className="min-h-dvh pb-[max(2rem,env(safe-area-inset-bottom))]" style={{ background: 'var(--bg)' }}>
            <header className="bt-glass sticky top-0 z-20 border-b" style={{ borderColor: 'var(--hairline)' }}>
                <div className="mx-auto flex max-w-2xl items-center gap-2 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
                    <button onClick={() => (window.history.length > 1 ? router.back() : router.push('/bilbobus'))} aria-label="Volver" className="bt-press grid h-11 w-11 place-items-center rounded-full">
                        <ArrowLeft className="h-5 w-5" style={{ color: 'var(--ink)' }} />
                    </button>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-[17px] font-bold tracking-[-0.01em]" style={{ color: 'var(--ink)' }}>{titleCase(stop.name)}</p>
                        <p className="truncate text-xs" style={{ color: 'var(--ink-2)' }}>Parada {code}</p>
                    </div>
                    <NetworkBadge network="bilbobus" />
                    <button onClick={toggleFav} aria-label={favEntry ? 'Quitar de favoritos' : 'Añadir a favoritos'} aria-pressed={Boolean(favEntry)} className="bt-press grid h-11 w-11 place-items-center rounded-full">
                        <motion.span key={String(Boolean(favEntry))} initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={SPRING} className="grid place-items-center">
                            <Heart className="h-5 w-5" style={{ color: favEntry ? 'var(--danger)' : 'var(--ink-2)', fill: favEntry ? 'var(--danger)' : 'none' }} />
                        </motion.span>
                    </button>
                </div>
            </header>

            <main className="mx-auto max-w-2xl space-y-3 px-4 pt-4">
                <div className="flex flex-wrap items-center gap-2">
                    <LiveBadge fetchedAt={data?.fetchedAt} stale={Boolean(error)} refreshing={isValidating} onRefresh={() => refreshBilbobusLive()} />
                    {stop.accessible && (
                        <span className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}>Accesible</span>
                    )}
                </div>

                {data && data.unavailable.length > 0 && (
                    <div className="flex gap-2.5 rounded-2xl px-4 py-3 text-sm" style={{ background: 'color-mix(in srgb, var(--warn) 16%, var(--surface))', color: 'var(--ink)' }} role="status">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--warn)' }} aria-hidden />
                        <p>No se pudo consultar {data.unavailable.length === 1 ? 'la línea' : 'las líneas'} {data.unavailable.join(', ')}. Los demás tiempos sí son válidos.</p>
                    </div>
                )}

                {isLoading && !data ? (
                    <HeroSkeleton />
                ) : error && !data ? (
                    <>
                        <OfflineBanner offline={!online} lastAt={saved?.at} />
                        {saved ? (
                            <div className="bt-card p-2" aria-label="Último dato guardado">
                                {saved.data.arrivals.map((a) => (
                                    <div key={a.line} className="flex items-center gap-3 px-3.5 py-2.5">
                                        <BbChip line={a.line} />
                                        <p className="min-w-0 flex-1 truncate text-[15px] font-semibold" style={{ color: 'var(--ink)' }}>{titleCase(a.towards)}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <ErrorState offline={!online} onRetry={() => refreshBilbobusLive()} retrying={isValidating} service="Bilbobus" live="los autobuses" />
                        )}
                    </>
                ) : first ? (
                    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={SPRING} className="space-y-3" aria-label="Próximos autobuses">
                        {!online && <OfflineBanner offline />}
                        <div className="bt-card p-5">
                            <p className="text-[13px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--ink-2)' }}>Próximo autobús</p>
                            <div className="mt-3 flex items-end justify-between gap-4">
                                <div className="min-w-0 flex-1 pb-1">
                                    <div className="flex flex-col items-start gap-2">
                                        <BbChip line={first.line} size="lg" />
                                        <p className="line-clamp-2 min-w-0 text-[22px] font-bold leading-6 tracking-[-0.02em]" style={{ color: 'var(--ink)' }}>{titleCase(first.towards)}</p>
                                    </div>
                                    <p className="mt-1.5 text-sm" style={{ color: 'var(--ink-2)' }}>
                                        {rest[0] ? `Después: línea ${rest[0].line} en ${rest[0].minutes} min` : 'Es el único bus con tiempo ahora'}
                                    </p>
                                </div>
                                <Minutes value={first.minutes ?? 0} huge />
                            </div>
                            <button
                                type="button"
                                onClick={() => setTimesLine(first.line)}
                                className="bt-press mt-4 inline-flex min-h-10 items-center gap-2 rounded-full px-3.5 text-sm font-semibold"
                                style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}
                            >
                                <Clock className="h-4 w-4" strokeWidth={1.75} aria-hidden /> Horario de la {first.line}
                            </button>
                        </div>
                        {rest.length > 0 && (
                            <div className="bt-card p-1.5">
                                <h2 className="px-3.5 pb-1 pt-2.5 text-[13px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--ink-2)' }}>Otras líneas</h2>
                                {rest.map((a) => (
                                    <div key={a.line} className="flex items-center">
                                        <Link href={`/bilbobus/lines/${a.line}`} className="bt-press flex min-w-0 flex-1 items-center gap-3 py-2.5 pl-3.5 pr-2">
                                            <BbChip line={a.line} />
                                            <p className="min-w-0 flex-1 truncate text-[15px] font-semibold" style={{ color: 'var(--ink)' }}>{titleCase(a.towards)}</p>
                                            <Wait minutes={a.minutes} />
                                        </Link>
                                        <button type="button" onClick={() => setTimesLine(a.line)} aria-label={`Horario de la línea ${a.line}`} className="bt-press mr-1 grid h-11 w-11 shrink-0 place-items-center rounded-full">
                                            <Clock className="h-[18px] w-[18px]" strokeWidth={1.5} style={{ color: 'var(--ink-2)' }} aria-hidden />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.section>
                ) : (
                    <StateCard
                        icon={<Bus className="h-6 w-6" style={{ color: 'var(--ink-2)' }} />}
                        title="Sin tiempos de espera ahora"
                        message="El servicio de Bilbobus no da tiempo para las líneas de esta parada. Puede ser fuera de horario: mira sus líneas."
                    />
                )}

                {noInfo.length > 0 && (
                    <section className="bt-card p-4" aria-label="Líneas sin información">
                        <h2 className="mb-2.5 text-[13px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--ink-2)' }}>Sin información</h2>
                        <ul className="flex flex-wrap gap-2">
                            {noInfo.map((a) => (
                                <li key={a.line}>
                                    <Link href={`/bilbobus/lines/${a.line}`} className="bt-press inline-flex min-h-9 items-center"><BbChip line={a.line} size="lg" /></Link>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {data && data.inactive.length > 0 && (
                    <section className="bt-card p-4" aria-label="Líneas fuera de servicio">
                        <h2 className="mb-2.5 text-[13px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--ink-2)' }}>Fuera de servicio ahora</h2>
                        <ul className="flex flex-wrap gap-2">
                            {data.inactive.map((l) => (
                                <li key={l}>
                                    <Link href={`/bilbobus/lines/${l}`} className="bt-press inline-flex min-h-9 items-center opacity-60"><BbChip line={l} size="lg" /></Link>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${stop.lat},${stop.lon}&travelmode=walking`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bt-card bt-press flex min-h-12 items-center gap-3 px-4 py-3 text-[15px] font-semibold"
                    style={{ color: 'var(--ink)' }}
                >
                    <MapPin className="h-4 w-4" style={{ color: 'var(--accent)' }} aria-hidden />
                    Cómo llegar a pie
                </a>

                <RefreshNote />
                <p className="px-1 text-center text-xs" style={{ color: 'var(--ink-2)' }}>Datos: Ayuntamiento de Bilbao / Bilbobus</p>
            </main>
            <PassTimesSheet open={timesLine !== null} onClose={() => setTimesLine(null)} stop={code} line={timesLine} stopName={stop.name} />
        </div>
    );
}
