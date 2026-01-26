'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, Bus, X } from 'lucide-react';
import { searchBilbobusLines } from '@/lib/bilbobus/client-search';
import { BilbobusLine } from '@/lib/bilbobus/api';
import { useRouter } from 'next/navigation';

export default function BilbobusLineSearch() {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<BilbobusLine[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    const handleSearch = useCallback((searchQuery: string) => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        if (searchQuery.trim().length === 0) {
            setResults([]);
            setIsOpen(false);
            return;
        }

        debounceRef.current = setTimeout(() => {
            const searchResults = searchBilbobusLines(searchQuery, 15);
            setResults(searchResults);
            setIsOpen(searchResults.length > 0);
        }, 300);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setQuery(value);
        handleSearch(value);
    };

    const handleLineClick = (lineId: string) => {
        setQuery('');
        setResults([]);
        setIsOpen(false);
        router.push(`/bilbobus/lineas/${lineId}`);
    };

    const handleClear = () => {
        setQuery('');
        setResults([]);
        setIsOpen(false);
    };

    // Cerrar dropdown al hacer click fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={searchRef} className="relative w-full">
            <div className="relative">
                <input
                    type="text"
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => results.length > 0 && setIsOpen(true)}
                    placeholder="Buscar línea por número o nombre..."
                    className="w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-slate-900 placeholder-slate-400"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                {query && (
                    <button
                        onClick={handleClear}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X className="w-4 h-4 text-slate-400" />
                    </button>
                )}
            </div>

            {/* Dropdown de resultados */}
            {isOpen && results.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-lg max-h-96 overflow-y-auto">
                    {results.map(line => (
                        <button
                            key={line.id}
                            onClick={() => handleLineClick(line.id)}
                            className="w-full px-4 py-3 hover:bg-red-50 transition-colors flex items-center gap-3 border-b border-slate-100 last:border-b-0"
                        >
                            <div className="w-10 h-10 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                                {line.id}
                            </div>
                            <div className="flex-1 text-left min-w-0">
                                <p className="font-semibold text-slate-900 truncate">
                                    Línea {line.id}
                                </p>
                                <p className="text-sm text-slate-500 truncate">
                                    {line.name}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                    {line.variants.flatMap(v => v.stops).length} parada{line.variants.flatMap(v => v.stops).length === 1 ? '' : 's'}
                                </p>
                            </div>
                            <Bus className="w-5 h-5 text-red-600 shrink-0" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
