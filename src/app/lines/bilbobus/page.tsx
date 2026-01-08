
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, Bus, Loader2, ChevronRight } from 'lucide-react';
import { getAllBilbobusLines } from '@/app/actions';
import { BilbobusLine } from '@/lib/bilbobus/api';

export default function BilbobusLinesPage() {
    const router = useRouter();
    const [lines, setLines] = useState<BilbobusLine[]>([]);
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadLines = async () => {
            try {
                const data = await getAllBilbobusLines();
                setLines(data.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true })));
            } catch (error) {
                console.error('Error loading lines:', error);
            } finally {
                setIsLoading(false);
            }
        };
        loadLines();
    }, []);

    const filteredLines = lines.filter(line =>
        line.id.toLowerCase().includes(search.toLowerCase()) ||
        line.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-red-600 text-white shadow-md">
                <div className="max-w-2xl mx-auto px-4 py-4">
                    <div className="flex items-center gap-4 mb-4">
                        <button
                            onClick={() => router.back()}
                            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h1 className="text-xl font-bold text-white">Líneas de Bilbobus</h1>
                    </div>

                    <div className="relative">
                        <div className="flex items-center gap-3 bg-white/20 rounded-xl px-4 py-1 border border-white/20 focus-within:bg-white/30 transition-all">
                            <Search className="w-4 h-4 text-red-100" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar línea por número o nombre..."
                                className="flex-1 py-2 text-sm text-white placeholder-red-100/70 bg-transparent border-none focus:outline-none"
                                style={{ fontSize: 16 }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-2xl mx-auto px-4 py-6">
                {isLoading ? (
                    <div className="py-20 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-red-600 mx-auto mb-3" />
                        <p className="text-slate-500">Cargando líneas...</p>
                    </div>
                ) : filteredLines.length === 0 ? (
                    <div className="py-20 text-center">
                        <Bus className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">No se encontraron líneas</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-2">
                        {filteredLines.map(line => (
                            <button
                                key={line.id}
                                onClick={() => router.push(`/lines/bilbobus/${line.id}`)}
                                className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 hover:border-red-200 hover:bg-red-50/30 transition-all text-left shadow-sm active:scale-[0.99]"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-lg bg-red-600 flex items-center justify-center text-white font-black text-lg shadow-sm">
                                        {line.id}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-sm font-bold text-slate-900 truncate">
                                            {line.name}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-0.5">
                                            {line.stops.length} paradas
                                        </div>
                                    </div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-300" />
                            </button>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
