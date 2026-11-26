'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { motion, useReducedMotion } from 'motion/react';
import { ChevronRight, Loader2, LocateFixed, MapPinOff } from 'lucide-react';
import { useGeolocation } from '@/context/GeolocationContext';
import { MARKS, NetworkMark } from '@/components/shared/brand';
import { fmtDistance } from '@/lib/shared/textGeo';
import type { NearbyHit } from '@/lib/search/unified';

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const fetcher = (url: string) => fetch(url).then((r) => {
    if (!r.ok) throw new Error(String(r.status));
    return r.json() as Promise<{ stops: NearbyHit[] }>;
});

/** ~110 m: la petición no lleva la posición exacta y la respuesta se comparte en el CDN. */
const round = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Paradas cercanas de todas las redes en una sola lista, ordenadas por distancia.
 * Solo pide la ubicación cuando se pulsa el botón (nunca al cargar).
 */
export function NearbyAll() {
    const reduce = useReducedMotion();
    const { location, requestLocation, isLoading: locating, error: geoError } = useGeolocation();
    const key = location ? `/api/search/nearby?lat=${round(location.lat)}&lon=${round(location.lon)}` : null;
    const { data, error } = useSWR(key, fetcher, { revalidateOnFocus: false });

    return (
        <section aria-labelledby="near-title" className="space-y-3">
            <div className="flex items-center justify-between gap-3 px-1">
                <h2 id="near-title" className="text-[20px] font-bold tracking-[-0.02em]" style={{ color: 'var(--ink)' }}>Cerca de ti</h2>
                {location && (
                    <button onClick={() => requestLocation()} disabled={locating} className="bt-press -mr-2 inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold" style={{ color: 'var(--accent-text)' }}>
                        {locating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <LocateFixed className="h-4 w-4" aria-hidden />}
                        Actualizar
                    </button>
                )}
            </div>

            {!location ? (
                <motion.button
                    onClick={() => requestLocation()}
                    disabled={locating}
                    whileTap={reduce ? undefined : { scale: 0.98 }}
                    className="bt-card flex w-full items-center gap-3 px-4 py-4 text-left"
                >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full" style={{ background: 'var(--surface-2)' }}>
                        {locating ? <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--ink-2)' }} aria-hidden /> : <LocateFixed className="h-5 w-5" style={{ color: 'var(--ink)' }} aria-hidden />}
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-semibold" style={{ color: 'var(--ink)' }}>{locating ? 'Buscando tu ubicación…' : 'Usar mi ubicación'}</span>
                        <span className="block text-[13px] leading-[18px]" style={{ color: geoError ? 'var(--danger)' : 'var(--ink-2)' }}>
                            {geoError ?? 'Metro, Bilbobus, Bizkaibus y Euskotren a tu alrededor. No se guarda en ningún servidor.'}
                        </span>
                    </span>
                </motion.button>
            ) : error ? (
                <p className="bt-card px-4 py-4 text-sm" style={{ color: 'var(--ink-2)' }}>No se pudieron cargar las paradas cercanas.</p>
            ) : !data ? (
                <div className="bt-card space-y-1 p-1.5" aria-hidden>
                    {[0, 1, 2].map((i) => <div key={i} className="bt-skeleton h-14 rounded-xl" />)}
                </div>
            ) : data.stops.length === 0 ? (
                <div className="bt-card flex items-center gap-3 px-4 py-4">
                    <MapPinOff className="h-5 w-5 shrink-0" style={{ color: 'var(--ink-2)' }} aria-hidden />
                    <p className="text-sm" style={{ color: 'var(--ink-2)' }}>No hay paradas a menos de 900 m.</p>
                </div>
            ) : (
                <ul className="bt-card p-1.5">
                    {data.stops.map((s, i) => (
                        <motion.li
                            key={`${s.network}-${s.id}`}
                            initial={reduce ? false : { opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.24, ease: EASE_OUT, delay: Math.min(i, 6) * 0.03 }}
                        >
                            <Link href={s.href} className="bt-press flex min-h-14 items-center gap-3 rounded-xl px-2.5 py-1.5 hover:bg-[var(--surface-2)]">
                                <NetworkMark network={s.network} size={30} />
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-[15px] font-medium leading-5" style={{ color: 'var(--ink)' }}>{s.name}</span>
                                    <span className="block truncate text-[12px] leading-4" style={{ color: 'var(--ink-2)' }}>
                                        {MARKS[s.network].label}
                                        {s.lines.length > 0 && ` · ${s.lines.slice(0, 5).join(' · ')}${s.lines.length > 5 ? '…' : ''}`}
                                    </span>
                                </span>
                                <span className="bt-num shrink-0 text-[13px] font-semibold" style={{ color: 'var(--ink-2)' }}>{fmtDistance(s.meters)}</span>
                                <ChevronRight className="h-4 w-4 shrink-0" style={{ color: 'var(--ink-2)' }} aria-hidden />
                            </Link>
                        </motion.li>
                    ))}
                </ul>
            )}
        </section>
    );
}
