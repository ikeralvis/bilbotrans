'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Search, X } from 'lucide-react';
import { lineColor, searchBbStops } from '@/lib/bilbobus/catalog';
import { fmtDistance, BusChip, titleCase } from '@/components/shared/bus';
import { Minutes, SPRING } from '@/components/metro/parts';
import type { BbArrival, BbStop } from '@/lib/bilbobus/types';
import { useBbStop } from '@/lib/bilbobus/hooks';

export { titleCase };

/** Chip de línea con su color oficial (cada línea de Bilbobus tiene el suyo). */
export function BbChip({ line, size = 'md' }: { line: string; size?: 'sm' | 'md' | 'lg' }) {
    return <BusChip line={line} size={size} color={lineColor(line)} />;
}

/** Minutos de espera, o "Sin información" cuando el servicio no tiene dato de esa línea. */
export function Wait({ minutes, compact = false }: { minutes: number | null; compact?: boolean }) {
    if (minutes === null) {
        return <span className="text-xs font-medium" style={{ color: 'var(--ink-2)' }}>Sin información</span>;
    }
    return <Minutes value={minutes} compact={compact} />;
}

/** Buscador de paradas con resultados al escribir. */
export function BbStopPicker({
    label,
    value,
    onChange,
    placeholder = 'Buscar parada',
}: {
    label?: string;
    value: BbStop | null;
    onChange: (s: BbStop | null) => void;
    placeholder?: string;
}) {
    const [q, setQ] = useState('');
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const results = useMemo(() => searchBbStops(q, 8), [q]);

    useEffect(() => {
        const close = (e: PointerEvent) => {
            if (!ref.current?.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('pointerdown', close);
        return () => document.removeEventListener('pointerdown', close);
    }, []);

    return (
        <div ref={ref} className="relative">
            <div className="flex min-h-14 items-center gap-3 rounded-[14px] px-3.5" style={{ background: 'var(--surface-2)' }}>
                {label ? (
                    <span className="w-14 shrink-0 text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--ink-2)' }}>{label}</span>
                ) : (
                    <Search className="h-4 w-4 shrink-0" style={{ color: 'var(--ink-2)' }} aria-hidden />
                )}
                <input
                    className={`min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-[var(--ink-2)] ${value && !editing ? 'truncate font-semibold' : ''}`}
                    style={{ color: 'var(--ink)' }}
                    placeholder={placeholder}
                    value={editing ? q : titleCase(value?.name ?? '')}
                    onChange={(e) => {
                        setQ(e.target.value);
                        setOpen(true);
                    }}
                    onFocus={(e) => {
                        setEditing(true);
                        setQ('');
                        setOpen(true);
                        if (value) e.currentTarget.select();
                    }}
                    onBlur={() => setEditing(false)}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="search"
                    aria-label={label ?? placeholder}
                />
                {value && (
                    <button onClick={() => { onChange(null); setQ(''); }} aria-label="Quitar" className="bt-press grid h-11 w-11 place-items-center">
                        <X className="h-4 w-4" style={{ color: 'var(--ink-2)' }} />
                    </button>
                )}
            </div>
            <AnimatePresence>
                {open && editing && results.length > 0 && (
                    <motion.ul
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.1 } }}
                        transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                        style={{ transformOrigin: 'top' }}
                        className="bt-card absolute inset-x-0 top-full z-30 mt-2 overflow-hidden p-1.5"
                    >
                        {results.map((s) => (
                            <li key={s.code}>
                                <button
                                    onPointerDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                        onChange(s);
                                        setOpen(false);
                                        setQ('');
                                        setEditing(false);
                                        (document.activeElement as HTMLElement | null)?.blur();
                                    }}
                                    className="bt-press flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left hover:bg-[var(--surface-2)]"
                                >
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-[16px] font-medium" style={{ color: 'var(--ink)' }}>{titleCase(s.name)}</span>
                                        <span className="block truncate text-xs" style={{ color: 'var(--ink-2)' }}>Parada {s.code}</span>
                                    </span>
                                    <span className="flex max-w-[40%] shrink-0 flex-wrap justify-end gap-1">
                                        {s.lines.slice(0, 4).map((l) => <BbChip key={l} line={l} size="sm" />)}
                                        {s.lines.length > 4 && <span className="text-[11px]" style={{ color: 'var(--ink-2)' }}>+{s.lines.length - 4}</span>}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </motion.ul>
                )}
            </AnimatePresence>
        </div>
    );
}

/** Tarjeta de parada con los próximos buses en directo (favoritos y "cerca de ti"). */
export function BbLiveStopCard({ stop, meters }: { stop: BbStop; meters?: number }) {
    const { data, error } = useBbStop(stop.code);
    const next = (data?.arrivals ?? []).slice(0, 2);
    return (
        <motion.div layout="position" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={SPRING}>
            <Link href={`/bilbobus/stop/${stop.code}`} className="bt-card bt-press block p-3.5" prefetch>
                <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                        <h3 className="truncate text-[16px] font-bold tracking-[-0.01em]" style={{ color: 'var(--ink)' }}>{titleCase(stop.name)}</h3>
                        <p className="truncate text-xs" style={{ color: 'var(--ink-2)' }}>
                            Parada {stop.code}
                            {typeof meters === 'number' && ` · ${fmtDistance(meters)}`}
                        </p>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0" style={{ color: 'var(--ink-2)' }} aria-hidden />
                </div>
                <div className="mt-2.5 space-y-1.5">
                    {!data && !error ? (
                        <>
                            <div className="bt-skeleton h-6" aria-hidden />
                            <div className="bt-skeleton h-6" aria-hidden />
                        </>
                    ) : error && !data ? (
                        <p className="text-xs" style={{ color: 'var(--ink-2)' }}>Sin datos ahora</p>
                    ) : next.length === 0 ? (
                        <p className="text-xs" style={{ color: 'var(--ink-2)' }}>Sin autobuses en servicio</p>
                    ) : (
                        next.map((a) => <ArrivalMini key={a.line} arrival={a} />)
                    )}
                </div>
            </Link>
        </motion.div>
    );
}

function ArrivalMini({ arrival }: { arrival: BbArrival }) {
    return (
        <div className="flex items-center gap-2">
            <BbChip line={arrival.line} size="sm" />
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium" style={{ color: 'var(--ink)' }}>{titleCase(arrival.towards)}</span>
            <Wait minutes={arrival.minutes} compact />
        </div>
    );
}

/** Aviso de que los tiempos no son un reloj. */
export function RefreshNote({ children }: { children?: ReactNode }) {
    return (
        <p className="px-1 text-center text-xs leading-5" style={{ color: 'var(--ink-2)' }}>
            {children ?? 'Los tiempos los publica Bilbobus y se actualizan cada pocos minutos.'}
        </p>
    );
}
