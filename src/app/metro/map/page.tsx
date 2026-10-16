'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, Info } from 'lucide-react';
import type { MapStatus } from '@/components/metro/MetroMapContent';

const MetroMapContent = dynamic(() => import('@/components/metro/MetroMapContent'), {
    ssr: false,
    loading: () => <div className="bt-skeleton h-full w-full" />,
});

const fmt = (d: string) => `${d.slice(6, 8)}/${d.slice(4, 6)}/${d.slice(0, 4)}`;

export default function MetroMapPage() {
    const router = useRouter();
    const [status, setStatus] = useState<MapStatus | null>(null);
    const onStatus = useCallback((s: MapStatus) => setStatus(s), []);

    return (
        <div className="fixed inset-0 flex flex-col bg-[var(--bg)]">
            <header className="bt-glass z-[1000] flex items-center gap-3 px-4 pb-3 pt-[max(env(safe-area-inset-top),12px)]">
                <button onClick={() => router.back()} aria-label="Volver" className="bt-press grid h-11 w-11 place-items-center rounded-full bg-[var(--surface-2)]">
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="min-w-0">
                    <h1 className="truncate text-lg font-bold leading-6 tracking-tight">Mapa del Metro</h1>
                    <p className="bt-num text-xs text-[var(--ink-2)]">
                        {status ? `${status.trains} ${status.trains === 1 ? 'tren' : 'trenes'} en circulación` : 'Calculando…'}
                    </p>
                </div>
            </header>

            <div className="relative flex-1">
                <MetroMapContent onStatus={onStatus} />

                <div className="pointer-events-none absolute inset-x-4 bottom-[max(env(safe-area-inset-bottom),16px)] z-[1000] flex justify-center">
                    <div className="bt-glass pointer-events-auto flex max-w-md items-start gap-2 rounded-2xl px-3 py-2 text-xs text-[var(--ink-2)] shadow-lg">
                        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                        <p>
                            {status && !status.feedValid
                                ? `El horario oficial descargado caducó el ${fmt(status.validTo)}; no se muestran trenes hasta actualizarlo.`
                                : 'Posición estimada según horario oficial, no en tiempo real. Pueden existir retrasos o incidencias.'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
