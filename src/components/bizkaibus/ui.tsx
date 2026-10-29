'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, ArrowRight, Accessibility, ChevronRight, Search, X } from 'lucide-react';
import { searchStops } from '@/lib/bizkaibus/catalog';
import type { BizkaibusAlert, CatalogStop, StopArrival } from '@/lib/bizkaibus/types';
import { Minutes, SPRING } from '@/components/metro/parts';
import { BottomSheet } from '@/components/metro/ui';
import { BusChip, titleCase } from '@/components/shared/bus';

export { BusChip, titleCase };

export function fmtMeters(m: number | null | undefined): string | null {
    if (!m || m <= 0) return null;
    return m < 1000 ? `a ${Math.round(m / 10) * 10} m` : `a ${(m / 1000).toFixed(1).replace('.', ',')} km`;
}

/* ───────── Buscador de paradas con resultados al escribir ───────── */
export function StopPicker({
    label,
    value,
    onChange,
    placeholder = 'Buscar parada',
    autoFocus = false,
}: {
    label?: string;
    value: CatalogStop | null;
    onChange: (s: CatalogStop | null) => void;
    placeholder?: string;
    autoFocus?: boolean;
}) {
    const [q, setQ] = useState('');
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const results = useMemo(() => searchStops(q, 8), [q]);

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
                    <span className="w-14 shrink-0 text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--ink-2)' }}>
                        {label}
                    </span>
                ) : (
                    <Search className="h-4 w-4 shrink-0" style={{ color: 'var(--ink-2)' }} aria-hidden />
                )}
                <input
                    className={`min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-[var(--ink-2)] ${value && !editing ? 'truncate font-semibold' : ''}`}
                    style={{ color: 'var(--ink)' }}
                    placeholder={placeholder}
                    value={editing ? q : (value?.name ?? '')}
                    autoFocus={autoFocus}
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
                    <button
                        onClick={() => {
                            onChange(null);
                            setQ('');
                        }}
                        aria-label="Quitar"
                        className="bt-press grid h-11 w-11 place-items-center"
                    >
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
                                        <span className="block truncate text-[16px] font-medium" style={{ color: 'var(--ink)' }}>{s.name}</span>
                                        <span className="block truncate text-xs" style={{ color: 'var(--ink-2)' }}>{titleCase(s.municipality)} · {s.code}</span>
                                    </span>
                                    <span className="flex max-w-[40%] shrink-0 flex-wrap justify-end gap-1">
                                        {s.lines.slice(0, 3).map((l) => <BusChip key={l} line={l} size="sm" />)}
                                        {s.lines.length > 3 && <span className="text-[11px]" style={{ color: 'var(--ink-2)' }}>+{s.lines.length - 3}</span>}
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

/* ───────── Llegada destacada (próximo bus) y filas ───────── */
export function ArrivalHero({ arrival, label }: { arrival: StopArrival; label: string }) {
    const dist = fmtMeters(arrival.next?.meters);
    return (
        <div className="bt-card p-5">
            <p className="text-[13px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--ink-2)' }}>{label}</p>
            <div className="mt-3 flex items-end justify-between gap-4">
                <div className="min-w-0 flex-1 pb-1">
                    <div className="flex flex-col items-start gap-2">
                        <BusChip line={arrival.line} size="lg" />
                        <p className="line-clamp-2 min-w-0 text-[22px] font-bold leading-6 tracking-[-0.02em]" style={{ color: 'var(--ink)' }}>{titleCase(arrival.route)}</p>
                    </div>
                    <p className="bt-num mt-1.5 text-sm" style={{ color: 'var(--ink-2)' }}>
                        {dist ? `${dist} de la parada` : 'En camino'}
                        {arrival.following && ` · después en ${arrival.following.minutes} min`}
                    </p>
                </div>
                <Minutes value={arrival.next?.minutes ?? 0} huge />
            </div>
        </div>
    );
}

