'use client';

import { useState, useCallback, useEffect } from 'react';
import { searchBizkaibusStops, type BizkaibusStop } from '@/lib/bizkaibus/api';
import { MapPin, Loader2, X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useRouter } from 'next/navigation';

interface BizkaibusStopSearchProps {
    readonly onSelectStop?: (stop: BizkaibusStop) => void;
}

export default function BizkaibusStopSearch({ onSelectStop }: BizkaibusStopSearchProps) {
    const { language } = useLanguage();
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<BizkaibusStop[]>([]);
    const [loading, setLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);

    const searchStops = useCallback(async (searchQuery: string) => {
        if (searchQuery.length < 2) {
            setResults([]);
            setShowResults(false);
            return;
        }

        setLoading(true);
        try {
            const stops = await searchBizkaibusStops(searchQuery, 20);
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
            searchStops(query);
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [query, searchStops]);

    const handleSelectStop = (stop: BizkaibusStop) => {
        // Clear search state first
        setQuery('');
        setShowResults(false);
        setResults([]);
        
        // Then navigate or callback
        if (onSelectStop) {
            onSelectStop(stop);
        } else {
            router.push(`/bizkaibus/stop/${stop.id}`);
        }
    };

    const clearSearch = () => {
        setQuery('');
        setResults([]);
        setShowResults(false);
    };

    return (
        <div className="relative">
            {/* Search Input */}
            <div className="relative mb-4">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => query.length >= 2 && setShowResults(true)}
                    placeholder={
                        language === 'es'
                            ? 'Nombre o número de parada...'
                            : 'Geltokiaren izena edo zenbakia...'
                    }
                    className="w-full py-4 px-5 rounded-2xl bg-slate-100 border-0 focus:ring-2 focus:ring-green-300 outline-none transition-all text-slate-900 placeholder:text-slate-400 font-medium"
                />
                {query && !loading && (
                    <button
                        onClick={clearSearch}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                )}
                {loading && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-5 h-5 text-green-600 animate-spin" />
                    </div>
                )}
            </div>

            {/* Search Button */}
            <button
                onClick={() => {
                    if (query.length >= 2 && results.length > 0) {
                        handleSelectStop(results[0]);
                    }
                }}
                className="w-full py-4 px-6 rounded-2xl font-semibold text-white transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
                style={{ backgroundColor: '#22533d' }}
            >
                {language === 'es' ? 'Buscar parada' : 'Bilatu geltokia'}
            </button>

            {/* Search Results */}
            {showResults && results.length > 0 && (
                <div className="absolute top-[68px] left-0 right-0 mt-2 bg-white rounded-2xl shadow-lg border border-slate-200 max-h-[400px] overflow-y-auto z-50 animate-slideUp">
                    {results.map((stop) => (
                        <button
                            key={stop.id}
                            onClick={() => handleSelectStop(stop)}
                            className="w-full text-left px-4 py-3 hover:bg-green-50 transition-colors border-b border-slate-100 last:border-b-0 first:rounded-t-2xl last:rounded-b-2xl"
                        >
                            <div className="flex items-start gap-3">
                                <div className="flex items-center justify-center w-10 h-10 rounded-xl text-white shrink-0 mt-0.5 font-bold text-xs" style={{ backgroundColor: '#22533d' }}>
                                    {stop.id.slice(-4)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-slate-900 text-sm">
                                        {stop.name}
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                                        <MapPin className="w-3 h-3" />
                                        <span>{stop.municipality}</span>
                                    </div>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* No Results */}
            {showResults && !loading && query.length >= 2 && results.length === 0 && (
                <div className="absolute top-[68px] left-0 right-0 mt-2 bg-white rounded-2xl shadow-lg border border-slate-200 p-4 z-50 animate-slideUp">
                    <div className="text-center text-slate-500 text-sm">
                        {language === 'es'
                            ? 'No se encontraron paradas'
                            : 'Ez da geltokia aurkitu'}
                    </div>
                </div>
            )}
        </div>
    );
}
