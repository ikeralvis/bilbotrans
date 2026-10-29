'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, History, Repeat } from 'lucide-react';
import { getStation } from '@/lib/metro/catalog';
import { useMetroRoute } from '@/lib/metro/hooks';
import type { SavedRoute } from '@/lib/metro/routes';
import { LineChip, Minutes, SPRING } from './parts';

export const routeHref = (r: SavedRoute) => `/metro/route?origin=${r.from}&dest=${r.to}`;

/** Trayecto guardado con el próximo tren en directo. Una estación que ya no exista en el catálogo se ignora. */
export function RouteLiveCard({ route, index = 0 }: { route: SavedRoute; index?: number }) {
    const a = getStation(route.from);
    const b = getStation(route.to);
    const { data, error } = useMetroRoute(a ? route.from : null, b ? route.to : null);
    if (!a || !b) return null;
    const [first, ...rest] = data?.trains ?? [];
    const upcoming = rest.slice(0, 2).map((t) => t.minutes);

    return (
        <motion.div
            layout="position"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.14 } }}
            transition={{ ...SPRING, delay: index * 0.05 }}
        >
            <Link href={routeHref(route)} className="bt-card bt-press flex min-h-[88px] items-center gap-3 p-3.5" prefetch>
                <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-[16px] font-bold tracking-[-0.01em]" style={{ color: 'var(--ink)' }}>
                        <span className="truncate">{a.name}</span>
                        <ArrowRight className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--ink-2)' }} aria-hidden />
                        <span className="truncate">{b.name}</span>
                    </p>
                    {!data && !error ? (
                        <div className="mt-2 space-y-1.5" aria-hidden>
                            <div className="bt-skeleton h-3.5 w-2/3" />
                        </div>
                    ) : error && !data ? (
                        <p className="mt-1 text-xs" style={{ color: 'var(--ink-2)' }}>Sin datos ahora</p>
                    ) : (
                        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs" style={{ color: 'var(--ink-2)' }}>
                            {data && <LineChip line={data.line} size="sm" />}
                            {data?.transfer && (
                                <span className="inline-flex items-center gap-1">
                                    <Repeat className="h-3 w-3" aria-hidden /> Transbordo
                                </span>
                            )}
                            {first ? <span className="truncate">{first.destination}</span> : <span>Sin trenes previstos</span>}
                            {upcoming.length > 0 && <span className="bt-num">· luego {upcoming.join(' · ')} min</span>}
                        </p>
                    )}
                </div>
                {first ? <Minutes value={first.minutes} big /> : data ? null : <div className="bt-skeleton h-11 w-14" aria-hidden />}
            </Link>
        </motion.div>
    );
}

/** Recientes y frecuentes: un toque abre el trayecto. */
export function RouteSuggestions({ items }: { items: Array<SavedRoute & { frequent: boolean }> }) {
    if (items.length === 0) return null;
    return (
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="space-y-2" aria-label="Trayectos sugeridos">
            <h2 className="flex items-center gap-1.5 px-1 text-[13px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--ink-2)' }}>
                <History className="h-3.5 w-3.5" aria-hidden /> Sugeridos
            </h2>
            <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <AnimatePresence initial={false}>
                    {items.map((r, i) => {
                        const a = getStation(r.from);
                        const b = getStation(r.to);
                        if (!a || !b) return null;
                        return (
                            <motion.li
                                key={`${r.from}-${r.to}`}
                                layout
                                initial={{ opacity: 0, x: 12 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ ...SPRING, delay: i * 0.05 }}
                                className="shrink-0"
                            >
                                <Link
                                    href={routeHref(r)}
                                    className="bt-press flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-sm font-semibold"
                                    style={{ background: 'var(--surface)', color: 'var(--ink)', boxShadow: 'var(--shadow-card)' }}
                                >
                                    {a.name}
                                    <ArrowRight className="h-3.5 w-3.5" style={{ color: 'var(--ink-2)' }} aria-hidden />
                                    {b.name}
                                    {r.frequent && <span className="text-[11px] font-medium" style={{ color: 'var(--ink-2)' }}>habitual</span>}
                                </Link>
                            </motion.li>
                        );
                    })}
                </AnimatePresence>
            </ul>
        </motion.section>
    );
}