export function ArrivalRow({ arrival }: { arrival: StopArrival }) {
    const dist = fmtMeters(arrival.next?.meters);
    return (
        <Link href={`/bizkaibus/lines/${arrival.line}`} className="bt-press flex items-center gap-3 px-3.5 py-2.5">
            <BusChip line={arrival.line} />
            <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold" style={{ color: 'var(--ink)' }}>{titleCase(arrival.route)}</p>
                <p className="bt-num text-xs" style={{ color: 'var(--ink-2)' }}>
                    {dist ?? 'En camino'}
                    {arrival.following && ` · después ${arrival.following.minutes} min`}
                </p>
            </div>
            <Minutes value={arrival.next?.minutes ?? 0} />
        </Link>
    );
}

export function AccessibleBadge({ code }: { code: string }) {
    if (!code) return null;
    return (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}>
            <Accessibility className="h-3 w-3" aria-hidden /> Accesibilidad {code}
        </span>
    );
}

/* ───────── Avisos ───────── */
export function AlertsBanner({ alerts, title = 'Avisos', variant = 'banner' }: { alerts: BizkaibusAlert[]; title?: string; variant?: 'banner' | 'link' }) {
    const [open, setOpen] = useState(false);
    if (alerts.length === 0) return null;
    const first = alerts[0];
    return (
        <>
            {variant === 'link' ? (
                <button onClick={() => setOpen(true)} className="bt-press mx-auto flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium" style={{ color: 'var(--ink-2)' }}>
                    <AlertTriangle className="h-4 w-4" aria-hidden /> {title} ({alerts.length})
                </button>
            ) : (
            <button
                onClick={() => setOpen(true)}
                className="bt-press flex w-full items-center gap-2.5 rounded-2xl px-4 py-3 text-left text-sm"
                style={{ background: 'color-mix(in srgb, var(--warn) 16%, var(--surface))', color: 'var(--ink)' }}
            >
                <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: 'var(--warn)' }} aria-hidden />
                <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{first.description.split('\n')[0]}</span>
                    <span className="block truncate text-xs" style={{ color: 'var(--ink-2)' }}>
                        {alerts.length > 1 ? `${alerts.length} avisos` : first.lines.join(' · ') || 'Toda la red'}
                    </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0" style={{ color: 'var(--ink-2)' }} aria-hidden />
            </button>
            )}
            <BottomSheet open={open} onClose={() => setOpen(false)} title={title}>
                <ul className="space-y-3">
                    {alerts.map((a) => (
                        <li key={a.id} className="rounded-2xl p-4" style={{ background: 'var(--surface-2)' }}>
                            {a.lines.length > 0 && (
                                <div className="mb-2 flex flex-wrap gap-1">
                                    {a.lines.map((l) => (
                                        <Link key={l} href={`/bizkaibus/lines/${l}`} onClick={() => setOpen(false)}>
                                            <BusChip line={l} size="sm" />
                                        </Link>
                                    ))}
                                </div>
                            )}
                            <p className="whitespace-pre-line text-sm leading-5" style={{ color: 'var(--ink)' }}>{a.description}</p>
                        </li>
                    ))}
                </ul>
            </BottomSheet>
        </>
    );
}

/* ───────── Tarjeta de parada con el próximo bus en directo ───────── */
export function StopLink({ stop, meters, children }: { stop: CatalogStop; meters?: number; children?: React.ReactNode }) {
    return (
        <motion.div layout="position" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={SPRING}>
            <Link href={`/bizkaibus/stop/${stop.code}`} className="bt-card bt-press block p-3.5" prefetch>
                <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                        <h3 className="truncate text-[16px] font-bold tracking-[-0.01em]" style={{ color: 'var(--ink)' }}>{stop.name}</h3>
                        <p className="truncate text-xs" style={{ color: 'var(--ink-2)' }}>
                            {titleCase(stop.municipality)} · {stop.code}
                            {typeof meters === 'number' && ` · ${meters < 1000 ? `${Math.round(meters / 10) * 10} m` : `${(meters / 1000).toFixed(1).replace('.', ',')} km`}`}
                        </p>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0" style={{ color: 'var(--ink-2)' }} aria-hidden />
                </div>
                {children}
            </Link>
        </motion.div>
    );
}
