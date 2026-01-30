'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRightLeft, Star, Train, RefreshCw, Search, MapPin, X, ChevronRight, AlertTriangle } from 'lucide-react';
import { searchRenfeStops, RenfeStop } from '@/lib/renfe/api';
import RenfeIncidents from '@/components/renfe/RenfeIncidents';
import { useFavorites } from '@/context/FavoritesContext';
import { useLastSearch } from '@/hooks/useLastSearch';
import { useLanguage } from '@/context/LanguageContext';

export function RenfeSection() {
    const router = useRouter();
    const { language } = useLanguage();
    const { favorites } = useFavorites();
    const { lastSearch: lastRenfeSearch, saveSearch: saveRenfeSearch } = useLastSearch<{ origin: RenfeStop, dest: RenfeStop }>('renfe');

    const [refreshing, setRefreshing] = useState(false);
    const [key, setKey] = useState(0);

    // Route search state
    const [originQuery, setOriginQuery] = useState('');
    const [destQuery, setDestQuery] = useState('');
    const [originResults, setOriginResults] = useState<RenfeStop[]>([]);
    const [destResults, setDestResults] = useState<RenfeStop[]>([]);
    const [selectedOrigin, setSelectedOrigin] = useState<RenfeStop | null>(null);
    const [selectedDest, setSelectedDest] = useState<RenfeStop | null>(null);
    const [showOriginDropdown, setShowOriginDropdown] = useState(false);
    const [showDestDropdown, setShowDestDropdown] = useState(false);

    const renfeFavorites = favorites.filter(fav => fav.agency === 'renfe');

    const handleRefresh = async () => {
        setRefreshing(true);
        setKey(prev => prev + 1);
        await new Promise(resolve => setTimeout(resolve, 500));
        setRefreshing(false);
    };

    // Origin search
    useEffect(() => {
        const t = setTimeout(async () => {
            if (originQuery.length >= 1 && !selectedOrigin) {
                const res = await searchRenfeStops(originQuery);
                setOriginResults(res);
                setShowOriginDropdown(true);
            } else {
                setOriginResults([]);
                setShowOriginDropdown(false);
            }
        }, 200);
        return () => clearTimeout(t);
    }, [originQuery, selectedOrigin]);

    // Destination search
    useEffect(() => {
        const t = setTimeout(async () => {
            if (destQuery.length >= 1 && !selectedDest) {
                const res = await searchRenfeStops(destQuery);
                setDestResults(res);
                setShowDestDropdown(true);
            } else {
                setDestResults([]);
                setShowDestDropdown(false);
            }
        }, 200);
        return () => clearTimeout(t);
    }, [destQuery, selectedDest]);

    // Pre-fill from last search
    useEffect(() => {
        if (lastRenfeSearch && !selectedOrigin && !selectedDest && originQuery === '' && destQuery === '') {
            setSelectedOrigin(lastRenfeSearch.origin);
            setOriginQuery(lastRenfeSearch.origin.name);
            setSelectedDest(lastRenfeSearch.dest);
            setDestQuery(lastRenfeSearch.dest.name);
        }
    }, [lastRenfeSearch]);

    const handleSearch = () => {
        if (!selectedOrigin || !selectedDest) return;
        saveRenfeSearch({ origin: selectedOrigin, dest: selectedDest });
        router.push(`/renfe/route?origin=${selectedOrigin.id}&dest=${selectedDest.id}`);
    };

    const handleSwap = () => {
        const tmpOrigin = selectedOrigin;
        const tmpDest = selectedDest;
        setSelectedOrigin(tmpDest);
        setSelectedDest(tmpOrigin);
        setOriginQuery(tmpDest?.name || '');
        setDestQuery(tmpOrigin?.name || '');
    };

    const handleClear = () => {
        setSelectedOrigin(null);
        setSelectedDest(null);
        setOriginQuery('');
        setDestQuery('');
    };

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
        <div className="min-h-screen bg-slate-50 pb-24">
            {/* Header */}
            <div className="bg-white border-b border-slate-100">
                <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-red-500 flex items-center justify-center">
                            <Train className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-semibold text-slate-800">Cercanías Bilbao</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <img 
                            src="/Cercanias_Logo.svg.png" 
                            alt="Cercanías" 
                            className="h-6 object-contain"
                        />
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={`w-5 h-5 text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Purple Container with Route Search */}
            <div className="px-4 pt-4 pb-2">
                <div className="max-w-lg mx-auto bg-gradient-to-br from-purple-600 to-purple-700 rounded-3xl p-1 shadow-lg">
                    <div className="bg-white rounded-[22px] p-5 space-y-4">
                        <h2 className="text-sm font-bold text-purple-800 uppercase tracking-wide">BUSCAR ITINERARIO</h2>
                        
                        {/* Origin Input */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> Origen
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={selectedOrigin ? selectedOrigin.name : originQuery}
                                    onChange={(e) => { setOriginQuery(e.target.value); setSelectedOrigin(null); }}
                                    onFocus={() => originResults.length > 0 && setShowOriginDropdown(true)}
                                    placeholder="Ej: Abando, Zazpikalea..."
                                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-900 placeholder-slate-400 bg-slate-50 focus:outline-none focus:border-purple-500 focus:bg-white transition-all text-sm font-medium"
                                    autoComplete="off"
                                />
                                {(originQuery || selectedOrigin) && (
                                    <button
                                        onClick={() => { setOriginQuery(''); setSelectedOrigin(null); }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full bg-slate-200 hover:bg-slate-300 transition-colors"
                                    >
                                        <X className="w-3 h-3 text-slate-600" />
                                    </button>
                                )}
                                {showOriginDropdown && originResults.length > 0 && (
                                    <>
                                        <button 
                                            className="fixed inset-0 z-30 w-full h-full cursor-default" 
                                            onClick={() => setShowOriginDropdown(false)} 
                                        />
                                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border-2 border-slate-200 rounded-xl shadow-xl z-40 overflow-hidden max-h-48 overflow-y-auto">
                                            {originResults.map(s => (
                                                <button
                                                    key={s.id}
                                                    onClick={() => { setSelectedOrigin(s); setOriginQuery(s.name); setShowOriginDropdown(false); }}
                                                    className="w-full text-left px-3 py-2.5 hover:bg-purple-50 border-b border-slate-100 last:border-b-0 transition-colors"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Train className="w-4 h-4 text-purple-500" />
                                                        <span className="text-sm font-medium text-slate-900">{s.name}</span>
                                                        <div className="flex gap-1 ml-auto">
                                                            {s.lines.map(l => (
                                                                <span key={l} className={`${getLineColor(l)} text-white px-1.5 py-0.5 rounded text-[10px] font-bold`}>{l}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Swap Button */}
                        <div className="flex justify-center">
                            <button
                                onClick={handleSwap}
                                disabled={!selectedOrigin && !selectedDest}
                                className="p-2 rounded-full bg-purple-100 hover:bg-purple-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                title="Intercambiar"
                            >
                                <ArrowRightLeft className="w-4 h-4 text-purple-600 rotate-90" />
                            </button>
                        </div>

                        {/* Destination Input */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> Destino
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={selectedDest ? selectedDest.name : destQuery}
                                    onChange={(e) => { setDestQuery(e.target.value); setSelectedDest(null); }}
                                    onFocus={() => destResults.length > 0 && setShowDestDropdown(true)}
                                    placeholder="Ej: Getxo, Basurto..."
                                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-900 placeholder-slate-400 bg-slate-50 focus:outline-none focus:border-purple-500 focus:bg-white transition-all text-sm font-medium"
                                    autoComplete="off"
                                />
                                {(destQuery || selectedDest) && (
                                    <button
                                        onClick={() => { setDestQuery(''); setSelectedDest(null); }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full bg-slate-200 hover:bg-slate-300 transition-colors"
                                    >
                                        <X className="w-3 h-3 text-slate-600" />
                                    </button>
                                )}
                                {showDestDropdown && destResults.length > 0 && (
                                    <>
                                        <button 
                                            className="fixed inset-0 z-30 w-full h-full cursor-default" 
                                            onClick={() => setShowDestDropdown(false)}
                                        />
                                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border-2 border-slate-200 rounded-xl shadow-xl z-40 overflow-hidden max-h-48 overflow-y-auto">
                                            {destResults.map(s => (
                                                <button
                                                    key={s.id}
                                                    onClick={() => { setSelectedDest(s); setDestQuery(s.name); setShowDestDropdown(false); }}
                                                    className="w-full text-left px-3 py-2.5 hover:bg-purple-50 border-b border-slate-100 last:border-b-0 transition-colors"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Train className="w-4 h-4 text-purple-500" />
                                                        <span className="text-sm font-medium text-slate-900">{s.name}</span>
                                                        <div className="flex gap-1 ml-auto">
                                                            {s.lines.map(l => (
                                                                <span key={l} className={`${getLineColor(l)} text-white px-1.5 py-0.5 rounded text-[10px] font-bold`}>{l}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Search Button */}
                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={handleSearch}
                                disabled={!selectedOrigin || !selectedDest}
                                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg text-sm flex items-center justify-center gap-2"
                            >
                                <Search className="w-4 h-4" />
                                Buscar trenes
                            </button>
                            {(selectedOrigin || selectedDest) && (
                                <button
                                    onClick={handleClear}
                                    className="px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors border-2 border-slate-200"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-lg mx-auto px-4 py-4 space-y-6">
                {/* Incidents Section */}
                <div key={key}>
                    <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                            {language === 'es' ? 'ESTADO DEL SERVICIO' : 'ZERBITZU EGOERA'}
                        </h2>
                    </div>
                    <RenfeIncidents compact={true} maxItems={5} />
                </div>

                {/* Favorites Section */}
                {renfeFavorites.length > 0 && (
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                            <Star className="w-5 h-5 text-purple-600 fill-purple-600" />
                            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                                {language === 'es' ? 'ESTACIONES FAVORITAS' : 'GELTOKI GOGOKOENAK'}
                            </h2>
                        </div>
                        <div className="space-y-2">
                            {renfeFavorites.map((fav) => (
                                <button
                                    key={fav.id}
                                    onClick={() => router.push(`/metro/station/${fav.stopId}?agency=renfe`)}
                                    className="w-full bg-white rounded-xl p-4 border border-slate-200 hover:border-purple-300 hover:shadow-md transition-all flex items-center justify-between group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center">
                                            <Train className="w-5 h-5 text-purple-600" />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-semibold text-slate-900">{fav.name || fav.stopName}</p>
                                            <p className="text-xs text-slate-500">Cercanías</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-purple-500 transition-colors" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {renfeFavorites.length === 0 && (
                    <div className="text-center py-8">
                        <img 
                            src="/icons/icon-192x192.png" 
                            alt="BilboTrans" 
                            className="w-16 h-16 mx-auto mb-4"
                        />
                        <h3 className="text-lg font-bold text-slate-900 mb-2">
                            {language === 'es' ? 'Cercanías Bilbao' : 'Bilbo Aldiriak'}
                        </h3>
                        <p className="text-slate-500 max-w-xs mx-auto text-sm">
                            {language === 'es'
                                ? 'Busca tu itinerario y consulta horarios en tiempo real'
                                : 'Bilatu zure ibilbidea eta ordutegia denbora errealean'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
