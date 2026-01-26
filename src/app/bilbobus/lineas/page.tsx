'use client';

import { useState, useMemo } from 'react';
import { ArrowLeft, Bus, Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { searchBilbobusLines } from '@/lib/bilbobus/client-search';
import bilbobusData from '@/data/bilbobus/data.json';

export default function BilbobusLineasPage() {
    const router = useRouter();
    const [search, setSearch] = useState('');

    // Get all lines sorted by ID
    const allLines = useMemo(() => {
        return Object.values(bilbobusData.lines)
            .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
    }, []);

    // Filter lines based on search
    const filteredLines = useMemo(() => {
        if (search.length < 1) return allLines;
        return searchBilbobusLines(search, 100);
    }, [search, allLines]);

    return (
        <div className="min-h-screen bg-slate-50 pb-24">
            {/* Red Header with rounded bottom */}
            <div className="relative" style={{ backgroundColor: '#dc2626', borderBottomLeftRadius: '30px', borderBottomRightRadius: '30px' }}>
                {/* Back button and title */}
                <div className="px-4 pt-4 pb-8">
                    <div className="max-w-lg mx-auto">
                        <div className="flex items-center gap-4 mb-6">
                            <button
                                onClick={() => router.back()}
                                className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5 text-white" />
                            </button>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                                    <Bus className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-white">Todas las Líneas</h1>
                                    <p className="text-red-100 text-sm">{allLines.length} líneas disponibles</p>
                                </div>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-lg">
                            <Search className="w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar línea por número o nombre..."
                                className="flex-1 text-base text-slate-900 bg-transparent border-none focus:outline-none placeholder:text-slate-400"
                                style={{ fontSize: 16 }}
                            />
                            {search && (
                                <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600">
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Lines Grid */}
            <main className="max-w-lg mx-auto px-4 py-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {filteredLines.map(line => {
                        // Get route name from first IDA variant or first variant
                        const firstVariant = (line as any).variants?.find((v: any) => v.direction === 'IDA') || (line as any).variants?.[0];
                        const routeName = firstVariant?.name?.split(' - ')[0] || line.name;
                        
                        return (
                            <button
                                key={line.id}
                                onClick={() => router.push(`/bilbobus/lineas/${line.id}`)}
                                className="bg-white rounded-2xl p-4 border border-slate-100 hover:border-red-300 hover:shadow-lg transition-all active:scale-[0.98] group"
                            >
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-12 h-12 rounded-xl bg-red-600 text-white flex items-center justify-center font-black text-lg group-hover:scale-110 transition-transform">
                                        {line.id}
                                    </div>
                                    <p className="text-xs text-slate-600 text-center line-clamp-2 font-medium leading-tight">
                                        {routeName}
                                    </p>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {filteredLines.length === 0 && (
                    <div className="text-center py-16">
                        <Bus className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                        <p className="text-slate-500 font-medium">No se encontraron líneas</p>
                        <p className="text-slate-400 text-sm mt-1">Intenta con otro término de búsqueda</p>
                    </div>
                )}
            </main>
        </div>
    );
}
