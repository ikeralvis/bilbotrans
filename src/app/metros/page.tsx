'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { MetroMap } from '@/components/MetroMap';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export default function MetroMapPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-slate-100 pb-24">
            {/* Header */}
            <header className="bg-white border-b border-slate-100 sticky top-0 z-40">
                <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.back()}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-600" />
                        </button>
                        <h1 className="text-lg font-bold text-slate-900">🗺️ Mapa del Metro</h1>
                    </div>
                    <LanguageSwitcher />
                </div>
            </header>

            {/* Content */}
            <div className="max-w-2xl mx-auto px-4 py-6">
                <MetroMap />

                {/* Legend */}
                <div className="mt-8 space-y-4">
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <h2 className="font-bold text-slate-900 mb-3">Leyenda</h2>
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <div className="w-4 h-4 rounded-full bg-orange-500" />
                                <span className="text-sm text-slate-700">Línea 1 (L1)</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-4 h-4 rounded-full bg-green-600" />
                                <span className="text-sm text-slate-700">Línea 2 (L2)</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-4 h-4 rounded-full bg-blue-600" />
                                <span className="text-sm text-slate-700">Línea 3 (L3)</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-blue-500" />
                                <span className="text-sm text-slate-700">Tu ubicación</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
                        <p className="text-sm text-blue-900">
                            <strong>💡 Consejo:</strong> Pulsa el botón "Mi ubicación" para ver qué estación está más cerca de ti.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
