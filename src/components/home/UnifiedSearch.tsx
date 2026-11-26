'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ChevronRight, Search, X } from 'lucide-react';
import { MARKS, NetworkMark } from '@/components/shared/brand';
import { readableOn } from '@/components/shared/bus';
import type { SearchGroup, SearchHit } from '@/lib/search/unified';

interface Result { places: SearchGroup[]; lines: SearchHit[] }

const fetcher = (url: string) => fetch(url).then((r) => {
    if (!r.ok) throw new Error(String(r.status));
    return r.json() as Promise<Result>;
});

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

function useDebounced<T>(value: T, ms: number): T {
    const [v, setV] = useState(value);
    useEffect(() => {
        const id = setTimeout(() => setV(value), ms);
        return () => clearTimeout(id);
    }, [value, ms]);
    return v;
}

function LineTags({ lines }: { lines: string[] }) {
    if (!lines.length) return null;
    const shown = lines.slice(0, 4);
    return (
        <span className="flex shrink-0 items-center gap-1" aria-label={`Líneas ${lines.join(', ')}`}>
            {shown.map((l) => (
                <span key={l} className="bt-num rounded-[5px] px-1.5 py-px text-[11px] font-semibold" style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }} aria-hidden>
                    {l}
                </span>
            ))}
            {lines.length > shown.length && <span className="text-[11px] font-medium" style={{ color: 'var(--ink-2)' }} aria-hidden>+{lines.length - shown.length}</span>}
        </span>
    );
}

/** Dentro de un lugar, cada parada se distingue por su propio nombre ("Moyua Plaza 6") si no es el del lugar. */
function HitRow({ hit, place }: { hit: SearchHit; place: string }) {
    const own = hit.name !== place ? hit.name : null;
    return (
        <li>
            <Link href={hit.href} className="bt-press flex min-h-12 items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-[var(--surface-2)]">
                <NetworkMark network={hit.network} size={28} />
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium leading-5" style={{ color: 'var(--ink)' }}>
                        {MARKS[hit.network].label}
                    </span>
                    <span className="block truncate text-[12px] leading-4" style={{ color: 'var(--ink-2)' }}>{own ? `${own} · ${hit.detail}` : hit.detail}</span>
                </span>
                <LineTags lines={hit.lines} />
                <ChevronRight className="h-4 w-4 shrink-0" style={{ color: 'var(--ink-2)' }} aria-hidden />
            </Link>
        </li>
    );
}

/**
 * Buscador único: escribe un sitio ("Moyua", "Termibus") y aparecen juntas la estación de Metro y las paradas
 * de Bilbobus, Bizkaibus y Euskotren de ese lugar; escribe un código ("A3247", "56") y aparece la línea.
 */
