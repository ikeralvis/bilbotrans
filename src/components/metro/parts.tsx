'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ChevronDown, Moon, Accessibility, RefreshCw } from 'lucide-react';
import type { DirectionGroup, Train } from '@/lib/metro/direction';

export const SPRING = { type: 'spring', stiffness: 380, damping: 32, mass: 0.8 } as const;
const EASE = [0.22, 1, 0.36, 1] as const;

/* ───────── Línea ───────── */
export function LineChip({ line, size = 'md' }: { line: string; size?: 'sm' | 'md' }) {
    const key = line === 'L1' ? 'l1' : line === 'L3' ? 'l3' : 'l2';
    const dims = size === 'sm' ? 'h-5 min-w-5 px-1.5 text-[11px]' : 'h-6 min-w-6 px-2 text-xs';
    return (
        <span
            className={`inline-flex items-center justify-center rounded-full font-bold tracking-tight ${dims}`}
            style={{ background: `var(--${key})`, color: `var(--${key}-ink)` }}
            aria-label={`Línea ${line.replace('L', '')}`}
        >
            {line}
        </span>
    );
}

/* ───────── En vivo ───────── */
function useNow(intervalMs = 1000) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), intervalMs);
        return () => clearInterval(id);
    }, [intervalMs]);
    return now;
}

const STALE_AFTER_S = 60;

export function ageLabel(secs: number) {
    if (secs < 5) return 'ahora';
    if (secs < 60) return `hace ${secs} s`;
    return `hace ${Math.floor(secs / 60)} min`;
}

/** Estado del dato + botón de actualizar. Pasa a ámbar si tiene más de 60 s o falla la red. */
export function LiveBadge({ fetchedAt, stale, refreshing, onRefresh }: { fetchedAt?: number; stale?: boolean; refreshing?: boolean; onRefresh?: () => void }) {
    const now = useNow();
    const secs = fetchedAt ? Math.max(0, Math.round((now - fetchedAt) / 1000)) : null;
    const old = Boolean(stale) || (secs !== null && secs > STALE_AFTER_S);
    const label = stale ? 'Sin conexión' : old ? 'Desactualizado' : 'Actualizado';
    return (
        <button
            type="button"
            onClick={onRefresh}
            disabled={!onRefresh || refreshing}
            aria-label="Actualizar datos"
            className="bt-press inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium"
            style={{ background: old ? 'color-mix(in srgb, var(--warn) 18%, var(--surface))' : 'var(--surface-2)', color: old ? 'var(--ink)' : 'var(--ink-2)' }}
        >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} style={{ color: old ? 'var(--warn)' : 'var(--ink-2)' }} aria-hidden />
            {label}
            {secs !== null && <span className="bt-num opacity-70">· {ageLabel(secs)}</span>}
        </button>
    );
}

/* ───────── Minutos ───────── */
export function Minutes({ value, big = false, compact = false }: { value: number; big?: boolean; compact?: boolean }) {
    const reduce = useReducedMotion();
    const now = value <= 0;
    return (
        <span className="relative inline-flex items-baseline justify-end overflow-hidden" aria-live={big ? 'polite' : undefined}>
            <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                    key={value}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
                    transition={{ duration: 0.18, ease: EASE }}
                    className={`bt-num font-bold ${big ? 'text-[44px] leading-none' : compact ? 'text-[15px] leading-5' : 'text-xl leading-6'}`}
                    style={{ color: now ? 'var(--metro)' : 'var(--ink)' }}
                >
                    {now ? (big || compact ? 'Ya' : 'Ya aquí') : value}
                </motion.span>
            </AnimatePresence>
            {!now && (
                <span className={`ml-0.5 font-medium ${big ? 'text-base' : 'text-xs'}`} style={{ color: 'var(--ink-2)' }}>
                    min
                </span>
            )}
        </span>
    );
}

