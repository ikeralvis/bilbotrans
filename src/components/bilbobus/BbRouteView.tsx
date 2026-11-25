'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowUpDown, Bus, ChevronRight } from 'lucide-react';
import { getBbStop } from '@/lib/bilbobus/catalog';
import { findBbDirect, type BbConnection } from '@/lib/bilbobus/connect';
import { useBbStop } from '@/lib/bilbobus/hooks';
import type { BbStop } from '@/lib/bilbobus/types';
import { SPRING, StateCard } from '@/components/metro/parts';
import { BbStopPicker, BbChip, Wait, titleCase } from './BbUi';
import { NetworkBadge } from '@/components/shared/brand';

/** Línea directa con el tiempo de espera en la parada de subida (una consulta por parada, compartida entre líneas). */
function ConnectionCard({ c, index }: { c: BbConnection; index: number }) {
    const { data } = useBbStop(c.from.code);
    const live = data?.arrivals.find((a) => a.line === c.line);
    return (
        <motion.li layout="position" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ ...SPRING, delay: Math.min(index, 6) * 0.04 }}>
            <Link href={`/bilbobus/lines/${c.line}`} className="bt-card bt-press block p-4">
                <div className="flex items-center gap-3">
                    <BbChip line={c.line} size="lg" />
                    <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-[15px] font-semibold leading-5" style={{ color: 'var(--ink)' }}>Hacia {titleCase(c.towards)}</p>
                        <p className="text-xs" style={{ color: 'var(--ink-2)' }}>
                            {c.stops} {c.stops === 1 ? 'parada' : 'paradas'} · sube en {titleCase(c.from.name)}
                        </p>
                    </div>
                    <div className="shrink-0 text-right">
                        {!data ? <div className="bt-skeleton h-6 w-12" aria-hidden /> : live ? <Wait minutes={live.minutes} /> : <span className="text-xs" style={{ color: 'var(--ink-2)' }}>Sin servicio</span>}
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0" style={{ color: 'var(--ink-2)' }} aria-hidden />
                </div>
            </Link>
        </motion.li>
    );
}

/** "¿Qué bus cojo?": líneas directas entre dos paradas, calculadas en el navegador con el catálogo (sin llamadas). */
export function BbRouteView({ from, to }: { from: string | null; to: string | null }) {
    const router = useRouter();
    const a = from ? (getBbStop(from) ?? null) : null;
    const b = to ? (getBbStop(to) ?? null) : null;
    const connections = useMemo(() => (a && b && a.code !== b.code ? findBbDirect(a.code, b.code) : null), [a, b]);

    const go = (nextFrom: BbStop | null, nextTo: BbStop | null) => {
        const sp = new URLSearchParams();
        if (nextFrom) sp.set('from', nextFrom.code);
        if (nextTo) sp.set('to', nextTo.code);
        router.replace(`/bilbobus/route${sp.size ? `?${sp}` : ''}`);
    };

    return (
        <div className="min-h-dvh pb-[max(2rem,env(safe-area-inset-bottom))]" style={{ background: 'var(--bg)' }}>
            <header className="bt-glass sticky top-0 z-20 border-b" style={{ borderColor: 'var(--hairline)' }}>
                <div className="mx-auto flex max-w-2xl items-center gap-2 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
                    <button onClick={() => (window.history.length > 1 ? router.back() : router.push('/bilbobus'))} aria-label="Volver" className="bt-press grid h-11 w-11 place-items-center rounded-full">
                        <ArrowLeft className="h-5 w-5" style={{ color: 'var(--ink)' }} />
                    </button>
                    <h1 className="flex-1 text-[20px] font-bold tracking-[-0.01em]" style={{ color: 'var(--ink)' }}>¿Qué bus cojo?</h1>
                        <NetworkBadge network="bilbobus" />
                </div>
            </header>

            <main className="mx-auto max-w-2xl space-y-4 px-4 pt-4">
                <section className="bt-card relative z-20 space-y-2 p-2.5" aria-label="Origen y destino">
                    <BbStopPicker label="Origen" value={a} onChange={(s) => go(s, b)} placeholder="Parada de origen" />
                    <div className="relative">
                        <BbStopPicker label="Destino" value={b} onChange={(s) => go(a, s)} placeholder="Parada de destino" />
                        {a && b && (
                            <button onClick={() => go(b, a)} aria-label="Invertir" className="bt-press bt-card absolute -top-5 right-3 grid h-9 w-9 place-items-center rounded-full">
                                <ArrowUpDown className="h-4 w-4" style={{ color: 'var(--ink-2)' }} />
                            </button>
                        )}
                    </div>
                </section>

                {!a || !b ? (
                    <StateCard icon={<Bus className="h-6 w-6" style={{ color: 'var(--ink-2)' }} />} title="Elige origen y destino" message="Te decimos qué líneas te llevan directo de una parada a otra y cuánto falta para el próximo bus." />
                ) : a.code === b.code ? (
                    <StateCard icon={<Bus className="h-6 w-6" style={{ color: 'var(--ink-2)' }} />} title="Origen y destino son la misma parada" />
                ) : connections && connections.length === 0 ? (
                    <StateCard
                        icon={<Bus className="h-6 w-6" style={{ color: 'var(--ink-2)' }} />}
                        title="Sin línea directa"
                        message={`Ninguna línea va de ${titleCase(a.name)} a ${titleCase(b.name)} sin transbordo. Prueba con otra parada cercana o combina dos líneas.`}
                    />
                ) : (
                    <section aria-label="Líneas directas" className="space-y-3">
                        <h2 className="px-1 text-[13px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--ink-2)' }}>
                            {connections?.length} {connections?.length === 1 ? 'línea directa' : 'líneas directas'}
                        </h2>
                        <ul className="space-y-3">
                            <AnimatePresence initial={false}>
                                {connections?.map((c, i) => <ConnectionCard key={c.line} c={c} index={i} />)}
                            </AnimatePresence>
                        </ul>
                        <p className="px-1 text-xs" style={{ color: 'var(--ink-2)' }}>
                            Solo líneas directas, según el recorrido más habitual. Se incluyen paradas a menos de 120 m de la elegida.
                        </p>
                    </section>
                )}
            </main>
        </div>
    );
}
