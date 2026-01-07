'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, AlertCircle, Clock, Heart, MapPin, RefreshCw, Train, AlertTriangle, ArrowRightLeft, Navigation, Info } from 'lucide-react';
import { searchStops, SearchResult } from '@/lib/stopSearch';
import { useFavorites } from '@/context/FavoritesContext';
import { useLanguage } from '@/context/LanguageContext';

interface Stop extends SearchResult {
    lat?: number;
    lon?: number;
}

interface RouteData {
    origin: Stop;
    destination: Stop;
    trains: TrainData[];
    trip: TripData;
    exits?: ExitsData;
}

interface TrainData {
    wagons: number;
    estimated: number;
    direction: string;
    time: string;
    timeRounded: string;
}

interface TripData {
    fromStation?: { code: string; name: string };
    toStation?: { code: string; name: string };
    duration?: number;
    line?: string;
    transfer?: boolean;
}

interface ExitsData {
    origin?: ExitInfo[];
    destiny?: ExitInfo[];
}

interface ExitInfo {
    id: number;
    name: string;
    elevator: boolean;
    nocturnal: boolean;
}

export default function RoutePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useLanguage();
    const { favorites, addFavorite, removeFavorite } = useFavorites();
    
    // State for route info
    const [selectedOrigin, setSelectedOrigin] = useState<Stop | null>(null);
    const [selectedDest, setSelectedDest] = useState<Stop | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [routeInfo, setRouteInfo] = useState<RouteData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(true);
    
    // Use ref to prevent multiple calls
    const hasLoadedRef = useRef(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Function to format line name
    const getCleanLineId = (lineId: string): string => {
        const regex = /L[1-3]/;
        const match = regex.exec(lineId || '');
        return match ? match[0] : lineId || 'L1';
    };

    // Función para buscar ruta - solo llamada manualmente
    const fetchRoute = useCallback(async (originId: string, destId: string, originStop?: Stop, destStop?: Stop) => {
        setError(null);

        try {
            const response = await fetch(
                `https://api.metrobilbao.eus/metro/real-time/${originId}/${destId}`
            );

            if (!response.ok) {
                throw new Error(t('noRouteFound'));
            }

            const data = await response.json();
            
            setRouteInfo({
                origin: originStop || { id: originId, name: data.trip?.fromStation?.name || originId, agency: 'metro' },
                destination: destStop || { id: destId, name: data.trip?.toStation?.name || destId, agency: 'metro' },
                trains: data.trains || [],
                trip: data.trip || {},
                exits: data.exits || {}
            });
            setLastUpdate(new Date());
        } catch (err) {
            setError(t('errorSearchingRoute'));
            console.error('Route search error:', err);
        }
    }, [t]);

    // Cargar desde URL params al iniciar - SOLO UNA VEZ
    useEffect(() => {
        if (hasLoadedRef.current) return;
        
        const loadFromParams = async () => {
            const originId = searchParams.get('origin');
            const destId = searchParams.get('dest');

            if (!originId || !destId) {
                setError('No se han proporcionado origen y destino');
                setIsLoading(false);
                return;
            }

            hasLoadedRef.current = true;

            try {
                // Buscar nombres reales de las paradas
                const [originResults, destResults] = await Promise.all([
                    searchStops(originId),
                    searchStops(destId)
                ]);

                let originStop: Stop = { id: originId, name: originId, agency: 'metro' };
                let destStop: Stop = { id: destId, name: destId, agency: 'metro' };

                if (originResults.length > 0) {
                    const found = originResults.find(r => r.id === originId) || originResults[0];
                    originStop = { ...found, lat: found.lat, lon: found.lon } as Stop;
                }
                if (destResults.length > 0) {
                    const found = destResults.find(r => r.id === destId) || destResults[0];
                    destStop = { ...found, lat: found.lat, lon: found.lon } as Stop;
                }

                setSelectedOrigin(originStop);
                setSelectedDest(destStop);

                // Buscar la ruta
                await fetchRoute(originId, destId, originStop, destStop);
            } catch (err) {
                setError('Error al cargar la ruta');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        loadFromParams();
    }, [searchParams, fetchRoute]);

    // Auto-refresh
    useEffect(() => {
        if (!autoRefresh || !selectedOrigin || !selectedDest) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }
        
        intervalRef.current = setInterval(() => {
            fetchRoute(selectedOrigin.id, selectedDest.id, selectedOrigin, selectedDest);
        }, 30000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [autoRefresh, selectedOrigin, selectedDest, fetchRoute]);

    const handleRefresh = () => {
        if (selectedOrigin && selectedDest) {
            fetchRoute(selectedOrigin.id, selectedDest.id, selectedOrigin, selectedDest);
        }
    };

    const handleSwap = () => {
        if (selectedOrigin && selectedDest) {
            router.push(`/route?origin=${selectedDest.id}&originAgency=${selectedDest.agency}&dest=${selectedOrigin.id}&destAgency=${selectedOrigin.agency}`);
        }
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

    // Pantalla de carga
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
                            <Train className="w-8 h-8 text-white" />
                        </div>
                    </div>
                    <Loader2 className="w-6 h-6 animate-spin text-orange-500 mx-auto mb-3" />
                    <p className="text-slate-600 font-medium">{t('loading')}</p>
                    <p className="text-xs text-slate-400 mt-1">Calculando mejor ruta...</p>
                </div>
            </div>
        );
    }

    // Error sin datos
    if (error && !routeInfo) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
                <div className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-50">
                    <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
                        <button
                            onClick={() => router.push('/')}
                            className="p-2 rounded-lg hover:bg-slate-100 active:scale-90 transition-all"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-600" />
                        </button>
                        <h1 className="text-xl font-bold text-slate-900">{t('planRoute')}</h1>
                    </div>
                </div>
                <div className="max-w-2xl mx-auto px-4 py-12">
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h2 className="text-lg font-bold text-red-800 mb-2">Error</h2>
                        <p className="text-red-600 mb-4">{error}</p>
                        <button
                            onClick={() => router.push('/')}
                            className="px-6 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
                        >
                            Volver al inicio
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Vista principal con resultados
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 pb-24">
            {/* Header */}
            <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 text-white">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between mb-4">
                        <button
                            onClick={() => router.push('/')}
                            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 active:scale-90 transition-all"
                        >
                            <ArrowLeft className="w-5 h-5 text-white" />
                        </button>
                        <h1 className="text-lg font-bold">{t('planRoute')}</h1>
                        <button
                            onClick={handleRefresh}
                            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 active:scale-90 transition-all"
                        >
                            <RefreshCw className="w-5 h-5 text-white" />
                        </button>
                    </div>

                    {/* Route Summary Card */}
                    {routeInfo && (
                        <div className="bg-white/10 backdrop-blur rounded-2xl p-4">
                            <div className="flex items-center gap-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
                                        <span className="text-sm font-medium text-white/90">Origen</span>
                                    </div>
                                    <p className="text-lg font-bold text-white truncate">{routeInfo.origin.name}</p>
                                </div>
                                
                                <button
                                    onClick={handleSwap}
                                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors shrink-0"
                                    title="Intercambiar"
                                >
                                    <ArrowRightLeft className="w-5 h-5 text-white" />
                                </button>
                                
                                <div className="flex-1 text-right">
                                    <div className="flex items-center justify-end gap-2 mb-2">
                                        <span className="text-sm font-medium text-white/90">Destino</span>
                                        <div className="w-3 h-3 rounded-full bg-red-400" />
                                    </div>
                                    <p className="text-lg font-bold text-white truncate">{routeInfo.destination.name}</p>
                                </div>
                            </div>

                            {/* Trip Info */}
                            <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-white/20">
                                {routeInfo.trip.duration && (
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-white/70" />
                                        <span className="text-white font-bold">{routeInfo.trip.duration} min</span>
                                    </div>
                                )}
                                {routeInfo.trip.line && (
                                    <div className="px-3 py-1 rounded-full bg-white text-orange-600 text-sm font-bold">
                                        {getCleanLineId(routeInfo.trip.line)}
                                    </div>
                                )}
                                {routeInfo.trip.transfer && (
                                    <div className="flex items-center gap-1 text-yellow-300">
                                        <AlertTriangle className="w-4 h-4" />
                                        <span className="text-sm font-medium">Transbordo</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
                {/* Error */}
                {error && (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 animate-fadeIn">
                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                {routeInfo && (
                    <>
                        {/* Favoritos */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                <Heart className="w-4 h-4 text-orange-500" />
                                Guardar estaciones
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={(e) => toggleFavorite(routeInfo.origin, e)}
                                    className={`p-3 rounded-xl border-2 transition-all flex items-center gap-2 ${
                                        isFavorite(routeInfo.origin)
                                            ? 'bg-orange-50 border-orange-500 text-orange-700'
                                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-orange-300'
                                    }`}
                                >
                                    <Heart className={`w-4 h-4 ${isFavorite(routeInfo.origin) ? 'fill-current' : ''}`} />
                                    <div className="text-left flex-1 min-w-0">
                                        <p className="text-xs text-slate-500">Origen</p>
                                        <p className="text-sm font-semibold truncate">{routeInfo.origin.name}</p>
                                    </div>
                                </button>
                                <button
                                    onClick={(e) => toggleFavorite(routeInfo.destination, e)}
                                    className={`p-3 rounded-xl border-2 transition-all flex items-center gap-2 ${
                                        isFavorite(routeInfo.destination)
                                            ? 'bg-orange-50 border-orange-500 text-orange-700'
                                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-orange-300'
                                    }`}
                                >
                                    <Heart className={`w-4 h-4 ${isFavorite(routeInfo.destination) ? 'fill-current' : ''}`} />
                                    <div className="text-left flex-1 min-w-0">
                                        <p className="text-xs text-slate-500">Destino</p>
                                        <p className="text-sm font-semibold truncate">{routeInfo.destination.name}</p>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Próximos trenes */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                                <h2 className="font-bold text-slate-900 flex items-center gap-2">
                                    <Train className="w-5 h-5 text-orange-600" />
                                    Próximos metros
                                </h2>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setAutoRefresh(!autoRefresh)}
                                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                                            autoRefresh
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                        }`}
                                    >
                                        <RefreshCw className={`w-3 h-3 ${autoRefresh ? 'animate-spin' : ''}`} />
                                        {autoRefresh ? 'Auto' : 'Manual'}
                                    </button>
                                    {lastUpdate && (
                                        <span className="text-xs text-slate-400">
                                            {lastUpdate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {routeInfo.trains.length > 0 ? (
                                <div className="divide-y divide-slate-100">
                                    {routeInfo.trains.slice(0, 5).map((train, idx) => (
                                        <div 
                                            key={`train-${train.direction}-${idx}`} 
                                            className={`p-4 flex items-center justify-between ${idx === 0 ? 'bg-orange-50' : 'hover:bg-slate-50'} transition-colors`}
                                        >
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 ${
                                                    idx === 0 ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                    <span className="text-lg font-bold leading-none">{train.estimated <= 0 ? '0' : train.estimated}</span>
                                                    <span className="text-[10px] font-medium">min</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-slate-900 truncate">
                                                        → {train.direction}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="px-2 py-0.5 rounded text-xs font-bold text-white bg-orange-500">
                                                            {getCleanLineId(routeInfo.trip.line || '')}
                                                        </span>
                                                        <span className="text-xs text-slate-500">
                                                            {train.wagons} vagones
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0 ml-3">
                                                <p className="text-xs text-slate-500">{train.timeRounded || train.time}</p>
                                                {idx === 0 && train.estimated <= 2 && (
                                                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold animate-pulse">
                                                        ¡Ya llega!
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 text-center">
                                    <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                    <p className="text-slate-600 font-medium">No hay trenes disponibles</p>
                                    <p className="text-sm text-slate-400 mt-1">Intenta de nuevo en unos minutos</p>
                                </div>
                            )}
                        </div>

                        {/* Salidas de estación */}
                        {(routeInfo.exits?.origin || routeInfo.exits?.destiny) && (
                            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                    <Navigation className="w-4 h-4 text-blue-500" />
                                    Salidas de estación
                                </h3>
                                <div className="space-y-4">
                                    {routeInfo.exits?.destiny && routeInfo.exits.destiny.length > 0 && (
                                        <div>
                                            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
                                                En {routeInfo.destination.name}
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {routeInfo.exits.destiny.map((exit) => (
                                                    <div 
                                                        key={exit.id}
                                                        className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-2"
                                                    >
                                                        <MapPin className="w-3 h-3 text-slate-400" />
                                                        <span className="text-sm font-medium text-slate-700">{exit.name}</span>
                                                        {exit.elevator && (
                                                            <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold">
                                                                ♿ Ascensor
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Info adicional */}
                        <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                            <div className="flex items-start gap-3">
                                <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-blue-800">Información en tiempo real</p>
                                    <p className="text-xs text-blue-600 mt-1">
                                        Los tiempos se actualizan automáticamente cada 30 segundos. 
                                        El tiempo de viaje estimado es de {routeInfo.trip.duration || '?'} minutos.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