/* ───────── Fila de tren ───────── */
export function TrainRow({ train, featured }: { train: Train; featured?: boolean }) {
    const clock = train.time.slice(11, 16);
    return (
        <div
            className={`flex items-center gap-3 ${featured ? 'rounded-[14px] px-3.5 py-3.5' : 'px-3.5 py-2.5'}`}
            style={featured ? { background: 'var(--surface-2)' } : undefined}
        >
            <LineChip line={train.line} />
            <div className="min-w-0 flex-1">
                <p className={`truncate font-semibold ${featured ? 'text-lg' : 'text-[15px]'}`} style={{ color: 'var(--ink)' }}>
                    {train.destination}
                </p>
                <p className="bt-num text-xs" style={{ color: 'var(--ink-2)' }}>
                    {clock} · {train.wagons} coches
                </p>
            </div>
            <Minutes value={train.minutes} big={featured} />
        </div>
    );
}

/* ───────── Grupo por sentido ───────── */
export function DirectionSection({ group, index = 0, empty }: { group: DirectionGroup; index?: number; empty?: string }) {
    const [first, ...rest] = group.trains;
    return (
        <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING, delay: index * 0.05 }}
            className="bt-card p-2"
            aria-label={group.label}
        >
            <header className="flex items-center justify-between px-3.5 pb-2 pt-3">
                <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--ink-2)' }}>
                    <span style={{ color: 'var(--ink)' }}>{group.label}</span>
                </h2>
            </header>
            {first ? (
                <div className="flex flex-col">
                    <TrainRow train={first} featured />
                    <AnimatePresence initial={false}>
                        {rest.map((t, i) => (
                            <motion.div
                                key={`${t.line}-${t.destination}-${t.time}`}
                                layout="position"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.18, delay: i * 0.03 }}
                            >
                                <TrainRow train={t} />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            ) : (
                <div className="flex flex-col items-center gap-1 px-4 py-8 text-center">
                    <Moon className="h-6 w-6" style={{ color: 'var(--ink-2)' }} aria-hidden />
                    <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                        Sin trenes ahora
                    </p>
                    <p className="text-xs" style={{ color: 'var(--ink-2)' }}>
                        {empty ?? 'No hay próximas llegadas en este sentido.'}
                    </p>
                </div>
            )}
        </motion.section>
    );
}

/* ───────── Skeleton ───────── */
export function GroupSkeleton() {
    return (
        <div className="bt-card space-y-2 p-2" aria-hidden>
            <div className="bt-skeleton mx-3.5 mt-3 h-3 w-40" />
            <div className="bt-skeleton h-[76px]" />
            <div className="bt-skeleton h-12" />
            <div className="bt-skeleton h-12" />
        </div>
    );
}

/* ───────── Disclosure animado ───────── */
export function Disclosure({ title, icon, children, defaultOpen = false }: { title: string; icon?: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="bt-card overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                className="bt-press flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left"
            >
                {icon}
                <span className="flex-1 text-[15px] font-semibold" style={{ color: 'var(--ink)' }}>
                    {title}
                </span>
                <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="h-4 w-4" style={{ color: 'var(--ink-2)' }} aria-hidden />
                </motion.span>
            </button>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: EASE }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4">{children}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function Pill({ label, children }: { label: string; children: ReactNode }) {
    return (
        <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
            style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}
        >
            {children}
            {label}
        </span>
    );
}

export function ExitBadges({ elevator, nocturnal, accessible }: { elevator: boolean; nocturnal: boolean; accessible?: boolean }) {
    return (
        <span className="flex shrink-0 gap-1">
            {elevator && (
                <Pill label="Ascensor">
                    <Accessibility className="h-3 w-3" aria-hidden />
                </Pill>
            )}
            {nocturnal && (
                <Pill label="Nocturno">
                    <Moon className="h-3 w-3" aria-hidden />
                </Pill>
            )}
            {accessible && !elevator && (
                <Pill label="Accesible">
                    <Accessibility className="h-3 w-3" aria-hidden />
                </Pill>
            )}
        </span>
    );
}
