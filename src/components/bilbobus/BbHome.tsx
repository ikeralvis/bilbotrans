'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { Crosshair, ListOrdered, Navigation, Route as RouteIcon } from 'lucide-react';
import { useFavorites } from '@/context/FavoritesContext';
import { useGeolocation } from '@/context/GeolocationContext';
import { getBbStop, nearestBbStops } from '@/lib/bilbobus/catalog';
import { refreshBilbobusLive } from '@/lib/bilbobus/hooks';
import type { BbStop } from '@/lib/bilbobus/types';
import { SPRING } from '@/components/metro/parts';
import { BusStrip, NetworkHero } from '@/components/shared/brand';
import { LegalFooter } from '@/components/shared/Legal';
import { BbLiveStopCard, BbStopPicker, RefreshNote } from './BbUi';

const MAX_FAVORITES = 6;

export default function BbHome() {
    const router = useRouter();
    const { favorites } = useFavorites();
    const { location, requestLocation, isLoading: locating, error: geoError } = useGeolocation();

    const favStops = useMemo(() => {
        const seen = new Set<string>();
        return favorites
            .filter((f) => f.agency === 'bilbobus')
            .map((f) => getBbStop(f.stopId))
            .filter((s): s is BbStop => Boolean(s) && !seen.has(s!.code) && Boolean(seen.add(s!.code)));
    }, [favorites]);

    const nearby = useMemo(() => (location ? nearestBbStops(location.lat, location.lon, 3) : []), [location]);

    return (
        <div className="min-h-dvh pb-[max(6rem,env(safe-area-inset-bottom))]" style={{ background: 'var(--bg)' }}>
            <NetworkHero network="bilbobus" logoHeight={26}>
                <BusStrip color="#c22629" height={44} background="var(--strip)" />
            </NetworkHero>

            <main className="mx-auto mt-4 max-w-2xl space-y-5 px-4">
                <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={SPRING} className="bt-card relative z-20 space-y-2.5 p-2.5" aria-label="Buscar parada">
                    <BbStopPicker value={null} onChange={(s) => s && router.push(`/bilbobus/stop/${s.code}`)} placeholder="Busca tu parada: calle o código" />
                    <div className="grid grid-cols-2 gap-2.5">
                        <Link href="/bilbobus/route" className="bt-press flex min-h-12 items-center justify-center gap-2 rounded-[14px] text-[15px] font-semibold text-white" style={{ background: 'var(--accent)' }}>
                            <RouteIcon className="h-4 w-4" aria-hidden /> ¿Qué bus cojo?
                        </Link>
                        <Link href="/bilbobus/lines" className="bt-press flex min-h-12 items-center justify-center gap-2 rounded-[14px] text-[15px] font-semibold" style={{ background: 'var(--surface-2)', color: 'var(--ink)' }}>
                            <ListOrdered className="h-4 w-4" aria-hidden /> Líneas
                        </Link>
                    </div>
                </motion.section>

                <section className="space-y-3" aria-label="Favoritos">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--ink-2)' }}>Favoritos</h2>
                        {favStops.length > 0 && (
                            <button onClick={() => refreshBilbobusLive()} className="bt-press min-h-9 rounded-full px-3 text-xs font-semibold" style={{ color: 'var(--ink-2)' }}>
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
                                {favStops.slice(0, MAX_FAVORITES).map((s) => <BbLiveStopCard key={s.code} stop={s} />)}
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
                                    <span className="block text-xs" style={{ color: 'var(--ink-2)' }}>No hay paradas de Bilbobus a menos de 600 m.</span>
                                ) : (
                                    <span className="block text-xs" style={{ color: 'var(--ink-2)' }}>La ubicación solo se pide cuando tú lo pides.</span>
                                )}
                            </span>
                            <Navigation className="h-4 w-4" style={{ color: 'var(--ink-2)' }} aria-hidden />
                        </button>
                    ) : (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {nearby.map((s) => <BbLiveStopCard key={s.code} stop={s} meters={s.meters} />)}
                        </div>
                    )}
                </section>

                <RefreshNote />
                <LegalFooter network="bilbobus" />
            </main>
        </div>
    );
}
