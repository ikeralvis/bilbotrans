'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { ArrowLeft, ChevronRight, Search, X } from 'lucide-react';
import { LINES, searchLines } from '@/lib/bizkaibus/catalog';
import { useBizkaibusAlerts } from '@/lib/bizkaibus/hooks';
import { SPRING, StateCard } from '@/components/metro/parts';
import { BusChip } from './ui';
import { NetworkBadge } from '@/components/shared/brand';

/** Lista de las 105 líneas con buscador por número o por municipios ("Mungia", "Balmaseda"…). */
export function BizkaibusLinesView() {
    const router = useRouter();
    const [q, setQ] = useState('');
    const { data } = useBizkaibusAlerts();
    const results = useMemo(() => (q.trim() ? searchLines(q, 60) : LINES), [q]);
    const withAlert = useMemo(() => new Set((data?.alerts ?? []).flatMap((a) => a.lines)), [data]);

    return (
        <div className="min-h-dvh pb-[max(2rem,env(safe-area-inset-bottom))]" style={{ background: 'var(--bg)' }}>
            <header className="bt-glass sticky top-0 z-20 border-b" style={{ borderColor: 'var(--hairline)' }}>
                <div className="mx-auto max-w-2xl px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
                    <div className="flex items-center gap-2">
                        <button onClick={() => (window.history.length > 1 ? router.back() : router.push('/bizkaibus'))} aria-label="Volver" className="bt-press grid h-11 w-11 place-items-center rounded-full">
                            <ArrowLeft className="h-5 w-5" style={{ color: 'var(--ink)' }} />
                        </button>
                        <h1 className="flex-1 text-[20px] font-bold tracking-[-0.01em]" style={{ color: 'var(--ink)' }}>Líneas</h1>
                        <NetworkBadge network="bizkaibus" />
                        <span className="bt-num pr-2 text-sm" style={{ color: 'var(--ink-2)' }}>{results.length}</span>
                    </div>
                    <div className="mt-2 flex min-h-12 items-center gap-2 rounded-[14px] px-3.5" style={{ background: 'var(--surface-2)' }}>
                        <Search className="h-4 w-4 shrink-0" style={{ color: 'var(--ink-2)' }} aria-hidden />
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Línea o municipio: A3527, Mungia…"
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

            <main className="mx-auto max-w-2xl px-4 pt-4">
                {results.length === 0 ? (
                    <StateCard icon={<Search className="h-6 w-6" style={{ color: 'var(--ink-2)' }} />} title="Ninguna línea coincide" message="Prueba con el número de la línea o con un municipio de su recorrido." />
                ) : (
                    <motion.ul initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={SPRING} className="bt-card divide-y p-1.5" style={{ borderColor: 'var(--hairline)' }}>
                        {results.map((l) => (
                            <li key={l.code} style={{ borderColor: 'var(--hairline)' }}>
                                <Link href={`/bizkaibus/lines/${l.code}`} className="bt-press flex min-h-14 items-center gap-3 rounded-xl px-3 py-2 hover:bg-[var(--surface-2)]">
                                    <BusChip line={l.code} size="lg" />
                                    <span className="min-w-0 flex-1 truncate text-[15px] font-medium" style={{ color: 'var(--ink)' }}>{l.name}</span>
                                    {withAlert.has(l.code) && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: 'var(--warn)' }} role="img" aria-label="Con aviso" />}
                                    <ChevronRight className="h-4 w-4 shrink-0" style={{ color: 'var(--ink-2)' }} aria-hidden />
                                </Link>
                            </li>
                        ))}
                    </motion.ul>
                )}
            </main>
        </div>
    );
}
