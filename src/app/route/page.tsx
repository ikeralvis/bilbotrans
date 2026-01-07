'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Loader2, AlertCircle, Clock, Heart, MapPin, RefreshCw } from 'lucide-react';
import { searchStops, SearchResult } from '@/app/actions';
import { useFavorites } from '@/context/FavoritesContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';

interface Stop extends SearchResult {
    lat?: number;
    lon?: number;
}

export default function RoutePage() {
    const router = useRouter();
    const { t } = useLanguage();
    const { favorites, addFavorite, removeFavorite } = useFavorites();
    const [origin, setOrigin] = useState('');
    const [destination, setDestination] = useState('');
    const [originResults, setOriginResults] = useState<Stop[]>([]);
    const [destResults, setDestResults] = useState<Stop[]>([]);
    const [selectedOrigin, setSelectedOrigin] = useState<Stop | null>(null);
    const [selectedDest, setSelectedDest] = useState<Stop | null>(null);
    const [isLoadingOrigin, setIsLoadingOrigin] = useState(false);
    const [isLoadingDest, setIsLoadingDest] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [routeInfo, setRouteInfo] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [openOrigin, setOpenOrigin] = useState(false);
    const [openDest, setOpenDest] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(false);

    // Buscar origen
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (origin.length >= 2) {
                setIsLoadingOrigin(true);
                const data = await searchStops(origin);
                setOriginResults(data as Stop[]);
                setOpenOrigin(true);
                setIsLoadingOrigin(false);
            } else {
                setOriginResults([]);
                setOpenOrigin(false);
            }
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [origin]);

    // Buscar destino
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (destination.length >= 2) {
                setIsLoadingDest(true);
                const data = await searchStops(destination);
                setDestResults(data as Stop[]);
                setOpenDest(true);
                setIsLoadingDest(false);
            } else {
                setDestResults([]);
                setOpenDest(false);
            }
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [destination]);

    const handleSearchRoute = async (forceRefresh = false) => {
        if (!selectedOrigin || !selectedDest) {
            setError(t('selectOriginAndDest'));
            return;
        }

        if (selectedOrigin.id === selectedDest.id) {
            setError(t('originDestCannotBeEqual'));
            return;
        }

        setIsSearching(true);
        setError(null);
        if (!forceRefresh) {
            setRouteInfo(null);
        }

        try {
            const response = await fetch(
                `https://api.metrobilbao.eus/metro/real-time/${selectedOrigin.id}/${selectedDest.id}`
            );

            if (!response.ok) {
                throw new Error(t('noRouteFound'));
            }

            const data = await response.json();
            setRouteInfo({
                origin: selectedOrigin,
                destination: selectedDest,
                trains: data.trains || [],
                trip: data.trip || {},
                exits: data.exits || {}
            });
            setLastUpdate(new Date());
        } catch (err) {
            setError(t('errorSearchingRoute'));
            console.error('Route search error:', err);
        } finally {
            setIsSearching(false);
        }
    };

    // Auto-refresh cada 30 segundos si está habilitado
    useEffect(() => {
        if (!autoRefresh || !routeInfo) return;
        
        const interval = setInterval(() => {
            handleSearchRoute(true);
        }, 30000); // 30 segundos

        return () => clearInterval(interval);
    }, [autoRefresh, routeInfo, selectedOrigin, selectedDest]);

    const handleSwap = () => {
        const temp = selectedOrigin;
        setSelectedOrigin(selectedDest);
        setSelectedDest(temp);
        
        const tempText = origin;
        setOrigin(destination);
        setDestination(tempText);
    };

    const isFavorite = (stop: Stop) => {
        return favorites.some(f => f.stopId === stop.id && f.agency === (stop.agency || 'metro'));
    };

    const toggleFavorite = (stop: Stop, e: React.MouseEvent) => {
        e.stopPropagation();
        if (isFavorite(stop)) {
            removeFavorite(stop.id, (stop.agency || 'metro') as 'metro' | 'bilbobus');
        } else {
            addFavorite({
                stopId: stop.id,
                name: stop.name,
                agency: (stop.agency || 'metro') as 'metro' | 'bilbobus',
                lat: stop.lat || 0,
                lon: stop.lon || 0
            });
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 pb-24">
            {/* Header */}
            <div className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 rounded-lg hover:bg-slate-100 active:scale-90 transition-all"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </button>
                    <h1 className="text-xl font-bold text-slate-900">{t('planRoute')}</h1>
                </div>
            </div>

            <main className="max-w-2xl mx-auto px-4 py-6">
                {/* Search Panel */}
                <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm mb-6 animate-slideUp">
                    {/* Origin */}
                    <div className="relative mb-3">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">
                            {t('origin')}
                        </label>
                        <input
                            type="text"
                            placeholder={t('whereFrom')}
                            value={selectedOrigin ? selectedOrigin.name : origin}
                            onChange={(e) => {
                                setOrigin(e.target.value);
                                setSelectedOrigin(null);
                            }}
                            onFocus={() => origin.length >= 2 && setOpenOrigin(true)}
                            className="w-full h-11 px-4 rounded-lg bg-slate-50 border border-slate-200 
                                     focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:bg-white
                                     outline-none transition-all text-sm font-medium text-slate-900 placeholder:text-slate-500"
                        />
                        {openOrigin && originResults.length > 0 && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setOpenOrigin(false)} />
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                                    {originResults.map((stop) => (
                                        <div key={stop.id} className="border-b border-slate-100 last:border-b-0">
                                            <button
                                                onClick={() => {
                                                    setSelectedOrigin(stop);
                                                    setOrigin(stop.name);
                                                    setOpenOrigin(false);
                                                }}
                                                className="w-full text-left px-4 py-3 hover:bg-slate-50 active:bg-slate-100 transition-colors flex items-center justify-between"
                                            >
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-slate-900">{stop.name}</p>
                                                    <p className="text-xs text-slate-500">{stop.agency === 'metro' ? 'Metro' : 'Bilbobus'}</p>
                                                </div>
                                                {stop.agency === 'metro' && (
                                                    <Image 
                                                        src="/logoMetro.svg" 
                                                        alt="Metro" 
                                                        width={16} 
                                                        height={16}
                                                        className="opacity-70"
                                                    />
                                                )}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Swap Button */}
                    <div className="flex justify-center -my-1.5 relative z-10">
                        <button
                            onClick={handleSwap}
                            disabled={!selectedOrigin || !selectedDest}
                            className="p-2 rounded-lg bg-white border border-slate-200 hover:border-slate-300 hover:shadow-md active:scale-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            title={t('swapOriginDest')}
                        >
                            <ArrowRight className="w-4 h-4 text-slate-600 rotate-90" />
                        </button>
                    </div>

                    {/* Destination */}
                    <div className="relative mt-3">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">
                            {t('destination')}
                        </label>
                        <input
                            type="text"
                            placeholder={t('whereTo')}
                            value={selectedDest ? selectedDest.name : destination}
                            onChange={(e) => {
                                setDestination(e.target.value);
                                setSelectedDest(null);
                            }}
                            onFocus={() => destination.length >= 2 && setOpenDest(true)}
                            className="w-full h-11 px-4 rounded-lg bg-slate-50 border border-slate-200 
                                     focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:bg-white
                                     outline-none transition-all text-sm font-medium text-slate-900 placeholder:text-slate-500"
                        />
                        {openDest && destResults.length > 0 && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setOpenDest(false)} />
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                                    {destResults.map((stop) => (
                                        <div key={stop.id} className="border-b border-slate-100 last:border-b-0">
                                            <button
                                                onClick={() => {
                                                    setSelectedDest(stop);
                                                    setDestination(stop.name);
                                                    setOpenDest(false);
                                                }}
                                                className="w-full text-left px-4 py-3 hover:bg-slate-50 active:bg-slate-100 transition-colors flex items-center justify-between"
                                            >
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-slate-900">{stop.name}</p>
                                                    <p className="text-xs text-slate-500">{stop.agency === 'metro' ? 'Metro' : 'Bilbobus'}</p>
                                                </div>
                                                {stop.agency === 'metro' && (
                                                    <Image 
                                                        src="/metroLogo.svg" 
                                                        alt="Metro" 
                                                        width={16} 
                                                        height={16}
                                                        className="opacity-70"
                                                    />
                                                )}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Search Button */}
                    <button
                        onClick={() => handleSearchRoute()}
                        disabled={!selectedOrigin || !selectedDest || isSearching}
                        className="w-full mt-4 h-11 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 
                                 hover:from-blue-600 hover:to-blue-700 active:scale-95
                                 text-white font-semibold text-sm transition-all disabled:opacity-50
                                 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isSearching ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {t('loading')}
                            </>
                        ) : (
                            t('searchRoute')
                        )}
                    </button>
                </div>

                {/* Error */}
                {error && (
                    <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3 animate-slideUp">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                {/* Route Results */}
                {routeInfo && (
                    <div className="space-y-4 animate-fadeIn">
                        {/* Trip Info Header */}
                        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3 flex-1">
                                    <MapPin className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">{t('route')}</p>
                                        <p className="text-sm font-medium text-slate-900 leading-tight">
                                            {routeInfo.origin.name} <span className="text-slate-400">→</span> {routeInfo.destination.name}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 pt-3 border-t border-slate-100">
                                {routeInfo.trip.duration && (
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-slate-600" />
                                        <span className="text-xs text-slate-600">
                                            <strong className="text-slate-900">{routeInfo.trip.duration} min</strong> - {t('duration')}
                                        </span>
                                    </div>
                                )}
                                {routeInfo.trip.line && (
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-1 rounded text-xs font-bold text-white bg-orange-500">
                                            {routeInfo.trip.line}
                                        </span>
                                        <span className="text-xs text-slate-600">{t('availableLine')}</span>
                                    </div>
                                )}
                            </div>

                            {/* Auto-refresh toggle */}
                            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
                                <button
                                    onClick={() => setAutoRefresh(!autoRefresh)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                                        autoRefresh
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    <RefreshCw className={`w-3 h-3 ${autoRefresh ? 'animate-spin' : ''}`} />
                                    Auto-actualizar
                                </button>
                                {lastUpdate && (
                                    <span className="text-xs text-slate-500 ml-auto">
                                        {lastUpdate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Origin & Destination Favorite Buttons */}
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={(e) => toggleFavorite(routeInfo.origin, e)}
                                className={`p-3 rounded-lg border-2 transition-all flex items-center gap-2 font-semibold text-sm ${
                                    isFavorite(routeInfo.origin)
                                        ? 'bg-orange-50 border-orange-500 text-orange-700'
                                        : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200'
                                }`}
                            >
                                <Heart className={`w-4 h-4 ${isFavorite(routeInfo.origin) ? 'fill-current' : ''}`} />
                                {isFavorite(routeInfo.origin) ? 'Favorito' : 'Añadir'}
                            </button>
                            <button
                                onClick={(e) => toggleFavorite(routeInfo.destination, e)}
                                className={`p-3 rounded-lg border-2 transition-all flex items-center gap-2 font-semibold text-sm ${
                                    isFavorite(routeInfo.destination)
                                        ? 'bg-orange-50 border-orange-500 text-orange-700'
                                        : 'bg-white border-slate-100 text-slate-600 hover:border-slate-200'
                                }`}
                            >
                                <Heart className={`w-4 h-4 ${isFavorite(routeInfo.destination) ? 'fill-current' : ''}`} />
                                {isFavorite(routeInfo.destination) ? 'Favorito' : 'Añadir'}
                            </button>
                        </div>

                        {/* Available Trains */}
                        {routeInfo.trains && routeInfo.trains.length > 0 ? (
                            <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                                <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                                    🚆 {t('availableTrains')}
                                </h2>
                                <div className="space-y-2">
                                    {routeInfo.trains.slice(0, 5).map((train: any, idx: number) => (
                                        <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                                <span className="px-3 py-1 rounded bg-orange-500 text-white text-xs font-bold flex-shrink-0">
                                                    {routeInfo.trip.line}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-slate-900 truncate">{train.direction}</p>
                                                    <p className="text-xs text-slate-500">{train.wagons || 0} {t('wagons')}</p>
                                                </div>
                                            </div>
                                            <div className="text-right flex-shrink-0 ml-3">
                                                <p className={`text-lg font-bold ${
                                                    train.estimated <= 2 ? 'text-red-600' : 'text-slate-900'
                                                }`}>
                                                    {train.estimated <= 0 ? 'Now' : `${train.estimated}m`}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm text-center">
                                <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                <p className="text-slate-600">{t('noTrainsAvailable')}</p>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
