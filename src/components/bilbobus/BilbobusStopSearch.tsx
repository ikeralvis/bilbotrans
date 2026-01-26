'use client';

import { useState, useCallback, useEffect } from 'react';
import { searchBilbobusStops } from '@/lib/bilbobus/client-search';
import { BilbobusStop } from '@/lib/bilbobus/api';
import { MapPin, Loader2, X, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface BilbobusStopSearchProps {
    onSelectStop?: (stop: BilbobusStop) => void;
}

export default function BilbobusStopSearch({ onSelectStop }: BilbobusStopSearchProps) {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<BilbobusStop[]>([]);
    const [loading, setLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);

    const handleSearch = useCallback((searchQuery: string) => {
        if (searchQuery.length < 2) {
            setResults([]);
            setShowResults(false);
            return;
        }

        setLoading(true);
        try {
            const stops = searchBilbobusStops(searchQuery, 20);
            setResults(stops);
            setShowResults(true);
        } catch (error) {
            console.error('Error searching stops:', error);
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            handleSearch(query);
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [query, handleSearch]);

    const handleSelectStop = (stop: BilbobusStop) => {
        if (onSelectStop) {
            onSelectStop(stop);
        }
        router.push(`/bilbobus/stop/${stop.id}`);
        setQuery('');
        setShowResults(false);
    };

    return (
        <div className="relative w-full">
            {/* Search Input */}
            <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2 border border-slate-200 focus-within:border-red-400 focus-within:ring-2 focus-within:ring-red-200 transition-all">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar parada..."
                    className="flex-1 py-1 text-sm text-slate-900 placeholder-slate-400 bg-transparent border-none focus:outline-none"
                    style={{ fontSize: 16 }}
                />
                {query && (
                    <button
                        onClick={() => {
                            setQuery('');
                            setShowResults(false);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-600"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Results Dropdown */}
            {showResults && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-slate-200 shadow-lg z-50 max-h-96 overflow-y-auto">
                    {loading && (
                        <div className="p-6 text-center">
                            <Loader2 className="w-5 h-5 animate-spin text-red-600 mx-auto mb-2" />
                            <p className="text-sm text-slate-500">Buscando paradas...</p>
                        </div>
                    )}

                    {!loading && results.length === 0 && (
                        <div className="p-6 text-center">
                            <MapPin className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                            <p className="text-sm text-slate-500">No se encontraron paradas</p>
                        </div>
                    )}

                    {!loading && results.length > 0 && (
                        <ul className="divide-y divide-slate-100">
                            {results.map(stop => (
                                <li key={stop.id}>
                                    <button
                                        onClick={() => handleSelectStop(stop)}
                                        className="w-full text-left px-4 py-3 hover:bg-red-50 transition-colors active:bg-red-100"
                                    >
                                        <div className="flex items-start gap-3">
                                            <MapPin className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                                            <div className="min-w-0 flex-1">
                                                <div className="text-sm font-medium text-slate-900 truncate">
                                                    {stop.name}
                                                </div>
                                                <div className="text-xs text-slate-500 mt-0.5">
                                                    ID: {stop.id} • {stop.lines.length} líneas
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