export function UnifiedSearch() {
    const reduce = useReducedMotion();
    const [q, setQ] = useState('');
    const input = useRef<HTMLInputElement>(null);
    const statusId = useId();
    const debounced = useDebounced(q.trim(), 140);
    const active = debounced.length >= 2;
    const { data, error, isLoading } = useSWR<Result>(active ? `/api/search?q=${encodeURIComponent(debounced)}` : null, fetcher, {
        keepPreviousData: true,
        revalidateOnFocus: false,
        dedupingInterval: 60_000,
    });

    const open = q.trim().length >= 2;
    const empty = data && !data.places.length && !data.lines.length;
    const status = !open ? '' : error ? 'No se pudo buscar' : isLoading && !data ? 'Buscando…' : empty ? 'Sin resultados' : data ? `${data.places.length} lugares, ${data.lines.length} líneas` : '';

    return (
        <section aria-label="Buscar en todas las redes" className="space-y-2">
            <motion.div
                className="bt-card flex min-h-14 items-center gap-3 px-4 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2"
                style={{ outlineColor: 'var(--accent)' }}
                whileTap={reduce ? undefined : { scale: 0.985 }}
                onClick={() => input.current?.focus()}
            >
                <Search className="h-5 w-5 shrink-0" strokeWidth={2.25} style={{ color: 'var(--ink-2)' }} aria-hidden />
                <input
                    ref={input}
                    type="search"
                    enterKeyHint="search"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => e.key === 'Escape' && setQ('')}
                    placeholder="Estación, parada o línea"
                    aria-label="Buscar estación, parada o línea en todas las redes"
                    aria-describedby={statusId}
                    className="min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-[var(--ink-2)] [&::-webkit-search-cancel-button]:hidden"
                    style={{ color: 'var(--ink)' }}
                    autoComplete="off"
                    spellCheck={false}
                />
                <AnimatePresence>
                    {q && (
                        <motion.button
                            type="button"
                            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.12 } }}
                            onClick={(e) => {
                                e.stopPropagation();
                                setQ('');
                                input.current?.focus();
                            }}
                            aria-label="Borrar búsqueda"
                            className="-mr-2 grid h-11 w-11 shrink-0 place-items-center rounded-full"
                        >
                            <span className="grid h-6 w-6 place-items-center rounded-full" style={{ background: 'var(--surface-2)' }}>
                                <X className="h-3.5 w-3.5" strokeWidth={2.5} style={{ color: 'var(--ink-2)' }} aria-hidden />
                            </span>
                        </motion.button>
                    )}
                </AnimatePresence>
            </motion.div>

            <p id={statusId} className="sr-only" role="status" aria-live="polite">{status}</p>

            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        key="results"
                        initial={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: reduce ? 0 : -4, transition: { duration: 0.14 } }}
                        transition={{ duration: 0.22, ease: EASE_OUT }}
                        className="space-y-2"
                    >
                        {data?.lines.length ? (
                            <div className="flex flex-wrap gap-2 px-1" aria-label="Líneas">
                                {data.lines.map((l) => (
                                    <Link
                                        key={`${l.network}-${l.id}`}
                                        href={l.href}
                                        className="bt-press inline-flex min-h-11 max-w-full items-center gap-2 rounded-full py-1 pl-1 pr-3.5"
                                        style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-card)' }}
                                    >
                                        <span
                                            className="bt-num grid h-8 min-w-8 place-items-center rounded-full px-2 text-[13px] font-bold"
                                            style={{ background: l.color ?? MARKS[l.network].color, color: readableOn(l.color ?? MARKS[l.network].color) }}
                                        >
                                            {l.id}
                                        </span>
                                        <span className="truncate text-[13px] font-medium" style={{ color: 'var(--ink)' }}>{l.detail}</span>
                                    </Link>
                                ))}
                            </div>
                        ) : null}

                        {error ? (
                            <p className="bt-card px-4 py-4 text-sm" style={{ color: 'var(--ink-2)' }}>No se pudo buscar. Revisa la conexión.</p>
                        ) : !data ? (
                            <div className="bt-card space-y-2 p-3" aria-hidden>
                                {[0, 1].map((i) => <div key={i} className="bt-skeleton h-12 rounded-xl" />)}
                            </div>
                        ) : empty ? (
                            <p className="bt-card px-4 py-4 text-sm" style={{ color: 'var(--ink-2)' }}>
                                Nada con «{debounced}». Prueba con otra parte del nombre o con el código de la parada.
                            </p>
                        ) : (
                            <ul className="space-y-2">
                                {data.places.map((g, i) => (
                                    <motion.li
                                        key={g.key}
                                        className="bt-card p-1.5"
                                        initial={reduce ? false : { opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.24, ease: EASE_OUT, delay: Math.min(i, 5) * 0.03 }}
                                    >
                                        <p className="truncate px-2 pb-0.5 pt-1.5 text-[16px] font-bold tracking-[-0.01em]" style={{ color: 'var(--ink)' }}>{g.name}</p>
                                        <ul>
                                            {g.hits.map((h) => <HitRow key={`${h.network}-${h.id}`} hit={h} place={g.name} />)}
                                        </ul>
                                    </motion.li>
                                ))}
                            </ul>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
}
