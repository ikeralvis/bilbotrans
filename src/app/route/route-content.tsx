'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, AlertCircle, Clock, Heart, RefreshCw, Train, ArrowRightLeft, Info, Bus } from 'lucide-react';
import { searchStops, SearchResult } from '@/lib/shared/stopSearch';
import { getMetroArrivalsByStop, MetroArrival } from '@/lib/metro/api';
import { useFavorites } from '@/context/FavoritesContext';

interface Stop extends SearchResult {
    lat?: number;
    lon?: number;
    agency: 'metro' | 'bilbobus' | 'bizkaibus';
}

interface RealTimeTrainData {
    wagons: number;
    estimated: number;
    direction: string;
    time: string;
    timeRounded: string;
}

interface MetroScheduleResponse {
    trains: RealTimeTrainData[];
    trip: {
        fromStation: { code: string; name: string };
        toStation: { code: string; name: string };
        duration: number;
        line: string;
        transfer: boolean;
    };
    exits?: {
        origin: Array<{ id: number; name: string; elevator: boolean; nocturnal: boolean }>;
        destiny: Array<{ id: number; name: string; elevator: boolean; nocturnal: boolean }>;
    };
}

export function RouteContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { addFavorite, removeFavorite, isFavorite } = useFavorites();

    const [originStop, setOriginStop] = useState<Stop | null>(null);
    const [destStop, setDestStop] = useState<Stop | null>(null);
    const [arrivals, setArrivals] = useState<MetroArrival[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const hasLoadedRef = useRef(false);

    const loadRoute = useCallback(async () => {
        if (hasLoadedRef.current) return;
        hasLoadedRef.current = true;

        try {
            const originId = searchParams.get('origin');
            const originAgency = (searchParams.get('originAgency') || 'metro') as 'metro' | 'bilbobus' | 'bizkaibus';
            const destId = searchParams.get('dest');
            const destAgency = (searchParams.get('destAgency') || 'metro') as 'metro' | 'bilbobus' | 'bizkaibus';

            console.log('[Route] Loading route:', { originId, originAgency, destId, destAgency });

            if (!originId || !destId) {
                setError('Paradas no especificadas');
                setIsLoading(false);
                return;
            }

            // Buscar los datos de las paradas
            const [originResults, destResults] = await Promise.all([
                searchStops(originId),
                searchStops(destId)
            ]);

            console.log('[Route] Search results:', { originResults: originResults.length, destResults: destResults.length });

            if (!originResults.length || !destResults.length) {
                setError('Una o ambas paradas no fueron encontradas');
                setIsLoading(false);
                return;
            }

            // Encontrar el resultado que coincida exactamente con el ID
            const origin = originResults.find(r => r.id === originId) || originResults[0];
            const dest = destResults.find(r => r.id === destId) || destResults[0];

            const originWithAgency = { ...origin, agency: originAgency } as Stop;
            const destWithAgency = { ...dest, agency: destAgency } as Stop;

            console.log('[Route] Found stops:', { origin: originWithAgency.name, dest: destWithAgency.name });

            setOriginStop(originWithAgency);
            setDestStop(destWithAgency);

            // Cargar información según el tipo de transporte
            if (originAgency === 'metro' && destAgency === 'metro') {
                console.log('[Route] Loading metro schedule for route:', originId, '->', destId);
                try {
                    const response = await fetch(`/api/metro/schedule?origin=${originId}&dest=${destId}`);
                    if (response.ok) {
                        const scheduleData: MetroScheduleResponse = await response.json();
                        console.log('[Route] Real-time response:', scheduleData);
                        if (scheduleData.trains && scheduleData.trains.length > 0) {
                            // Convertir datos del endpoint real-time a formato MetroArrival
                            const convertedArrivals: MetroArrival[] = scheduleData.trains.map((train: RealTimeTrainData) => {
                                const etaMinutes = train.estimated;
                                return {
                                    lineId: scheduleData.trip?.line || 'L1',
                                    destination: scheduleData.trip?.toStation?.name || destWithAgency.name,
                                    etaMinutes: etaMinutes,
                                    etaDisplay: etaMinutes > 10 ? train.timeRounded : `${etaMinutes} min`,
                                    platform: train.direction,
                                    wagons: train.wagons,
                                    time: train.timeRounded,
                                    duration: scheduleData.trip?.duration
                                };
                            });
                            setArrivals(convertedArrivals);
                        }
                    } else {
                        // Fallback: cargar llegadas de la estación de origen
                        const metroArrivals = await getMetroArrivalsByStop(originId);
                        setArrivals(metroArrivals);
                    }
                } catch (error_) {
                    console.log('[Route] Schedule endpoint failed, using realtime arrivals:', error_);
                    const metroArrivals = await getMetroArrivalsByStop(originId);
                    setArrivals(metroArrivals);
                }
                setLastUpdate(new Date());
            } else if (originAgency === 'metro') {
                // Si solo origen es metro, mostrar llegadas de esa estación
                console.log('[Route] Loading metro arrivals for:', originId);
                const metroArrivals = await getMetroArrivalsByStop(originId);
                console.log('[Route] Got metro arrivals:', metroArrivals.length);
                setArrivals(metroArrivals);
                setLastUpdate(new Date());
            }

            setError(null);
        } catch (err) {
            console.error('[Route] Error loading route:', err);
            setError('No se pudo cargar la ruta');
        } finally {
            setIsLoading(false);
        }
    }, [searchParams]);

    useEffect(() => {
        loadRoute();
    }, [loadRoute]);

    const handleRefresh = async () => {
        if (!originStop) return;
        setIsRefreshing(true);

        try {
            if (originStop.agency === 'metro') {
                const metroArrivals = await getMetroArrivalsByStop(originStop.id);
                setArrivals(metroArrivals);
                setLastUpdate(new Date());
            }
        } catch (err) {
            console.error('[Route] Refresh error:', err);
        } finally {
            setIsRefreshing(false);
        }
    };

    const toggleFavorite = (stop: Stop, e: React.MouseEvent) => {
        e.stopPropagation();
        const isFav = isFavorite(stop.id, stop.agency);

        if (isFav) {
            removeFavorite(stop.id, stop.agency);
        } else {
            addFavorite({
                stopId: stop.id,
                name: stop.name,
                agency: stop.agency as 'metro' | 'bilbobus',
                lat: stop.lat || 0,
                lon: stop.lon || 0
            });
        }
    };

    const handleSwap = () => {
        if (originStop && destStop) {
            hasLoadedRef.current = false;
            router.push(
                `/route?origin=${destStop.id}&originAgency=${destStop.agency}&dest=${originStop.id}&destAgency=${originStop.agency}`
            );
        }
    };

    const getLineColor = (line: string): string => {
        if (line.includes('L1')) return 'bg-orange-500';
        if (line.includes('L2')) return 'bg-green-600';
        if (line.includes('L3')) return 'bg-blue-600';
        return 'bg-slate-500';
    };

    const getCleanLineId = (lineId: string): string => {
        const match = /L[1-3]/.exec(lineId);
        return match ? match[0] : lineId;
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-orange-500 to-red-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
                        <Train className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-slate-600 font-medium">Cargando ruta...</p>
                </div>
            </div>
        );
    }

    if (error || !originStop || !destStop) {
        return (
            <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-slate-100">
                <div className="max-w-2xl mx-auto p-4 pt-8 flex flex-col items-center justify-center min-h-screen gap-4">
                    <AlertCircle className="w-12 h-12 text-red-500" />
                    <h1 className="text-2xl font-bold text-slate-900">{error || 'Error'}</h1>
                    <button
                        onClick={() => router.back()}
                        className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
                    >
                        Volver atrás
                    </button>
                </div>
            </div>
        );
    }

    const isMetro = originStop.agency === 'metro';

    return (
        <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-slate-100 pb-24">
            {/* Header */}
            <div className={`text-white ${isMetro
                    ? 'bg-linear-to-br from-orange-500 via-orange-600 to-red-600'
                    : 'bg-linear-to-br from-green-500 via-green-600 to-emerald-600'
                }`}>
                <div className="max-w-2xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between mb-4">
                        <button
                            onClick={() => router.back()}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h1 className="text-lg font-bold">Ruta planificada</h1>
                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    {/* Route Summary Card */}
                    <div className="bg-white/10 backdrop-blur rounded-2xl p-4">
                        <div className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
                                    <span className="text-xs text-white/70">Origen</span>
                                </div>
                                <p className="font-bold text-white truncate">{originStop.name}</p>
                            </div>

                            <button
                                onClick={handleSwap}
                                className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors shrink-0"
                            >
                                <ArrowRightLeft className="w-5 h-5 text-white" />
                            </button>

                            <div className="flex-1 min-w-0 text-right">
                                <div className="flex items-center justify-end gap-2 mb-1">
                                    <span className="text-xs text-white/70">Destino</span>
                                    <div className="w-3 h-3 rounded-full bg-red-400" />
                                </div>
                                <p className="font-bold text-white truncate">{destStop.name}</p>
                            </div>
                        </div>

                        {lastUpdate && (
                            <div className="flex items-center justify-center gap-2 mt-3 pt-3 border-t border-white/20">
                                <Clock className="w-4 h-4 text-white/70" />
                                <span className="text-xs text-white/70">
                                    Actualizado: {lastUpdate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
                {/* Próximos metros/buses */}
                {arrivals.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="font-bold text-slate-900 flex items-center gap-2">
                                {isMetro ? (
                                    <Train className="w-5 h-5 text-orange-600" />
                                ) : (
                                    <Bus className="w-5 h-5 text-green-600" />
                                )}
                                Próximos {isMetro ? 'metros' : 'buses'}
                            </h2>
                        </div>

                        <div className="divide-y divide-slate-100">
                            {arrivals.slice(0, 6).map((arrival, idx) => (
                                <div
                                    key={`${arrival.lineId}-${arrival.destination}-${idx}`}
                                    className={`p-4 ${idx === 0 ? 'bg-orange-50' : 'hover:bg-slate-50'} transition-colors`}
                                >
                                    <div className="flex items-center gap-3">
                                        {/* Tiempo - Cuadro grande */}
                                        <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0 ${idx === 0 ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-700'}`}>
                                            {arrival.etaMinutes <= 10 ? (
                                                <>
                                                    <span className="text-xl font-bold leading-none">
                                                        {arrival.etaMinutes <= 0 ? '0' : arrival.etaMinutes}
                                                    </span>
                                                    <span className="text-[10px] font-medium opacity-80">min</span>
                                                </>
                                            ) : (
                                                <span className="text-base font-bold leading-tight">{arrival.time}</span>
                                            )}
                                        </div>
                                        
                                        {/* Info central */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${getLineColor(arrival.lineId)}`}>
                                                    {getCleanLineId(arrival.lineId)}
                                                </span>
                                                <span className="text-sm font-semibold text-slate-900 truncate">
                                                    → {arrival.destination}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 text-xs text-slate-500">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {arrival.time}
                                                </span>
                                                <span>•</span>
                                                <span>{arrival.platform}</span>
                                                {arrival.wagons && arrival.wagons > 0 && (
                                                    <>
                                                        <span>•</span>
                                                        <span>{arrival.wagons} vag.</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {/* Estado */}
                                        <div className="shrink-0 text-right">
                                            {idx === 0 && arrival.etaMinutes <= 2 ? (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold animate-pulse">
                                                    ¡Ya llega!
                                                </span>
                                            ) : arrival.etaMinutes > 10 ? (
                                                <span className="text-sm font-medium text-slate-600">
                                                    {arrival.etaMinutes} min
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {arrivals.length === 0 && !isLoading && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                        <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-600 font-medium">No hay {isMetro ? 'metros' : 'buses'} disponibles</p>
                        <p className="text-sm text-slate-400 mt-1">Intenta de nuevo en unos minutos</p>
                        <button
                            onClick={handleRefresh}
                            className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors text-sm font-medium"
                        >
                            Reintentar
                        </button>
                    </div>
                )}

                {/* Favorites */}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={(e) => toggleFavorite(originStop, e)}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${isFavorite(originStop.id, originStop.agency)
                                ? 'bg-orange-50 border-orange-500'
                                : 'bg-white border-slate-200 hover:border-orange-300'
                            }`}
                    >
                        <Heart
                            className={`w-4 h-4 mb-2 ${isFavorite(originStop.id, originStop.agency) ? 'fill-orange-500 text-orange-500' : 'text-slate-400'
                                }`}
                        />
                        <p className="text-xs text-slate-500">Origen</p>
                        <p className="text-sm font-semibold text-slate-900 truncate">{originStop.name}</p>
                    </button>

                    <button
                        onClick={(e) => toggleFavorite(destStop, e)}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${isFavorite(destStop.id, destStop.agency)
                                ? 'bg-orange-50 border-orange-500'
                                : 'bg-white border-slate-200 hover:border-orange-300'
                            }`}
                    >
                        <Heart
                            className={`w-4 h-4 mb-2 ${isFavorite(destStop.id, destStop.agency) ? 'fill-orange-500 text-orange-500' : 'text-slate-400'
                                }`}
                        />
                        <p className="text-xs text-slate-500">Destino</p>
                        <p className="text-sm font-semibold text-slate-900 truncate">{destStop.name}</p>
                    </button>
                </div>

                {/* Info */}
                <div className={`rounded-2xl p-4 border ${isMetro ? 'bg-orange-50 border-orange-100' : 'bg-green-50 border-green-100'
                    }`}>
                    <div className="flex items-start gap-3">
                        <Info className={`w-5 h-5 shrink-0 mt-0.5 ${isMetro ? 'text-orange-500' : 'text-green-500'}`} />
                        <div>
                            <p className={`text-sm font-medium ${isMetro ? 'text-orange-800' : 'text-green-800'}`}>
                                Información en tiempo real
                            </p>
                            <p className={`text-xs mt-1 ${isMetro ? 'text-orange-600' : 'text-green-600'}`}>
                                Los tiempos se actualizan en tiempo real. Pulsa en actualizar para obtener los últimos datos.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Action Button */}
                <button
                    onClick={() => router.push(`/station/${originStop.id}?agency=${originStop.agency}`)}
                    className={`w-full py-3 px-4 text-white rounded-xl transition-colors font-medium ${isMetro ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'
                        }`}
                >
                    Ver detalles de {originStop.name}
                </button>
            </div>
        </div>
    );
}
