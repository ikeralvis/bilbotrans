'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { searchStations, type CatalogStation } from '@/lib/metro/catalog';
import { LineChip } from './parts';

/* ───────── Selector de estación con búsqueda local ───────── */
export function StationField({
    label,
    value,
    onChange,
    className,
    action,
}: {
    label: string;
    value: CatalogStation | null;
    onChange: (s: CatalogStation | null) => void;
    className?: string;
    action?: ReactNode;
}) {
    const [q, setQ] = useState('');
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const results = useMemo(() => searchStations(q), [q]);

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
                <span className="w-14 shrink-0 text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--ink-2)' }}>
                    {label}
                </span>
                <input
                    className={`${className ?? ''} min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-[var(--ink-2)] ${value && !editing ? 'truncate font-semibold' : ''}`}
                    style={{ color: 'var(--ink)' }}
                    placeholder="Buscar estación"
                    value={editing ? q : (value?.name ?? '')}
                    onChange={(e) => { setQ(e.target.value); setOpen(true); }}
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
                    aria-label={label}
                />
                {value && action}
                {value && (
                    <button onClick={() => { onChange(null); setQ(''); }} aria-label={`Quitar ${label}`} className="bt-press grid h-11 w-11 place-items-center">
                        <X className="h-4 w-4" style={{ color: 'var(--ink-2)' }} />
                    </button>
                )}
                {!value && action}
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
                                    onClick={() => { onChange(s); setOpen(false); setQ(''); setEditing(false); (document.activeElement as HTMLElement | null)?.blur(); }}
                                    className="bt-press flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left hover:bg-[var(--surface-2)]"
                                >
                                    <span className="flex-1 truncate text-[16px] font-medium" style={{ color: 'var(--ink)' }}>{s.name}</span>
                                    <span className="flex gap-1">{s.lines.map((l) => <LineChip key={l} line={l} size="sm" />)}</span>
                                </button>
                            </li>
                        ))}
                    </motion.ul>
                )}
            </AnimatePresence>
        </div>
    );
}
