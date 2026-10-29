'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { ArrowLeft, ChevronRight, Search, X } from 'lucide-react';
import { searchBbLines } from '@/lib/bilbobus/catalog';
import { SPRING, StateCard } from '@/components/metro/parts';
import { BbChip, titleCase } from './BbUi';
import { NetworkBadge } from '@/components/shared/brand';

function LineRow({ code, name }: { code: string; name: string }) {
    return (
        <li>
            <Link href={`/bilbobus/lines/${code}`} className="bt-press flex min-h-14 items-center gap-3 rounded-xl px-3 py-2 hover:bg-[var(--surface-2)]">
                <BbChip line={code} size="lg" />
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium" style={{ color: 'var(--ink)' }}>{titleCase(name)}</span>
                <ChevronRight className="h-4 w-4 shrink-0" style={{ color: 'var(--ink-2)' }} aria-hidden />
            </Link>
        </li>
    );
}

/** Líneas regulares y, aparte, refuerzos (E*), nocturnos (G*) y bus turístico. */
export function BbLinesView() {
    const router = useRouter();
    const [q, setQ] = useState('');
    const results = useMemo(() => searchBbLines(q, 80), [q]);
    const regular = results.filter((l) => !l.special);
    const special = results.filter((l) => l.special);

    return (
        <div className="min-h-dvh pb-[max(2rem,env(safe-area-inset-bottom))]" style={{ background: 'var(--bg)' }}>
            <header className="bt-glass sticky top-0 z-20 border-b" style={{ borderColor: 'var(--hairline)' }}>
                <div className="mx-auto max-w-2xl px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
                    <div className="flex items-center gap-2">
                        <button onClick={() => (window.history.length > 1 ? router.back() : router.push('/bilbobus'))} aria-label="Volver" className="bt-press grid h-11 w-11 place-items-center rounded-full">
                            <ArrowLeft className="h-5 w-5" style={{ color: 'var(--ink)' }} />
                        </button>
                        <h1 className="flex-1 text-[20px] font-bold tracking-[-0.01em]" style={{ color: 'var(--ink)' }}>Líneas de Bilbobus</h1>
                        <NetworkBadge network="bilbobus" />
                        <span className="bt-num pr-2 text-sm" style={{ color: 'var(--ink-2)' }}>{results.length}</span>
                    </div>
                    <div className="mt-2 flex min-h-12 items-center gap-2 rounded-[14px] px-3.5" style={{ background: 'var(--surface-2)' }}>
                        <Search className="h-4 w-4 shrink-0" style={{ color: 'var(--ink-2)' }} aria-hidden />
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Línea o barrio: 10, A1, Otxarkoaga…"
                            className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-[var(--ink-2)]"
                            style={{ color: 'var(--ink)' }}
                            autoComplete="off"
                            spellCheck={false}
                            aria-label="Buscar línea"
                        />
                        {q && (
                            <button onClick={() => setQ('')} aria-label="Borrar" className="bt-press grid h-9 w-9 place-items-center">
                                <X className="h-4 w-4" style={{ color: 'var(--ink-2)' }} />
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-2xl space-y-4 px-4 pt-4">
                {results.length === 0 ? (
                    <StateCard icon={<Search className="h-6 w-6" style={{ color: 'var(--ink-2)' }} />} title="Ninguna línea coincide" message="Prueba con el número de la línea o con un barrio de su recorrido." />
                ) : (
                    <>
                        {regular.length > 0 && (
                            <motion.ul initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={SPRING} className="bt-card p-1.5" aria-label="Líneas regulares">
                                {regular.map((l) => <LineRow key={l.code} code={l.code} name={l.name} />)}
                            </motion.ul>
                        )}
                        {special.length > 0 && (
                            <section className="space-y-2" aria-label="Refuerzos, nocturnos y turístico">
                                <h2 className="px-1 text-[13px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--ink-2)' }}>Refuerzos, nocturnos y turístico</h2>
                                <motion.ul initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={SPRING} className="bt-card p-1.5">
                                    {special.map((l) => <LineRow key={l.code} code={l.code} name={l.name} />)}
                                </motion.ul>
                            </section>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
