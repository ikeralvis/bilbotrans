'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { AlertTriangle, ArrowLeft, Bus, Heart, MapPin } from 'lucide-react';
import { useFavorites } from '@/context/FavoritesContext';
import { getStop } from '@/lib/bizkaibus/catalog';
import { alertsForLines, refreshBizkaibusLive, useBizkaibusAlerts, useBizkaibusStop } from '@/lib/bizkaibus/hooks';
import { useLastGood, useOnline } from '@/lib/metro/hooks';
import type { StopArrivals } from '@/lib/bizkaibus/types';
import { ErrorState, HeroSkeleton, LiveBadge, OfflineBanner, SPRING, StateCard } from '@/components/metro/parts';
import { AccessibleBadge, AlertsBanner, ArrivalHero, ArrivalRow, BusChip, titleCase } from './ui';
import { NetworkBadge } from '@/components/shared/brand';

export function BizkaibusStopView({ code }: { code: string }) {
    const router = useRouter();
    const stop = getStop(code);
    const { data, error, isLoading, isValidating } = useBizkaibusStop(stop ? code : null);
    const { data: alertData } = useBizkaibusAlerts();
    const { favorites, addFavorite, removeFavorite } = useFavorites();
    const online = useOnline();
    const saved = useLastGood<StopArrivals>(stop ? `/api/bizkaibus/stop/${code}` : null);

    if (!stop) {
        return (
            <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center" style={{ background: 'var(--bg)' }}>
                <AlertTriangle className="h-8 w-8" style={{ color: 'var(--warn)' }} aria-hidden />
                <p className="font-semibold" style={{ color: 'var(--ink)' }}>Parada no encontrada</p>
                <Link href="/bizkaibus" className="bt-press rounded-full px-5 py-2.5 text-sm font-semibold text-white" style={{ background: 'var(--accent)' }}>
                    Buscar otra parada
                </Link>
            </main>
        );
    }

    const favEntry = favorites.find((f) => f.agency === 'bizkaibus' && f.stopId === code);
    const toggleFav = () => {
        if (favEntry) removeFavorite(favEntry.id);
        else addFavorite({ stopId: code, name: stop.name, stopName: stop.name, agency: 'bizkaibus', lat: stop.lat, lon: stop.lon });
    };

    const arrivals = data?.arrivals ?? [];
    const [first, ...rest] = arrivals;
    const alreadyListed = new Set(arrivals.map((a) => a.line));
    const otherLines = stop.lines.filter((l) => !alreadyListed.has(l));
    const alerts = alertsForLines(alertData?.alerts, stop.lines);

    return (
        <div className="min-h-dvh pb-[max(2rem,env(safe-area-inset-bottom))]" style={{ background: 'var(--bg)' }}>
            <header className="bt-glass sticky top-0 z-20 border-b" style={{ borderColor: 'var(--hairline)' }}>
                <div className="mx-auto flex max-w-2xl items-center gap-2 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
                    <button onClick={() => (window.history.length > 1 ? router.back() : router.push('/bizkaibus'))} aria-label="Volver" className="bt-press grid h-11 w-11 place-items-center rounded-full">
                        <ArrowLeft className="h-5 w-5" style={{ color: 'var(--ink)' }} />
                    </button>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-[17px] font-bold tracking-[-0.01em]" style={{ color: 'var(--ink)' }}>{stop.name}</p>
                        <p className="truncate text-xs" style={{ color: 'var(--ink-2)' }}>{titleCase(stop.municipality)} · parada {code}</p>
                    </div>
                    <NetworkBadge network="bizkaibus" />
                    <button onClick={toggleFav} aria-label={favEntry ? 'Quitar de favoritos' : 'Añadir a favoritos'} aria-pressed={Boolean(favEntry)} className="bt-press grid h-11 w-11 place-items-center rounded-full">
                        <motion.span key={String(Boolean(favEntry))} initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={SPRING} className="grid place-items-center">
                            <Heart className="h-5 w-5" style={{ color: favEntry ? 'var(--danger)' : 'var(--ink-2)', fill: favEntry ? 'var(--danger)' : 'none' }} />
                        </motion.span>
                    </button>
                </div>
            </header>

            <main className="mx-auto max-w-2xl space-y-3 px-4 pt-4">
                <div className="flex flex-wrap items-center gap-2">
                    <LiveBadge fetchedAt={data?.fetchedAt} stale={Boolean(error)} refreshing={isValidating} onRefresh={() => refreshBizkaibusLive()} />
                    <AccessibleBadge code={data?.accessibility ?? ''} />
                </div>

                <AlertsBanner alerts={alerts} />

                {isLoading && !data ? (
                    <HeroSkeleton />
                ) : error && !data ? (
                    <>
                        <OfflineBanner offline={!online} lastAt={saved?.at} />
                        {saved ? (
                            <div className="bt-card p-2" aria-label="Último dato guardado">
                                {saved.data.arrivals.map((a) => (
                                    <div key={a.line} className="flex items-center gap-3 px-3.5 py-2.5">
                                        <BusChip line={a.line} />
                                        <p className="min-w-0 flex-1 truncate text-[15px] font-semibold" style={{ color: 'var(--ink)' }}>{titleCase(a.route)}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <ErrorState offline={!online} onRetry={() => refreshBizkaibusLive()} retrying={isValidating} service="Bizkaibus" live="los autobuses" />
                        )}
                    </>
                ) : first ? (
                    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={SPRING} className="space-y-3" aria-label="Próximos autobuses">
                        {!online && <OfflineBanner offline />}
                        <ArrivalHero arrival={first} label="Próximo autobús" />
                        {rest.length > 0 && (
                            <div className="bt-card p-1.5">
                                <h2 className="px-3.5 pb-1 pt-2.5 text-[13px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--ink-2)' }}>Otras líneas</h2>
                                {rest.map((a) => <ArrivalRow key={a.line} arrival={a} />)}
                            </div>
                        )}
                    </motion.section>
                ) : (
                    <StateCard
                        icon={<Bus className="h-6 w-6" style={{ color: 'var(--ink-2)' }} />}
                        title="Sin autobuses previstos"
                        message="Ahora no hay buses en camino a esta parada. Mira los horarios de sus líneas."
                    />
                )}

                {otherLines.length > 0 && (
                    <section className="bt-card p-4" aria-label="Líneas que paran aquí">
                        <h2 className="mb-2.5 text-[13px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--ink-2)' }}>
                            {arrivals.length > 0 ? 'También paran aquí' : 'Líneas que paran aquí'}
                        </h2>
                        <ul className="flex flex-wrap gap-2">
                            {otherLines.map((l) => (
                                <li key={l}>
                                    <Link href={`/bizkaibus/lines/${l}`} className="bt-press inline-flex min-h-9 items-center">
                                        <BusChip line={l} size="lg" />
                                    </Link>
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

                <p className="px-1 pt-1 text-center text-xs" style={{ color: 'var(--ink-2)' }}>Datos oficiales de Bizkaibus · Diputación Foral de Bizkaia</p>
            </main>
        </div>
    );
}
