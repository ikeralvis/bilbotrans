'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { LineDiagram } from '@/components/metro/LineDiagram';
import { SegmentedTabs } from '@/components/metro/ui';
import { LINE_IDS, LINE_NAME, isLineId, type LineId } from '@/lib/metro/lines';

export function LinesView() {
    const router = useRouter();
    const params = useSearchParams();
    const raw = (params.get('line') ?? 'L1').toUpperCase();
    const line: LineId = isLineId(raw) ? raw : 'L1';

    return (
        <div className="min-h-dvh pb-[max(2rem,env(safe-area-inset-bottom))]" style={{ background: 'var(--bg)' }}>
            <header className="bt-glass sticky top-0 z-20 border-b" style={{ borderColor: 'var(--hairline)' }}>
                <div className="mx-auto max-w-2xl px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
                    <div className="mb-3 flex items-center gap-2">
                        <button onClick={() => (window.history.length > 1 ? router.back() : router.push('/'))} aria-label="Volver" className="bt-press grid h-11 w-11 place-items-center rounded-full">
                            <ArrowLeft className="h-5 w-5" style={{ color: 'var(--ink)' }} />
                        </button>
                        <div className="min-w-0 flex-1">
                            <h1 className="text-[20px] font-bold leading-6 tracking-[-0.01em]" style={{ color: 'var(--ink)' }}>Líneas</h1>
                            <p className="truncate text-xs" style={{ color: 'var(--ink-2)' }}>{LINE_NAME[line]}</p>
                        </div>
                    </div>
                    <SegmentedTabs label="Línea" value={line} onChange={(l) => router.replace(`/metro/lines?line=${l}`, { scroll: false })} options={LINE_IDS.map((l) => ({ id: l, label: l }))} />
                </div>
            </header>
            <main className="mx-auto max-w-2xl space-y-3 px-4 pt-4">
                <LineDiagram key={line} line={line} />
                <p className="px-1 text-center text-xs" style={{ color: 'var(--ink-2)' }}>
                    Los trenes del diagrama son posiciones estimadas según el horario oficial. Los minutos indican el trayecto hasta la siguiente estación.
                </p>
            </main>
        </div>
    );
}
