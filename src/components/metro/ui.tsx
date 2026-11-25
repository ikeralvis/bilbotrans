'use client';

import { useEffect, useId, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';

const SHEET_SPRING = { type: 'spring', stiffness: 320, damping: 34 } as const;

/* ───────── BottomSheet ─────────
 * Arrastrable hacia abajo para cerrar, cierra con Esc o tocando el fondo. Salida animada. */
export function BottomSheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
    const reduce = useReducedMotion();
    const titleId = useId();

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prev;
        };
    }, [open, onClose]);

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby={titleId}>
                    <motion.div
                        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        onClick={onClose}
                    />
                    <motion.div
                        className="bt-card absolute inset-x-0 bottom-0 mx-auto flex max-h-[85dvh] max-w-2xl flex-col rounded-b-none rounded-t-[28px]"
                        initial={reduce ? { opacity: 0 } : { y: '100%' }}
                        animate={reduce ? { opacity: 1 } : { y: 0 }}
                        exit={reduce ? { opacity: 0 } : { y: '100%', transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] } }}
                        transition={SHEET_SPRING}
                        drag={reduce ? false : 'y'}
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={{ top: 0, bottom: 0.6 }}
                        onDragEnd={(_, info) => {
                            if (info.offset.y > 100 || info.velocity.y > 500) onClose();
                        }}
                    >
                        <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full" style={{ background: 'var(--hairline)' }} aria-hidden />
                        <div className="flex items-center gap-2 px-5 pb-2 pt-3">
                            <h2 id={titleId} className="flex-1 text-[20px] font-bold tracking-[-0.01em]" style={{ color: 'var(--ink)' }}>
                                {title}
                            </h2>
                            <button onClick={onClose} aria-label="Cerrar" className="bt-press grid h-11 w-11 place-items-center rounded-full" style={{ background: 'var(--surface-2)' }}>
                                <X className="h-4 w-4" style={{ color: 'var(--ink-2)' }} />
                            </button>
                        </div>
                        <div className="overflow-y-auto overscroll-contain px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">{children}</div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

/* ───────── SegmentedTabs ─────────
 * Control estilo iOS. El indicador es un único elemento que se desplaza con una transición CSS (interrumpible y sin
 * medir el layout: un `layoutId` se queda desplazado si algo cambia de altura por encima). Radio 10 = 14 − 4 de relleno. */
export function SegmentedTabs<T extends string>({
    value,
    onChange,
    options,
    label,
}: {
    value: T;
    onChange: (v: T) => void;
    options: Array<{ id: T; label: string }>;
    label: string;
}) {
    const index = Math.max(0, options.findIndex((o) => o.id === value));
    return (
        <div role="tablist" aria-label={label} className="relative flex rounded-[14px] p-1" style={{ background: 'var(--surface-2)' }}>
            <span
                aria-hidden
                className="pointer-events-none absolute bottom-1 left-1 top-1 rounded-[10px]"
                style={{
                    width: `calc((100% - 8px) / ${options.length})`,
                    transform: `translateX(${index * 100}%)`,
                    background: 'var(--surface)',
                    boxShadow: '0 0 0 1px var(--card-ring), 0 1px 3px rgb(0 0 0 / 0.12)',
                    transition: 'transform 240ms var(--ease-out)',
                }}
            />
            {options.map((o) => {
                const active = o.id === value;
                return (
                    <button
                        key={o.id}
                        role="tab"
                        aria-selected={active}
                        onClick={() => onChange(o.id)}
                        className="bt-press relative min-h-10 flex-1 rounded-[10px] px-3 text-[14px] font-semibold"
                        style={{ color: active ? 'var(--ink)' : 'var(--ink-2)', transition: 'color 160ms var(--ease-out)' }}
                    >
                        {o.label}
                    </button>
                );
            })}
        </div>
    );
}

/* ───────── Tren decorativo ─────────
 * Tren de dos coches de perfil (dibujo propio): entra una vez desde la derecha y se queda parado en el andén. */
function TrainCar({ x, cab }: { x: number; cab: 'left' | 'right' | 'none' }) {
    const w = 196;
    const r = 12;
    const body =
        cab === 'left'
            ? `M${x + 26} 8H${x + w - r}a${r} ${r} 0 0 1 ${r} ${r}V52H${x}V30Q${x} 8 ${x + 26} 8Z`
            : cab === 'right'
              ? `M${x + r} 8H${x + w - 26}Q${x + w} 8 ${x + w} 30V52H${x}V${8 + r}a${r} ${r} 0 0 1 ${r} -${r}Z`
              : `M${x} 8H${x + w}V52H${x}Z`;
    const doors = [x + 40, x + 128];
    return (
        <g>
            <path d={body} fill="#e4e4ea" stroke="#c9c9d1" strokeWidth={1} />
            <rect x={x} y={40} width={w} height={4} fill="#d93e14" />
            {[x + 70, x + 100, x + 158].map((wx) => (
                <rect key={wx} x={wx} y={16} width={22} height={16} rx={3} fill="#2a2a31" />
            ))}
            {doors.map((dx) => (
                <g key={dx}>
                    <rect x={dx} y={13} width={24} height={39} rx={2} fill="#3a3a42" />
                    <rect x={dx + 3} y={16} width={7.5} height={18} rx={1.5} fill="#9fb3c4" />
                    <rect x={dx + 13.5} y={16} width={7.5} height={18} rx={1.5} fill="#9fb3c4" />
                </g>
            ))}
            {cab === 'left' && <path d={`M${x + 6} 30Q${x + 8} 16 ${x + 26} 15H${x + 32}V32H${x + 6}Z`} fill="#2a2a31" />}
            {cab === 'right' && <path d={`M${x + w - 6} 30Q${x + w - 8} 16 ${x + w - 26} 15H${x + w - 32}V32H${x + w - 6}Z`} fill="#2a2a31" />}
            {[x + 30, x + 58, x + w - 58, x + w - 30].map((cx) => (
                <circle key={cx} cx={cx} cy={56} r={6} fill="#2b2b31" />
            ))}
        </g>
    );
}

export function TrainStrip({ height = 64 }: { height?: number }) {
    const reduce = useReducedMotion();
    return (
        <div className="relative w-full overflow-hidden" style={{ height }} aria-hidden>
            <motion.svg
                viewBox="0 0 404 64"
                height={height}
                width={(height * 404) / 64}
                className="absolute bottom-0 left-4 max-w-none select-none"
                style={{ overflow: 'visible' }}
                initial={reduce ? { opacity: 0 } : { x: '60%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={reduce ? { duration: 0.2 } : { type: 'spring', stiffness: 70, damping: 20, mass: 1.1 }}
            >
                <TrainCar x={0} cab="left" />
                <rect x={196} y={24} width={12} height={24} fill="#c9c9d1" />
                <TrainCar x={208} cab="right" />
            </motion.svg>
            <div className="absolute inset-x-0 bottom-0 h-[3px]" style={{ background: '#8a8a93' }} />
        </div>
    );
}
