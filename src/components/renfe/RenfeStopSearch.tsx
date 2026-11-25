'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, MapPin, ChevronRight, Train } from 'lucide-react';
import { searchRenfeStops, RenfeStop } from '@/lib/renfe/api';

interface RenfeStopSearchProps {
    onSelectStop?: (stop: RenfeStop) => void;
    placeholder?: string;
    label?: string;
}

export default function RenfeStopSearch({ 
    onSelectStop, 
    placeholder = 'Ej: Abando, Zazpikalea...',
    label = 'BUSCAR ESTACIÓN'
}: RenfeStopSearchProps) {
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<RenfeStop[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.length >= 1) {
                setIsSearching(true);
                const res = await searchRenfeStops(query);
                setResults(res);
                setShowDropdown(true);
                setIsSearching(false);
            } else {
                setResults([]);
                setShowDropdown(false);
            }
        }, 200);
        return () => clearTimeout(timer);
    }, [query]);

    const handleSelect = (stop: RenfeStop) => {
        setQuery('');
        setShowDropdown(false);
        if (onSelectStop) {
            onSelectStop(stop);
        } else {
            router.push(`/metro/station/${stop.id}?agency=renfe`);
        }
    };

    const handleClear = () => {
        setQuery('');
        setResults([]);
        setShowDropdown(false);
        inputRef.current?.focus();
    };

    // Line color mapping for badges
    const getLineColor = (line: string): string => {
        const colors: Record<string, string> = {
            'C1': 'bg-purple-600',
            'C2': 'bg-green-600',
            'C3': 'bg-red-600',
            'C4': 'bg-amber-500',
        };
        return colors[line] || 'bg-slate-500';
    };

    return (
        <div className="space-y-2">
            <label className="block text-xs font-bold text-purple-700 uppercase tracking-wide">
                {label}
            </label>
            <div className="relative">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onFocus={() => results.length > 0 && setShowDropdown(true)}
                        placeholder={placeholder}
                        className="w-full pl-10 pr-10 py-3.5 rounded-2xl border-2 border-slate-200 text-slate-900 placeholder-slate-400 bg-slate-50 focus:outline-none focus:border-purple-500 focus:bg-white transition-all text-sm font-medium"
                        autoComplete="off"
                    />
                    {query && (
                        <button
                            onClick={handleClear}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-slate-200 hover:bg-slate-300 transition-colors"
                        >
                            <X className="w-3.5 h-3.5 text-slate-600" />
                        </button>
                    )}
                </div>

                {showDropdown && results.length > 0 && (
                    <>
                        <button
                            className="fixed inset-0 z-30 w-full h-full cursor-default"
                            onClick={() => setShowDropdown(false)}
                            aria-label="Cerrar sugerencias"
                        />
                        <div className="absolute left-0 right-0 top-full mt-2 bg-white border-2 border-slate-200 rounded-2xl shadow-2xl z-40 overflow-hidden max-h-72 overflow-y-auto">
                            {results.map((stop) => (
                                <button
                                    key={stop.id}
                                    onClick={() => handleSelect(stop)}
                                    className="w-full text-left px-4 py-3 hover:bg-purple-50 border-b border-slate-100 last:border-b-0 transition-colors group"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                                                <Train className="w-4 h-4 text-purple-600" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-sm font-bold text-slate-900 truncate">{stop.name}</div>
                                                <div className="flex gap-1 mt-1">
                                                    {stop.lines.map((line) => (
                                                        <span
                                                            key={line}
                                                            className={`${getLineColor(line)} text-white px-1.5 py-0.5 rounded text-[10px] font-bold`}
                                                        >
                                                            {line}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-purple-500 transition-colors flex-shrink-0" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </>
                )}

                {showDropdown && query.length >= 1 && results.length === 0 && !isSearching && (
                    <div className="absolute left-0 right-0 top-full mt-2 bg-white border-2 border-slate-200 rounded-2xl shadow-xl z-40 p-4 text-center">
                        <p className="text-sm text-slate-500">No se encontraron estaciones</p>
                    </div>
                )}
            </div>
        </div>
    );
}
