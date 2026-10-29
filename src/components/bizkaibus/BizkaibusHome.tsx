'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { Crosshair, ListOrdered, Navigation, Route as RouteIcon } from 'lucide-react';
import { useFavorites } from '@/context/FavoritesContext';
import { useGeolocation } from '@/context/GeolocationContext';
import { getStop, nearestStops } from '@/lib/bizkaibus/catalog';
import { alertsForLines, refreshBizkaibusLive, useBizkaibusAlerts, useBizkaibusStop } from '@/lib/bizkaibus/hooks';
import type { CatalogStop } from '@/lib/bizkaibus/types';
import { Minutes, SPRING } from '@/components/metro/parts';
import { BusStrip, NetworkHero } from '@/components/shared/brand';
import { LegalFooter } from '@/components/shared/Legal';
import { AlertsBanner, BusChip, StopLink, StopPicker, titleCase } from './ui';

/** Tarjeta de parada con los dos próximos buses en directo. */
function LiveStopCard({ stop, meters }: { stop: CatalogStop; meters?: number }) {
    const { data, error } = useBizkaibusStop(stop.code);
    const next = (data?.arrivals ?? []).slice(0, 2);
    return (
        <StopLink stop={stop} meters={meters}>
            <div className="mt-2.5 space-y-1.5" aria-live="off">
                {!data && !error ? (
                    <>
                        <div className="bt-skeleton h-6" aria-hidden />
                        <div className="bt-skeleton h-6" aria-hidden />
                    </>
                ) : error && !data ? (
                    <p className="text-xs" style={{ color: 'var(--ink-2)' }}>Sin datos ahora</p>
                ) : next.length === 0 ? (
                    <p className="text-xs" style={{ color: 'var(--ink-2)' }}>Sin autobuses previstos</p>
                ) : (
                    next.map((a) => (
                        <div key={a.line} className="flex items-center gap-2">
                            <BusChip line={a.line} size="sm" />
                            <span className="min-w-0 flex-1 truncate text-[13px] font-medium" style={{ color: 'var(--ink)' }}>{titleCase(a.route)}</span>
                            <Minutes value={a.next?.minutes ?? 0} compact />
                        </div>
                    ))
                )}
            </div>
        </StopLink>
    );
}

const MAX_FAVORITES = 6;

export default function BizkaibusHome() {
    const router = useRouter();
    const { favorites } = useFavorites();
    const { location, requestLocation, isLoading: locating, error: geoError } = useGeolocation();
    const { data: alertData } = useBizkaibusAlerts();

    const favStops = useMemo(() => {
        const seen = new Set<string>();
        return favorites
            .filter((f) => f.agency === 'bizkaibus')
            .map((f) => getStop(f.stopId))
            .filter((s): s is CatalogStop => Boolean(s) && !seen.has(s!.code) && Boolean(seen.add(s!.code)));
    }, [favorites]);

    /* Solo los avisos de las líneas de tus favoritas: los 50 y pico de la red serían ruido. */
    const myAlerts = useMemo(() => alertsForLines(alertData?.alerts, favStops.flatMap((s) => s.lines)), [alertData, favStops]);

    const nearby = useMemo(() => (location ? nearestStops(location.lat, location.lon, 3) : []), [location]);

    return (
        <div className="min-h-dvh pb-[max(6rem,env(safe-area-inset-bottom))]" style={{ background: 'var(--bg)' }}>
            <NetworkHero network="bizkaibus" logoHeight={44}>
                <BusStrip color="#3a8a63" height={44} background="var(--strip)" />
            </NetworkHero>

            <main className="mx-auto mt-4 max-w-2xl space-y-5 px-4">
                <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={SPRING} className="bt-card relative z-20 space-y-2.5 p-2.5" aria-label="Buscar parada">
                    <StopPicker value={null} onChange={(s) => s && router.push(`/bizkaibus/stop/${s.code}`)} placeholder="Busca tu parada: nombre o código" />
                    <div className="grid grid-cols-2 gap-2.5">
                        <Link href="/bizkaibus/route" className="bt-press flex min-h-12 items-center justify-center gap-2 rounded-[14px] text-[15px] font-semibold text-white" style={{ background: 'var(--accent)' }}>
                            <RouteIcon className="h-4 w-4" aria-hidden /> ¿Qué bus cojo?
                        </Link>
                        <Link href="/bizkaibus/lines" className="bt-press flex min-h-12 items-center justify-center gap-2 rounded-[14px] text-[15px] font-semibold" style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}>
                            <ListOrdered className="h-4 w-4" aria-hidden /> Líneas
                        </Link>
                    </div>
                </motion.section>

                <AlertsBanner alerts={myAlerts} title="Avisos de tus paradas" />

                <section className="space-y-3" aria-label="Favoritos">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--ink-2)' }}>Favoritos</h2>
                        {favStops.length > 0 && (
                            <button onClick={() => refreshBizkaibusLive()} className="bt-press min-h-9 rounded-full px-3 text-xs font-semibold" style={{ color: 'var(--ink-2)' }}>
                                Actualizar
                            </button>
                        )}
                    </div>
                    {favStops.length === 0 ? (
                        <div className="bt-card px-4 py-6 text-center">
                            <p className="text-[15px] font-medium" style={{ color: 'var(--ink)' }}>Aún no tienes paradas favoritas</p>
                            <p className="mt-1 text-sm" style={{ color: 'var(--ink-2)' }}>Abre una parada y pulsa el corazón para verla aquí en directo.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <AnimatePresence initial={false}>
                                {favStops.slice(0, MAX_FAVORITES).map((s) => <LiveStopCard key={s.code} stop={s} />)}
                            </AnimatePresence>
                        </div>
                    )}
                </section>

                <section className="space-y-3" aria-label="Cerca de ti">
                    <h2 className="px-1 text-[13px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--ink-2)' }}>Cerca de ti</h2>
                    {nearby.length === 0 ? (
                        <button onClick={() => requestLocation()} disabled={locating} className="bt-card bt-press flex min-h-14 w-full items-center gap-3 px-4 text-left">
                            <Crosshair className="h-5 w-5" style={{ color: 'var(--accent)' }} aria-hidden />
                            <span className="min-w-0 flex-1">
                                <span className="block text-[15px] font-medium" style={{ color: 'var(--ink)' }}>{locating ? 'Buscando tu ubicación…' : 'Ver paradas cerca de mí'}</span>
                                {geoError ? (
                                    <span className="block text-xs" style={{ color: 'var(--ink-2)' }} role="alert">{geoError}</span>
                                ) : location ? (
                                    <span className="block text-xs" style={{ color: 'var(--ink-2)' }}>No hay paradas a menos de 800 m.</span>
                                ) : (
                                    <span className="block text-xs" style={{ color: 'var(--ink-2)' }}>La ubicación solo se pide cuando tú lo pides.</span>
                                )}
                            </span>
                            <Navigation className="h-4 w-4" style={{ color: 'var(--ink-2)' }} aria-hidden />
                        </button>
                    ) : (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {nearby.map((s) => <LiveStopCard key={s.code} stop={s} meters={s.meters} />)}
                        </div>
                    )}
                </section>

                <AlertsBanner alerts={alertData?.alerts ?? []} title="Todos los avisos de la red" variant="link" />

                <LegalFooter network="bizkaibus" />
            </main>
        </div>
    );
}
