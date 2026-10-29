'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowUpDown, Bus, ChevronRight, CloudOff } from 'lucide-react';
import { getStop } from '@/lib/bizkaibus/catalog';
import { useBizkaibusStop, useConnections } from '@/lib/bizkaibus/hooks';
import type { CatalogStop, Connection } from '@/lib/bizkaibus/types';
import { Minutes, SPRING, StateCard } from '@/components/metro/parts';
import { BusChip, StopPicker, fmtMeters, titleCase } from './ui';
import { NetworkBadge } from '@/components/shared/brand';

/** Línea directa con el próximo bus en la parada de subida (una petición por parada, compartida entre líneas). */
function ConnectionCard({ c, index }: { c: Connection; index: number }) {
    const { data } = useBizkaibusStop(c.from.code);
    const live = data?.arrivals.find((a) => a.line === c.line);
    const dist = fmtMeters(live?.next?.meters);
    return (
        <motion.li
            layout="position"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ ...SPRING, delay: Math.min(index, 6) * 0.04 }}
        >
            <Link href={`/bizkaibus/lines/${c.line}`} className="bt-card bt-press block p-4">
                <div className="flex items-center gap-3">
                    <BusChip line={c.line} size="lg" />
                    <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-[15px] font-semibold leading-5" style={{ color: 'var(--ink)' }}>{c.lineName}</p>
                        <p className="text-xs" style={{ color: 'var(--ink-2)' }}>{c.stops} {c.stops === 1 ? 'parada' : 'paradas'} · sube en {c.from.name}</p>
                    </div>
                    <div className="shrink-0 text-right">
                        {!data ? (
                            <div className="bt-skeleton h-6 w-12" aria-hidden />
                        ) : live?.next ? (
                            <>
                                <Minutes value={live.next.minutes} />
                                {dist && <p className="bt-num text-[11px]" style={{ color: 'var(--ink-2)' }}>{dist}</p>}
                            </>
                        ) : (
                            <span className="text-xs" style={{ color: 'var(--ink-2)' }}>Sin previsión</span>
                        )}
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0" style={{ color: 'var(--ink-2)' }} aria-hidden />
                </div>
            </Link>
        </motion.li>
    );
}

/** Buscador de trayecto: de una parada a otra, qué líneas te llevan directo (sin transbordos). */
export function BizkaibusRouteView({ from, to }: { from: string | null; to: string | null }) {
    const router = useRouter();
    const a = from ? (getStop(from) ?? null) : null;
    const b = to ? (getStop(to) ?? null) : null;
    const { data, error, isLoading } = useConnections(a && b ? a.code : null, a && b ? b.code : null);

    const go = (nextFrom: CatalogStop | null, nextTo: CatalogStop | null) => {
        const sp = new URLSearchParams();
        if (nextFrom) sp.set('from', nextFrom.code);
        if (nextTo) sp.set('to', nextTo.code);
        router.replace(`/bizkaibus/route${sp.size ? `?${sp}` : ''}`);
    };

    return (
        <div className="min-h-dvh pb-[max(2rem,env(safe-area-inset-bottom))]" style={{ background: 'var(--bg)' }}>
            <header className="bt-glass sticky top-0 z-20 border-b" style={{ borderColor: 'var(--hairline)' }}>
                <div className="mx-auto flex max-w-2xl items-center gap-2 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
                    <button onClick={() => (window.history.length > 1 ? router.back() : router.push('/bizkaibus'))} aria-label="Volver" className="bt-press grid h-11 w-11 place-items-center rounded-full">
                        <ArrowLeft className="h-5 w-5" style={{ color: 'var(--ink)' }} />
                    </button>
                    <h1 className="flex-1 text-[20px] font-bold tracking-[-0.01em]" style={{ color: 'var(--ink)' }}>¿Qué bus cojo?</h1>
                        <NetworkBadge network="bizkaibus" />
                </div>
            </header>

            <main className="mx-auto max-w-2xl space-y-4 px-4 pt-4">
                <section className="bt-card relative z-20 space-y-2 p-2.5" aria-label="Origen y destino">
                    <StopPicker label="Origen" value={a} onChange={(s) => go(s, b)} placeholder="Parada de origen" />
                    <div className="relative">
                        <StopPicker label="Destino" value={b} onChange={(s) => go(a, s)} placeholder="Parada de destino" />
                        {a && b && (
                            <button onClick={() => go(b, a)} aria-label="Invertir" className="bt-press bt-card absolute -top-5 right-3 grid h-9 w-9 place-items-center rounded-full">
                                <ArrowUpDown className="h-4 w-4" style={{ color: 'var(--ink-2)' }} />
                            </button>
                        )}
                    </div>
                </section>

                {!a || !b ? (
                    <StateCard
                        icon={<Bus className="h-6 w-6" style={{ color: 'var(--ink-2)' }} />}
                        title="Elige origen y destino"
                        message="Te decimos qué líneas te llevan directo de una parada a otra y cuándo pasa el próximo bus."
                    />
                ) : a.code === b.code ? (
                    <StateCard icon={<Bus className="h-6 w-6" style={{ color: 'var(--ink-2)' }} />} title="Origen y destino son la misma parada" />
                ) : error ? (
                    <StateCard icon={<CloudOff className="h-6 w-6" style={{ color: 'var(--ink-2)' }} />} title="No se pudo buscar" message="Inténtalo de nuevo en unos segundos." />
                ) : isLoading || !data ? (
                    <div className="space-y-3" aria-hidden>
                        <div className="bt-skeleton h-[76px]" />
                        <div className="bt-skeleton h-[76px]" />
                    </div>
                ) : data.connections.length === 0 ? (
                    <StateCard
                        icon={<Bus className="h-6 w-6" style={{ color: 'var(--ink-2)' }} />}
                        title="Sin línea directa"
                        message={`Ninguna línea va de ${titleCase(a.name)} a ${titleCase(b.name)} sin transbordo. Prueba con otra parada cercana o combina dos líneas.`}
                    />
                ) : (
                    <section aria-label="Líneas directas" className="space-y-3">
                        <h2 className="px-1 text-[13px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--ink-2)' }}>
                            {data.connections.length} {data.connections.length === 1 ? 'línea directa' : 'líneas directas'}
                        </h2>
                        <ul className="space-y-3">
                            <AnimatePresence initial={false}>
                                {data.connections.map((c, i) => <ConnectionCard key={c.line} c={c} index={i} />)}
                            </AnimatePresence>
                        </ul>
                        <p className="px-1 text-xs" style={{ color: 'var(--ink-2)' }}>
                            Solo líneas directas. Se incluyen paradas a menos de 120 m de la elegida (la acera de enfrente o la de al lado).
                        </p>
                    </section>
                )}
            </main>
        </div>
    );
}
