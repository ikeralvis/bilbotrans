
'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Heart, ArrowLeft, Clock, Loader2, RefreshCw, MapPin, AlertCircle, DoorClosed, Moon, Icon } from 'lucide-react';
import { getStopDetails, getBilbobusArrivalsByStop } from '@/app/actions';
import { TransportCard } from '@/components/TransportCard';
import { useFavorites } from '@/context/FavoritesContext';
import { useGeolocation } from '@/context/GeolocationContext';
import { arrowsUpDownSquare } from '@lucide/lab';
import { getMetroArrivalsByStop, type Exit } from '@/lib/metro/api';
import { getBizkaibusArrivals } from '@/lib/bizkaibus/api';

interface Schedule {
    lineId: string;
    destination: string;
    etaMinutes: number;
    agency: 'metro' | 'bilbobus' | 'bizkaibus' | 'renfe';
    platform?: string;
    wagons?: number;
    duration?: number;
    originExits?: Exit[];
    destinationExits?: Exit[];
}

export default function StationPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const stopId = (params.id as string).replace(/[12]$/, ''); // Normalizar sin plataforma
    const agency = (searchParams.get('agency') || 'metro') as 'metro' | 'bilbobus' | 'bizkaibus' | 'renfe';

    const { addFavorite, removeFavorite, isFavorite } = useFavorites();
    const { calculateDistance, location } = useGeolocation();
    const [stopDetails, setStopDetails] = useState<any>(null);
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);

    const isFav = stopDetails ? isFavorite(stopId, agency) : false;
    const distance = stopDetails && location ? calculateDistance(stopDetails.lat, stopDetails.lon) : null;

    useEffect(() => {
        const loadStopData = async () => {
            try {
                setError(null);
                const details = await getStopDetails(stopId, agency);
                if (!details) {
                    setError('Parada no encontrada');
                    setIsLoading(false);
                    return;
                }
                setStopDetails(details);
                await loadRealSchedules();
            } catch (err) {
                console.error('Error loading stop:', err);
                setError('Error al cargar la parada');
            } finally {
                setIsLoading(false);
            }
        };

        loadStopData();
    }, [stopId, agency]);

    const loadRealSchedules = async () => {
        try {
            if (agency === 'metro') {
                const metroArrivals = await getMetroArrivalsByStop(stopId);
                const transformed: Schedule[] = metroArrivals.map(arrival => ({
                    lineId: arrival.lineId,
                    destination: arrival.destination,
                    etaMinutes: arrival.etaMinutes,
                    agency: 'metro',
                    platform: arrival.platform,
                    wagons: arrival.wagons,
                    duration: arrival.duration,
                    originExits: arrival.originExits,
                    destinationExits: arrival.destinationExits
                }));
                setSchedules(transformed);
            } else if (agency === 'bilbobus') {
                const bbusArrivals = await getBilbobusArrivalsByStop(stopId);
                const transformed: Schedule[] = bbusArrivals.map(arrival => ({
                    lineId: arrival.lineId,
                    destination: arrival.destination,
                    etaMinutes: arrival.etaMinutes,
                    agency: 'bilbobus'
                }));
                setSchedules(transformed);
            } else if (agency === 'bizkaibus') {
                console.log('[Station Page] Loading Bizkaibus arrivals for stop:', stopId);
                const response = await getBizkaibusArrivals(stopId);
                console.log('[Station Page] Bizkaibus response:', response);
                if (response.status === 'OK') {
                    const transformed: Schedule[] = response.arrivals.map(arrival => ({
                        lineId: arrival.lineId,
                        destination: arrival.destination,
                        etaMinutes: arrival.etaMinutes,
                        agency: 'bizkaibus'
                    }));
                    console.log('[Station Page] Transformed schedules:', transformed);
                    setSchedules(transformed);
                } else {
                    console.warn('[Station Page] Bizkaibus response not OK:', response.status, response.error);
                    setSchedules([]);
                }
            } else if (agency === 'renfe') {
                // For Renfe show available lines and a CTA to search itinerarios
                setSchedules([]);
            }
            setLastUpdate(new Date());
        } catch (err) {
            console.error('Error loading schedules:', err);
            setError('No se pudieron cargar los horarios');
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await loadRealSchedules();
        setIsRefreshing(false);
    };

    const handleFavoriteToggle = async () => {
        if (!stopDetails) return;

        if (isFav) {
            await removeFavorite(stopId);
        } else {
            await addFavorite({
                stopId,
                name: stopDetails.name,
                agency,
                lat: stopDetails.lat,
                lon: stopDetails.lon,
            });
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm animate-pulse">
                        <img src="/logo.png" alt="BilboTrans" className="w-7 h-7 object-contain" />
                    </div>
                    <p className="text-sm text-slate-500">Cargando parada...</p>
                </div>
            </div>
        );
    }

    if (error && !stopDetails) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
                <div className="text-center px-4">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                    <p className="text-slate-900 font-semibold mb-2">{error}</p>
                    <button
                        onClick={() => router.back()}
                        className="mt-4 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium transition-all active:scale-95 shadow-sm"
                    >
                        Volver
                    </button>
                </div>
            </div>
        );
    }

    if (!stopDetails) {
        return null;
    }

    // Limitar a 4 trenes máximo por andén
    const schedule1 = schedules.filter(s => s.platform === 'Andén 1').slice(0, 4);
    const schedule2 = schedules.filter(s => s.platform === 'Andén 2').slice(0, 4);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white pb-20">
            {/* Header - Minimalista */}
            <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/50">
                <div className="max-w-2xl mx-auto px-4 py-3">
                    <div className="flex items-center justify-between mb-3">
                        <button
                            onClick={() => router.push(`/?tab=${agency}`)}
                            className="p-2 rounded-xl hover:bg-slate-100 active:scale-90 transition-all"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-600" />
                        </button>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="p-2 rounded-xl hover:bg-slate-100 active:scale-90 transition-all disabled:opacity-50"
                                aria-label="Actualizar"
                            >
                                <RefreshCw className={`w-4 h-4 text-slate-600 ${isRefreshing ? 'animate-spin' : ''}`} />
                            </button>
                            <button
                                onClick={handleFavoriteToggle}
                                className="p-2 rounded-xl hover:bg-slate-100 active:scale-90 transition-all"
                            >
                                <Heart
                                    className="w-5 h-5"
                                    fill={isFav ? 'currentColor' : 'none'}
                                    stroke={isFav ? '#ef4444' : '#cbd5e1'}
                                    color={isFav ? '#ef4444' : '#cbd5e1'}
                                />
                            </button>
                        </div>
                    </div>

                    <h1 className="text-xl font-bold text-slate-900 mb-1">{stopDetails.name}</h1>

                    <div className="flex items-center gap-3 text-xs">
                        <div className={`px-2 py-1 rounded-lg font-semibold text-white ${
                            agency === 'metro' ? 'bg-[#373737]' : 
                            agency === 'bizkaibus' ? 'bg-green-600' : 
                            agency === 'bilbobus' ? 'bg-red-600' : 'bg-purple-600'
                        }`}>
                            {agency === 'metro' ? 'Metro Bilbao' : 
                             agency === 'bizkaibus' ? 'Bizkaibus' :
                             agency === 'bilbobus' ? 'Bilbobus' : 'Renfe'}
                        </div>
                        {distance && (
                            <div className="flex items-center gap-1 text-slate-500">
                                <MapPin className="w-3 h-3" />
                                <span>{distance < 1 ? (distance * 1000).toFixed(0) + ' m' : distance.toFixed(1) + ' km'}</span>
                            </div>
                        )}
                        {lastUpdate && (
                            <div className="flex items-center gap-1 text-slate-400">
                                <Clock className="w-3 h-3" />
                                <span>{lastUpdate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <main className="max-w-2xl mx-auto px-4 py-4 space-y-4">
                {error && (
                    <div className="p-3 rounded-xl bg-yellow-50 border border-yellow-200 flex gap-2 animate-fadeIn">
                        <AlertCircle className="w-4 h-4 text-yellow-700 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-yellow-800">{error}</p>
                    </div>
                )}

                {/* Schedules - Rediseñado minimalista */}
                {agency === 'metro' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Andén 1 */}
                        <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
                            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 px-4 py-2.5 border-b border-blue-100">
                                <div className="flex items-center gap-2">
                                    <span className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">1</span>
                                    <span className="font-bold text-slate-900 text-sm">Andén 1</span>
                                </div>
                            </div>
                            {schedule1.length === 0 ? (
                                <div className="text-center py-8 px-3">
                                    <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                    <p className="text-sm font-medium text-slate-600">Sin trenes</p>
                                    <p className="text-xs text-slate-400 mt-1">Servicio cerrado</p>
                                </div>
                            ) : (
                                <div className="p-3 space-y-2">
                                    {schedule1.map((schedule, idx) => (
                                        <TransportCard
                                            key={idx}
                                            agency={schedule.agency}
                                            lineId={schedule.lineId}
                                            destination={schedule.destination}
                                            etaMinutes={schedule.etaMinutes}
                                            wagons={schedule.wagons}
                                            duration={schedule.duration}
                                            originExits={schedule.originExits}
                                            destinationExits={schedule.destinationExits}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Andén 2 */}
                        <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
                            <div className="bg-gradient-to-r from-orange-50 to-amber-50 px-4 py-2.5 border-b border-orange-100">
                                <div className="flex items-center gap-2">
                                    <span className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">2</span>
                                    <span className="font-bold text-slate-900 text-sm">Andén 2</span>
                                </div>
                            </div>
                            {schedule2.length === 0 ? (
                                <div className="text-center py-8 px-3">
                                    <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                    <p className="text-sm font-medium text-slate-600">Sin trenes</p>
                                    <p className="text-xs text-slate-400 mt-1">Servicio cerrado</p>
                                </div>
                            ) : (
                                <div className="p-3 space-y-2">
                                    {schedule2.map((schedule, idx) => (
                                        <TransportCard
                                            key={idx}
                                            agency={schedule.agency}
                                            lineId={schedule.lineId}
                                            destination={schedule.destination}
                                            etaMinutes={schedule.etaMinutes}
                                            wagons={schedule.wagons}
                                            duration={schedule.duration}
                                            originExits={schedule.originExits}
                                            destinationExits={schedule.destinationExits}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {agency === 'bilbobus' && (
                    <div className="space-y-3">
                        <h2 className="text-sm font-semibold text-slate-600 px-1">Próximos autobuses</h2>
                        {schedules.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                                <Clock className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                                <p className="text-sm text-slate-600 font-medium">No hay horarios disponibles</p>
                                <p className="text-xs text-slate-400 mt-1">API de Bilbobus aún en desarrollo</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {schedules.map((schedule, idx) => (
                                    <TransportCard
                                        key={idx}
                                        agency={schedule.agency}
                                        lineId={schedule.lineId}
                                        destination={schedule.destination}
                                        etaMinutes={schedule.etaMinutes}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {agency === 'bizkaibus' && (
                    <div className="space-y-3">
                        <h2 className="text-sm font-semibold text-slate-600 px-1">Próximos autobuses</h2>
                        {schedules.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-50 flex items-center justify-center">
                                    <Clock className="w-8 h-8 text-green-600" />
                                </div>
                                <p className="text-sm text-slate-700 font-semibold">Sin servicio actualmente</p>
                                <p className="text-xs text-slate-500 mt-1">No hay autobuses previstos en esta parada</p>
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {schedules.map((schedule, idx) => (
                                    <TransportCard
                                        key={`bizkaibus-${schedule.lineId}-${idx}`}
                                        agency={schedule.agency}
                                        lineId={schedule.lineId}
                                        destination={schedule.destination}
                                        etaMinutes={schedule.etaMinutes}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {agency === 'renfe' && (
                    <div className="space-y-4">
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center shadow-sm">
                            <h2 className="text-lg font-bold text-slate-900">Renfe Cercanías</h2>
                            <p className="text-sm text-slate-500 mt-2 mb-4">Accede a itinerarios entre estaciones y guarda tus paradas favoritas.</p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => router.push('/?origin=&dest=&')}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium transition-all active:scale-95 shadow-sm"
                                >
                                    Buscar itinerario
                                </button>
                                <button
                                    onClick={() => router.push('/renfe/route')}
                                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-all active:scale-95"
                                >
                                    Ver itinerarios
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Información de Salidas - Más compacto */}
                {agency === 'metro' && schedule1.length > 0 && schedule1[0].originExits && schedule1[0].originExits.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                            <DoorClosed className="w-4 h-4 text-slate-600" />
                            Salidas disponibles
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {schedule1[0].originExits.map((exit, idx) => (
                                <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 text-xs text-slate-700">
                                    <div className="flex gap-1 shrink-0">
                                        {exit.elevator && (
                                            <span className="w-5 h-5 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center" title="Ascensor">
                                                <Icon iconNode={arrowsUpDownSquare} className="w-3 h-3" />
                                            </span>
                                        )}
                                        {exit.nocturnal && (
                                            <span className="w-5 h-5 rounded bg-indigo-100 text-indigo-700 flex items-center justify-center" title="Nocturno">
                                                <Moon className="w-3 h-3" />
                                            </span>
                                        )}
                                    </div>
                                    <span className="flex-1 truncate">{exit.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
