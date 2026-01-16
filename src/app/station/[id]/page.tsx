
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

interface Schedule {
    lineId: string;
    destination: string;
    etaMinutes: number;
    agency: 'metro' | 'bilbobus';
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
    const agency = (searchParams.get('agency') || 'metro') as 'metro' | 'bilbobus';

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
            await removeFavorite(stopId, agency);
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
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
                    <p className="text-sm text-slate-500">Cargando parada...</p>
                </div>
            </div>
        );
    }

    if (error && !stopDetails) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                    <p className="text-slate-900 font-semibold mb-2">{error}</p>
                    <button
                        onClick={() => router.back()}
                        className="mt-4 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-all active:scale-95"
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

    // Limitar a 3 trenes máximo por andén
    const schedule1 = schedules.filter(s => s.platform === 'Andén 1').slice(0, 3);
    const schedule2 = schedules.filter(s => s.platform === 'Andén 2').slice(0, 3);

    return (
        <div className="min-h-screen bg-white pb-20">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100">
                <div className="max-w-2xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between mb-3">
                        <button
                            onClick={() => router.back()}
                            className="p-2 rounded-lg hover:bg-slate-100 active:scale-90 transition-all"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-600" />
                        </button>

                        <button
                            onClick={handleFavoriteToggle}
                            className="p-2 rounded-lg hover:bg-slate-100 active:scale-90 transition-all"
                        >
                            <Heart
                                className="w-5 h-5"
                                fill={isFav ? 'currentColor' : 'none'}
                                stroke={isFav ? '#ef4444' : '#cbd5e1'}
                                color={isFav ? '#ef4444' : '#cbd5e1'}
                            />
                        </button>
                    </div>

                    <h1 className="text-2xl font-bold text-slate-900 mb-2">{stopDetails.name}</h1>

                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <div
                            className={`px-2 py-1 rounded-lg font-semibold text-white text-xs ${agency === 'metro' ? 'bg-orange-500' : 'bg-red-600'
                                }`}
                        >
                            {agency === 'metro' ? 'Metro Bilbao' : 'Bilbobus'}
                        </div>
                        {distance && (
                            <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                <span>{distance < 1 ? (distance * 1000).toFixed(0) + ' m' : distance.toFixed(1) + ' km'}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
                {error && (
                    <div className="p-4 rounded-xl bg-yellow-50 border border-yellow-200 flex gap-3">
                        <AlertCircle className="w-5 h-5 text-yellow-700 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-yellow-800">{error}</p>
                    </div>
                )}

                {/* Refresh Button */}
                <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl 
                             bg-blue-50 hover:bg-blue-100 active:scale-95 transition-all 
                             text-blue-600 font-medium text-sm disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span>{isRefreshing ? 'Actualizando...' : 'Actualizar horarios'}</span>
                </button>

                {lastUpdate && (
                    <p className="text-xs text-slate-400 text-center">
                        Actualizado: {lastUpdate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                )}

                {/* Schedules */}
                {agency === 'metro' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Andén 1 */}
                        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                            <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">1</span>
                                Andén 1
                            </h2>
                            {schedule1.length === 0 ? (
                                <div className="text-center py-6 px-2 bg-slate-50 rounded-lg">
                                    <Clock className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                                    <p className="text-sm font-medium text-slate-600">Sin trenes disponibles</p>
                                    <p className="text-xs text-slate-500 mt-1">Metro cerrado o sin servicio</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
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
                        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                            <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 font-semibold">2</span>
                                Andén 2
                            </h2>
                            {schedule2.length === 0 ? (
                                <div className="text-center py-6 px-2 bg-slate-50 rounded-lg">
                                    <Clock className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                                    <p className="text-sm font-medium text-slate-600">Sin trenes disponibles</p>
                                    <p className="text-xs text-slate-500 mt-1">Metro cerrado o sin servicio</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
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
                            <div className="text-center py-8">
                                <Clock className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                                <p className="text-sm text-slate-400">No hay horarios disponibles</p>
                                <p className="text-xs text-slate-400 mt-2">API de Bilbobus aún en desarrollo</p>
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

                {agency === 'renfe' && (
                    <div className="space-y-4">
                        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                            <h2 className="text-lg font-semibold text-slate-900">Renfe Cercanías</h2>
                            <p className="text-sm text-slate-500 mt-1">Accede a itinerarios entre estaciones y guarda tus paradas favoritas.</p>
                            <div className="mt-4 flex gap-3">
                                <button
                                    onClick={() => router.push('/?origin=&dest=&')}
                                    className="flex-1 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-medium"
                                >
                                    Buscar itinerario
                                </button>
                                <button
                                    onClick={() => router.push('/renfe/route')}
                                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                                >
                                    Ver itinerarios
                                </button>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-slate-200 p-4">
                            <h3 className="text-sm font-semibold text-slate-600 mb-2">Líneas</h3>
                            <p className="text-xs text-slate-500">Consulta las líneas disponibles para esta estación o busca un itinerario.</p>
                        </div>
                    </div>
                )}

                {/* Información de Salidas */}
                {agency === 'metro' && schedule1.length > 0 && (schedule1[0].originExits || schedule1[0].destinationExits) && (
                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                        <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                            <DoorClosed className="w-5 h-5 text-slate-700" />
                            Salidas y Accesos
                        </h2>

                        {schedule1[0].originExits && schedule1[0].originExits.length > 0 && (
                            <div className="mb-4">
                                <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                                    Salidas disponibles
                                </h3>
                                <div className="space-y-2">
                                    {schedule1[0].originExits.map((exit, idx) => (
                                        <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                                            <div className="flex gap-1 flex-shrink-0 mt-0.5">
                                                {exit.elevator && (
                                                    <span
                                                        className="inline-flex items-center justify-center w-5 h-5 rounded bg-green-100 text-green-700"
                                                        title="Ascensor disponible"
                                                    >
                                                        <Icon iconNode={arrowsUpDownSquare} />
                                                    </span>
                                                )}
                                                {exit.nocturnal && (
                                                    <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-blue-100 text-blue-700" title="Acceso nocturno">
                                                        <Moon className="w-3 h-3" />
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-700 leading-tight flex-1">
                                                {exit.name}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
