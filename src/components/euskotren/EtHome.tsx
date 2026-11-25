'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronRight, Crosshair, Navigation } from 'lucide-react';
import { useFavorites } from '@/context/FavoritesContext';
import { useGeolocation } from '@/context/GeolocationContext';
import { ET_DETAILS, getEtLine, getEtStation, nearestEtStations } from '@/lib/euskotren/catalog';
import { refreshEuskotrenLive } from '@/lib/euskotren/hooks';
import type { EtScope } from '@/lib/euskotren/scopes';
import type { EtStation } from '@/lib/euskotren/types';
import { SPRING } from '@/components/metro/parts';
import { NetworkHero } from '@/components/shared/brand';
import { LegalFooter } from '@/components/shared/Legal';
import { EtChip, EtLiveStationCard, EtStationPicker, RefreshNote } from './EtUi';

const MAX_FAVORITES = 6;

/** Home de un ámbito de Euskotren (tren, L3, tranvía de Bilbao o de Vitoria): solo sus líneas y sus estaciones. */
export default function EtHome({ scope }: { scope: EtScope }) {
    const router = useRouter();
    const { favorites } = useFavorites();
    const { location, requestLocation, isLoading: locating, error: geoError } = useGeolocation();

    const favStations = useMemo(() => {
        const seen = new Set<string>();
        return favorites
            .filter((f) => f.agency === 'euskotren')
            .map((f) => getEtStation(f.stopId))
            .filter((s): s is EtStation => Boolean(s) && s!.lines.some((l) => scope.lines.includes(l)) && !seen.has(s!.id) && Boolean(seen.add(s!.id)));
    }, [favorites, scope]);

    const nearby = useMemo(() => (location ? nearestEtStations(location.lat, location.lon, 3, 1500, scope.lines) : []), [location, scope]);
    const lines = scope.lines.map((c) => getEtLine(c)).filter((l) => l !== undefined && ET_DETAILS[l.code]);

    return (
        <div className={`${scope.theme} min-h-dvh pb-[max(6rem,env(safe-area-inset-bottom))]`} style={{ background: 'var(--bg)' }}>
            <NetworkHero network={scope.mark} />

            <main className="mx-auto mt-4 max-w-2xl space-y-5 px-4">
                <h2 className="px-1 text-[22px] font-bold tracking-[-0.02em]" style={{ color: 'var(--ink)' }}>{scope.name}</h2>

                <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={SPRING} className="bt-card relative z-20 p-2.5" aria-label="Buscar estación">
                    <EtStationPicker onChange={(s) => router.push(`/euskotren/station/${s.id}`)} placeholder={scope.placeholder} lines={scope.lines} />
                </motion.section>

                <section className="space-y-2" aria-label="Líneas">
                    <h2 className="px-1 text-[13px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--ink-2)' }}>Líneas</h2>
                    <ul className="bt-card p-1.5">
                        {lines.map((l) => (
                            <li key={l!.code}>
                                <Link href={`/euskotren/lines/${l!.code}`} className="bt-press flex min-h-14 items-center gap-3 rounded-xl px-3 py-2 hover:bg-[var(--surface-2)]">
                                    <EtChip line={l!.code} size="lg" />
                                    <span className="min-w-0 flex-1 truncate text-[15px] font-medium" style={{ color: 'var(--ink)' }}>{l!.name}</span>
                                    <ChevronRight className="h-4 w-4 shrink-0" style={{ color: 'var(--ink-2)' }} aria-hidden />
                                </Link>
                            </li>
                        ))}
                    </ul>
                </section>

                <section className="space-y-3" aria-label="Favoritos">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--ink-2)' }}>Favoritos</h2>
                        {favStations.length > 0 && (
                            <button onClick={() => refreshEuskotrenLive()} className="bt-press min-h-9 rounded-full px-3 text-xs font-semibold" style={{ color: 'var(--ink-2)' }}>
                                Actualizar
                            </button>
                        )}
                    </div>
                    {favStations.length === 0 ? (
                        <div className="bt-card px-4 py-6 text-center">
                            <p className="text-[15px] font-medium" style={{ color: 'var(--ink)' }}>Aún no tienes favoritos</p>
                            <p className="mt-1 text-sm" style={{ color: 'var(--ink-2)' }}>Abre una estación y pulsa el corazón para verla aquí en directo.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <AnimatePresence initial={false}>
                                {favStations.slice(0, MAX_FAVORITES).map((s) => <EtLiveStationCard key={s.id} station={s} />)}
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
                                <span className="block text-[15px] font-medium" style={{ color: 'var(--ink)' }}>{locating ? 'Buscando tu ubicación…' : 'Ver estaciones cerca de mí'}</span>
                                {geoError ? (
                                    <span className="block text-xs" style={{ color: 'var(--ink-2)' }} role="alert">{geoError}</span>
                                ) : location ? (
                                    <span className="block text-xs" style={{ color: 'var(--ink-2)' }}>No hay paradas de {scope.name} a menos de 1,5 km.</span>
                                ) : (
                                    <span className="block text-xs" style={{ color: 'var(--ink-2)' }}>La ubicación solo se pide cuando tú lo pides.</span>
                                )}
                            </span>
                            <Navigation className="h-4 w-4" style={{ color: 'var(--ink-2)' }} aria-hidden />
                        </button>
                    ) : (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {nearby.map((s) => <EtLiveStationCard key={s.id} station={s} meters={s.meters} />)}
                        </div>
                    )}
                </section>

                <RefreshNote />
                <LegalFooter network="euskotren" />
            </main>
        </div>
    );
}
