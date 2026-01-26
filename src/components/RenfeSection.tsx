'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowRightLeft, Heart, MapPin, ChevronRight, Clock } from 'lucide-react';
import { searchRenfeStops, RenfeStop } from '@/lib/renfe/api';
import { FavoriteStopCard } from './FavoriteStopCard';
import { useFavorites } from '@/context/FavoritesContext';
import { useLastSearch } from '@/hooks/useLastSearch';

export function RenfeSection() {
    const router = useRouter();
    const { favorites } = useFavorites();

    const { lastSearch: lastRenfeSearch, saveSearch: saveRenfeSearch } = useLastSearch<{ origin: RenfeStop, dest: RenfeStop }>('renfe');

    const [originQuery, setOriginQuery] = useState('');
    const [destQuery, setDestQuery] = useState('');
    const [originResults, setOriginResults] = useState<RenfeStop[]>([]);
    const [destResults, setDestResults] = useState<RenfeStop[]>([]);
    const [selectedOrigin, setSelectedOrigin] = useState<RenfeStop | null>(null);
    const [selectedDest, setSelectedDest] = useState<RenfeStop | null>(null);
    const [showOriginDropdown, setShowOriginDropdown] = useState(false);
    const [showDestDropdown, setShowDestDropdown] = useState(false);

    useEffect(() => {
        const t = setTimeout(async () => {
            if (originQuery.length >= 2 && !selectedOrigin) {
                const res = await searchRenfeStops(originQuery);
                setOriginResults(res);
                setShowOriginDropdown(true);
            } else {
                setOriginResults([]);
                setShowOriginDropdown(false);
            }
        }, 250);
        return () => clearTimeout(t);
    }, [originQuery, selectedOrigin]);

    useEffect(() => {
        const t = setTimeout(async () => {
            if (destQuery.length >= 2 && !selectedDest) {
                const res = await searchRenfeStops(destQuery);
                setDestResults(res);
                setShowDestDropdown(true);
            } else {
                setDestResults([]);
                setShowDestDropdown(false);
            }
        }, 250);
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
    }, [lastRenfeSearch, selectedOrigin, selectedDest, originQuery, destQuery]);

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

    const renfeStations = favorites.filter(f => f.agency === 'renfe');

    return (
        <div className="flex-1 flex flex-col bg-linear-to-b from-slate-50 via-white to-white">
            {/* Hero Header - Gradient with depth */}
            <div className="relative overflow-hidden bg-linear-to-br from-purple-700 via-purple-600 to-red-600 text-white px-4 pt-8 pb-20">
                {/* Background decoration */}
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-48 -mt-48"></div>
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-red-500/10 rounded-full blur-3xl -ml-48 -mb-48"></div>
                </div>

                <div className="max-w-lg mx-auto relative z-10 space-y-4">
                    {/* Icon + Badge */}
                    <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-lg">
                            <img
                                src="/Cercanias_Logo.svg.png"
                                alt="Cercanías Logo"
                                className="w-10 h-10 object-contain"
                            />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black tracking-tight">Renfe</h1>
                            <p className="text-sm text-white/70 font-semibold">Cercanías Bilbao</p>
                        </div>
                    </div>

                    {/* Subtitle */}
                    <p className="text-white/80 text-sm leading-relaxed max-w-xs">
                        Busca horarios y reserva tus viajes en Cercanías
                    </p>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 max-w-lg mx-auto w-full px-4 py-6 space-y-6">
                {/* Search Card - Overlapped */}
                <div className="-mt-12 relative z-20">
                    <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-5">
                        {/* Origin Input */}
                        <div className="space-y-2">
                            <label htmlFor="renfe-origin" className="block text-xs font-black text-purple-600 uppercase tracking-widest">
                                <span className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4" />
                                    De
                                </span>
                            </label>
                            <div className="relative">
                                <input
                                    id="renfe-origin"
                                    type="text"
                                    value={selectedOrigin ? selectedOrigin.name : originQuery}
                                    onChange={(e) => { setOriginQuery(e.target.value); setSelectedOrigin(null); }}
                                    onFocus={() => originResults.length > 0 && setShowOriginDropdown(true)}
                                    placeholder="Ej: Abando, Zazpikalea..."
                                    className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-200 text-slate-900 placeholder-slate-400 bg-slate-50 focus:outline-none focus:border-purple-500 focus:bg-white transition-all text-sm font-medium"
                                    autoComplete="off"
                                />
                                {showOriginDropdown && originResults.length > 0 && (
                                    <>
                                        <button 
                                            className="fixed inset-0 z-30 w-full h-full cursor-default" 
                                            onClick={() => setShowOriginDropdown(false)} 
                                            aria-label="Cerrar sugerencias"
                                        />
                                        <div className="absolute left-0 right-0 top-full mt-2 bg-white border-2 border-slate-200 rounded-2xl shadow-2xl z-40 overflow-hidden max-h-72 overflow-y-auto">
                                            {originResults.map(s => (
                                                <button
                                                    key={s.id}
                                                    onClick={() => { setSelectedOrigin(s); setOriginQuery(s.name); setShowOriginDropdown(false); }}
                                                    className="w-full text-left px-4 py-3 hover:bg-purple-50 border-b border-slate-100 last:border-b-0 transition-colors group"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <div className="text-sm font-bold text-slate-900">{s.name}</div>
                                                            <div className="text-xs text-slate-500 mt-0.5 flex gap-1">
                                                                {s.lines.map(l => <span key={l} className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-[10px] font-bold">{l}</span>)}
                                                            </div>
                                                        </div>
                                                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-purple-500 transition-colors" />
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Swap Button */}
                        <div className="flex justify-center -my-1">
                            <button
                                onClick={handleSwap}
                                disabled={!selectedOrigin || !selectedDest}
                                className="p-2.5 rounded-full bg-linear-to-br from-purple-100 to-indigo-100 hover:from-purple-200 hover:to-indigo-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md border border-purple-200 hover:border-purple-300"
                                title="Intercambiar origen y destino"
                            >
                                <ArrowRightLeft className="w-5 h-5 text-purple-600 rotate-90" />
                            </button>
                        </div>

                        {/* Destination Input */}
                        <div className="space-y-2">
                            <label htmlFor="renfe-dest" className="block text-xs font-black text-purple-600 uppercase tracking-widest">
                                <span className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4" />
                                    A
                                </span>
                            </label>
                            <div className="relative">
                                <input
                                    id="renfe-dest"
                                    type="text"
                                    value={selectedDest ? selectedDest.name : destQuery}
                                    onChange={(e) => { setDestQuery(e.target.value); setSelectedDest(null); }}
                                    onFocus={() => destResults.length > 0 && setShowDestDropdown(true)}
                                    placeholder="Ej: Basurto, Getxo..."
                                    className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-200 text-slate-900 placeholder-slate-400 bg-slate-50 focus:outline-none focus:border-purple-500 focus:bg-white transition-all text-sm font-medium"
                                    autoComplete="off"
                                />
                                {showDestDropdown && destResults.length > 0 && (
                                    <>
                                        <button 
                                            className="fixed inset-0 z-30 w-full h-full cursor-default" 
                                            onClick={() => setShowDestDropdown(false)}
                                            aria-label="Cerrar sugerencias"
                                        />
                                        <div className="absolute left-0 right-0 top-full mt-2 bg-white border-2 border-slate-200 rounded-2xl shadow-2xl z-40 overflow-hidden max-h-72 overflow-y-auto">
                                            {destResults.map(s => (
                                                <button
                                                    key={s.id}
                                                    onClick={() => { setSelectedDest(s); setDestQuery(s.name); setShowDestDropdown(false); }}
                                                    className="w-full text-left px-4 py-3 hover:bg-purple-50 border-b border-slate-100 last:border-b-0 transition-colors group"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <div className="text-sm font-bold text-slate-900">{s.name}</div>
                                                            <div className="text-xs text-slate-500 mt-0.5 flex gap-1">
                                                                {s.lines.map(l => <span key={l} className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-[10px] font-bold">{l}</span>)}
                                                            </div>
                                                        </div>
                                                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-purple-500 transition-colors" />
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* CTA Buttons */}
                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={handleSearch}
                                disabled={!selectedOrigin || !selectedDest}
                                className="flex-1 px-4 py-3.5 rounded-2xl bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg text-sm flex items-center justify-center gap-2 group"
                            >
                                <Search className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                                Buscar
                            </button>
                            <button
                                onClick={() => { setSelectedOrigin(null); setSelectedDest(null); setOriginQuery(''); setDestQuery(''); }}
                                className="px-4 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors text-sm border-2 border-slate-200"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                </div>

                {/* Recent/Quick Actions */}
                <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2 px-1">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest">Acciones rápidas</h3>
                    </div>
                    <div className="space-y-2">
                        <button
                            onClick={() => router.push('/renfe/schedule')}
                            className="w-full px-4 py-3 rounded-2xl bg-linear-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 hover:from-blue-100 hover:to-cyan-100 transition-all flex items-center justify-between group"
                        >
                            <span className="text-sm font-bold text-blue-900">Ver horarios de hoy</span>
                            <ChevronRight className="w-4 h-4 text-blue-500 group-hover:translate-x-1 transition-transform" />
                        </button>
                        <button
                            onClick={() => router.push('/renfe/alerts')}
                            className="w-full px-4 py-3 rounded-2xl bg-linear-to-r from-amber-50 to-orange-50 border-2 border-amber-200 hover:from-amber-100 hover:to-orange-100 transition-all flex items-center justify-between group"
                        >
                            <span className="text-sm font-bold text-amber-900">Alertas de servicio</span>
                            <ChevronRight className="w-4 h-4 text-amber-500 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>

                {/* Favorites Section */}
                {renfeStations.length > 0 && (
                    <div className="space-y-3 pt-4 border-t border-slate-200">
                        <div className="flex items-center gap-2 px-1">
                            <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                            <h3 className="text-sm font-bold text-slate-900">Guardadas</h3>
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-bold">{renfeStations.length}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {renfeStations.map(f => (
                                <FavoriteStopCard
                                    key={f.id}
                                    stopId={f.stopId}
                                    name={f.name || f.stopName || 'Estación sin nombre'}
                                    agency={f.agency}
                                    lat={f.lat}
                                    lon={f.lon}
                                    onTap={() => router.push(`/station/${f.stopId}?agency=renfe`)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Footer tip */}
                <div className="bg-linear-to-r from-purple-50 to-indigo-50 rounded-2xl border-2 border-purple-200 p-4 text-center">
                    <p className="text-xs text-slate-600 leading-relaxed">
                        💡 Los horarios se actualizan en tiempo real. Compra tus billetes directamente en el sitio web de Renfe
                    </p>
                </div>
            </div>
        </div>
    );
}
