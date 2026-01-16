'use client';

import { Search, Loader2, Train, Bus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { searchStops, SearchResult } from '@/lib/shared/stopSearch';
import { useLastSearch } from '@/hooks/useLastSearch';

export function StopSearch() {
    const router = useRouter();
    const { lastSearch: lastTerm, saveSearch: saveTerm } = useLastSearch<string>('general_stop');
    const [term, setTerm] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Pre-fill from last search
    useEffect(() => {
        if (lastTerm && term === '') {
            setTerm(lastTerm);
        }
    }, [lastTerm]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (term.length >= 2) {
                setIsLoading(true);
                const data = await searchStops(term);
                setResults(data);
                setIsOpen(true);
                setIsLoading(false);
            } else {
                setResults([]);
                setIsOpen(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [term]);

    const handleSelect = (stop: SearchResult) => {
        saveTerm(term);
        setTerm('');
        setIsOpen(false);
        setResults([]);
        router.push(`/station/${stop.id}?agency=${stop.agency}`);
    };

    return (
        <div className="relative w-full">
            <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                <input
                    type="text"
                    placeholder="Buscar parada..."
                    className="w-full h-12 pl-11 pr-4 rounded-xl bg-slate-100 border border-transparent 
                              focus:border-slate-300 focus:ring-1 focus:ring-slate-300 focus:bg-white
                              outline-none transition-all placeholder:text-slate-400 text-base font-medium
                              text-slate-900"
                    style={{ fontSize: 16 }}
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    onFocus={() => term.length >= 2 && setIsOpen(true)}
                />
                {isLoading && (
                    <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 animate-spin" />
                )}
            </div>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <button
                        className="fixed inset-0 z-40 bg-transparent w-full h-full cursor-default"
                        onClick={() => {
                            setIsOpen(false);
                            setTerm('');
                            setResults([]);
                        }}
                        aria-label="Cerrar búsqueda"
                    />

                    {/* Dropdown */}
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl 
                                  shadow-lg z-50 overflow-hidden max-h-[70vh] overflow-y-auto">
                        {results.length === 0 && !isLoading && (
                            <div className="text-center py-8 text-slate-500">
                                <p className="text-sm">No se encontraron paradas</p>
                            </div>
                        )}

                        {results.map((stop) => (
                            <button
                                key={`${stop.id}_${stop.agency}`}
                                onClick={() => handleSelect(stop)}
                                className="w-full text-left px-4 py-3 border-b border-slate-100 last:border-0 
                                       hover:bg-slate-50 active:bg-slate-100 transition-colors 
                                       flex items-center gap-3"
                            >
                                <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0
                                           bg-orange-100"
                                    style={{ backgroundColor: stop.agency === 'metro' ? '#fed7aa' : '#fee2e2' }}>
                                    {stop.agency === 'metro' ? (
                                        <Train className="w-4 h-4 text-orange-600" />
                                    ) : (
                                        <Bus className="w-4 h-4 text-red-600" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-slate-900 text-base">{stop.name}</div>
                                    <div className="text-xs text-slate-400 uppercase tracking-wide mt-0.5 font-medium">
                                        {stop.agency === 'metro' ? 'Metro Bilbao' : 'Bilbobus'}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
