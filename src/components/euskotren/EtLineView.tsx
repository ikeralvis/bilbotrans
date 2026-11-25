'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getEtStation } from '@/lib/euskotren/catalog';
import { scopeOfLine } from '@/lib/euskotren/scopes';
import type { EtDirection, EtLine, EtLineDetail } from '@/lib/euskotren/types';
import { NetworkBadge } from '@/components/shared/brand';
import { titleCase } from '@/components/shared/bus';
import { EtChip } from './EtUi';

/** Recorrido de una línea por sentido, con enlace a cada estación. */
export function EtLineView({ line, detail }: { line: EtLine; detail: EtLineDetail | null }) {
    const router = useRouter();
    const scope = scopeOfLine(line.code);
    const dirs = (['0', '1'] as EtDirection[]).filter((d) => detail?.directions[d]?.length);
    const [dir, setDir] = useState<EtDirection>(dirs[0] ?? '0');
    const stations = (detail?.directions[dir] ?? []).map((id) => getEtStation(id)).filter((s) => s !== undefined);

    return (
        <div className={`${scope.theme} min-h-dvh pb-[max(2rem,env(safe-area-inset-bottom))]`} style={{ background: 'var(--bg)' }}>
            <header className="bt-glass sticky top-0 z-20 border-b" style={{ borderColor: 'var(--hairline)' }}>
                <div className="mx-auto flex max-w-2xl items-center gap-2 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
                    <button onClick={() => (window.history.length > 1 ? router.back() : router.push(scope.href))} aria-label="Volver" className="bt-press grid h-11 w-11 place-items-center rounded-full">
                        <ArrowLeft className="h-5 w-5" style={{ color: 'var(--ink)' }} />
                    </button>
                    <EtChip line={line.code} size="lg" />
                    <h1 className="min-w-0 flex-1 truncate text-[18px] font-bold tracking-[-0.01em]" style={{ color: 'var(--ink)' }}>{line.name}</h1>
                    <NetworkBadge network={scope.mark} />
                </div>
            </header>

            <main className="mx-auto max-w-2xl space-y-3 px-4 pt-4">
                {dirs.length > 1 && (
                    <div className="grid grid-cols-2 gap-1 rounded-2xl p-1" style={{ background: 'var(--surface-2)' }} role="tablist" aria-label="Sentido">
                        {dirs.map((d) => (
                            <button key={d} role="tab" aria-selected={dir === d} onClick={() => setDir(d)} className="bt-press min-h-11 rounded-xl px-3 text-sm font-semibold" style={{ background: dir === d ? 'var(--surface)' : 'transparent', color: dir === d ? 'var(--ink)' : 'var(--ink-2)' }}>
                                Hacia {titleCase(detail?.terminals[d] ?? '')}
                            </button>
                        ))}
                    </div>
                )}

                <ol className="bt-card p-1.5" aria-label="Estaciones">
                    {stations.map((s, i) => (
                        <li key={`${s.id}-${i}`}>
                            <Link href={`/euskotren/station/${s.id}`} className="bt-press flex min-h-12 items-center gap-3 rounded-xl px-3 hover:bg-[var(--surface-2)]">
                                <span className="relative grid w-4 place-items-center self-stretch" aria-hidden>
                                    <span className="absolute inset-y-0 w-0.5" style={{ background: line.color, top: i === 0 ? '50%' : 0, bottom: i === stations.length - 1 ? '50%' : 0 }} />
                                    <span className="relative h-3 w-3 rounded-full border-2" style={{ borderColor: line.color, background: 'var(--surface)' }} />
                                </span>
                                <span className="min-w-0 flex-1 truncate text-[15px] font-medium" style={{ color: 'var(--ink)' }}>{s.name}</span>
                                <span className="flex shrink-0 gap-1">
                                    {s.lines.filter((l) => l !== line.code).slice(0, 3).map((l) => <EtChip key={l} line={l} size="sm" />)}
                                </span>
                            </Link>
                        </li>
                    ))}
                </ol>
            </main>
        </div>
    );
}
