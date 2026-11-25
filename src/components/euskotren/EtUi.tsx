'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Search, X } from 'lucide-react';
import { ET_LINES, getEtLine, searchEtStations } from '@/lib/euskotren/catalog';
import { useEtStation } from '@/lib/euskotren/hooks';
import type { EtArrival, EtStation } from '@/lib/euskotren/types';
import { fmtDistance, readableOn, titleCase } from '@/components/shared/bus';
import { Minutes, SPRING } from '@/components/metro/parts';

const LINE_COLORS = new Map(ET_LINES.map((l) => [l.code, l]));

/** Chip de línea con el color oficial de Euskotren (E1 azul, L3 magenta, TR verde…). */
export function EtChip({ line, size = 'md' }: { line: string; size?: 'sm' | 'md' | 'lg' }) {
    const def = LINE_COLORS.get(line);
    const dims = size === 'sm' ? 'h-5 min-w-6 px-1.5 text-[11px]' : size === 'lg' ? 'h-8 min-w-9 px-3 text-[15px]' : 'h-6 min-w-7 px-2 text-xs';
    const bg = def?.color ?? '#0a4a9c';
    return (
        <span className={`bt-num inline-flex shrink-0 items-center justify-center rounded-md font-bold tracking-tight ${dims}`} style={{ background: bg, color: def?.textColor ?? readableOn(bg) }} aria-label={`Línea ${line}`}>
            {line}
        </span>
    );
}

/** "+3 min" cuando el operador informa de un retraso de un minuto o más. */
export function DelayTag({ delay }: { delay: number }) {
    if (delay < 60) return null;
    return (
        <span className="bt-num rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: 'color-mix(in srgb, var(--warn) 22%, var(--surface))', color: 'var(--ink)' }}>
            +{Math.round(delay / 60)} min
        </span>
    );
}

export const lineName = (code: string) => getEtLine(code)?.name ?? code;

/** Buscador de estaciones con resultados al escribir. */
export function EtStationPicker({ onChange, placeholder = 'Buscar estación', lines }: { onChange: (s: EtStation) => void; placeholder?: string; lines?: string[] }) {
    const [q, setQ] = useState('');
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const results = useMemo(() => searchEtStations(q, 8, lines), [q, lines]);

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
                <Search className="h-4 w-4 shrink-0" style={{ color: 'var(--ink-2)' }} aria-hidden />
                <input
                    className="min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-[var(--ink-2)]"
                    style={{ color: 'var(--ink)' }}
                    placeholder={placeholder}
                    value={q}
                    onChange={(e) => {
                        setQ(e.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="search"
                    aria-label={placeholder}
                />
                {q && (
                    <button onClick={() => setQ('')} aria-label="Borrar" className="bt-press grid h-11 w-11 place-items-center">
                        <X className="h-4 w-4" style={{ color: 'var(--ink-2)' }} />
                    </button>
                )}
            </div>
            <AnimatePresence>
                {open && results.length > 0 && (
                    <motion.ul
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.1 } }}
                        transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                        style={{ transformOrigin: 'top' }}
                        className="bt-card absolute inset-x-0 top-full z-30 mt-2 overflow-hidden p-1.5"
                    >
                        {results.map((s) => (
                            <li key={s.id}>
                                <button
                                    onPointerDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                        onChange(s);
                                        setOpen(false);
                                        setQ('');
                                    }}
                                    className="bt-press flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left hover:bg-[var(--surface-2)]"
                                >
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-[16px] font-medium" style={{ color: 'var(--ink)' }}>{s.name}</span>
                                        {s.desc && <span className="block truncate text-xs" style={{ color: 'var(--ink-2)' }}>{s.desc}</span>}
                                    </span>
                                    <span className="flex max-w-[40%] shrink-0 flex-wrap justify-end gap-1">
                                        {s.lines.slice(0, 4).map((l) => <EtChip key={l} line={l} size="sm" />)}
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

/** Tarjeta de estación con los próximos trenes en directo (favoritos y "cerca de ti"). */
export function EtLiveStationCard({ station, meters }: { station: EtStation; meters?: number }) {
    const { data, error } = useEtStation(station.id);
    const next = (data?.arrivals ?? []).slice(0, 2);
    return (
        <motion.div layout="position" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={SPRING}>
            <Link href={`/euskotren/station/${station.id}`} className="bt-card bt-press block p-3.5" prefetch>
                <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                        <h3 className="truncate text-[16px] font-bold tracking-[-0.01em]" style={{ color: 'var(--ink)' }}>{station.name}</h3>
                        <p className="truncate text-xs" style={{ color: 'var(--ink-2)' }}>
                            {station.lines.join(' · ')}
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
                        <p className="text-xs" style={{ color: 'var(--ink-2)' }}>Sin trenes en servicio</p>
                    ) : (
                        next.map((a, i) => <ArrivalMini key={`${a.line}${a.time}${i}`} arrival={a} scheduled={data?.source === 'schedule'} />)
                    )}
                </div>
            </Link>
        </motion.div>
    );
}

function ArrivalMini({ arrival, scheduled }: { arrival: EtArrival; scheduled: boolean }) {
    return (
        <div className="flex items-center gap-2">
            <EtChip line={arrival.line} size="sm" />
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium" style={{ color: 'var(--ink)' }}>{titleCase(arrival.towards)}</span>
            <DelayTag delay={arrival.delay} />
            <span style={{ opacity: scheduled ? 0.7 : 1 }}><Minutes value={arrival.minutes} compact /></span>
        </div>
    );
}

export function RefreshNote({ children }: { children?: ReactNode }) {
    return (
        <p className="px-1 text-center text-xs leading-5" style={{ color: 'var(--ink-2)' }}>
            {children ?? 'Los tiempos los publica Euskotren (GTFS-RT) y se actualizan cada pocos segundos.'}
        </p>
    );
}
