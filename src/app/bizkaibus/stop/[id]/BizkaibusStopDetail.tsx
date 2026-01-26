'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useFavorites } from '@/context/FavoritesContext';
import { useLanguage } from '@/context/LanguageContext';
import { getBizkaibusArrivals, type BizkaibusArrival, type BizkaibusStop } from '@/lib/bizkaibus/api';
import { Bus, Star, ArrowLeft, RefreshCw, MapPin, Clock, AlertCircle } from 'lucide-react';

interface BizkaibusStopDetailProps {
    readonly stop: BizkaibusStop;
}

export default function BizkaibusStopDetail({ stop }: BizkaibusStopDetailProps) {
    const router = useRouter();
    const { language } = useLanguage();
    const { favorites, addFavorite, removeFavorite } = useFavorites();
    const [arrivals, setArrivals] = useState<BizkaibusArrival[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const isFavorite = favorites.some(fav => fav.id === stop.id && fav.agency === 'bizkaibus');

    const fetchArrivals = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await getBizkaibusArrivals(stop.id);

            if (response.status === 'OK') {
                setArrivals(response.arrivals);
            } else if (response.status === 'NOINFO') {
                setArrivals([]);
                setError(language === 'es' ? 'No hay información disponible para esta parada' : 'Ez dago informaziorik eskuragarri geltoki honetarako');
            } else {
                setError(language === 'es' ? 'Error al cargar las llegadas' : 'Errorea iritsierak kargatzean');
            }
        } catch (err) {
            console.error('Error fetching arrivals:', err);
            setError(language === 'es' ? 'Error de conexión' : 'Konexio errorea');
        } finally {
            setLoading(false);
        }
    }, [stop.id, language]);

    useEffect(() => {
        fetchArrivals();
        const interval = setInterval(fetchArrivals, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, [fetchArrivals]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchArrivals();
        setTimeout(() => setRefreshing(false), 500);
    };

    const handleToggleFavorite = () => {
        if (isFavorite) {
            removeFavorite(stop.id);
        } else {
            addFavorite({
                stopId: stop.id,
                name: stop.name,
                agency: 'bizkaibus',
                lat: stop.lat,
                lon: stop.lon
            });
        }
    };

    const getTimeColor = (minutes: number) => {
        if (minutes <= 2) return 'text-red-600 bg-red-50 border-red-200';
        if (minutes <= 8) return 'text-orange-600 bg-orange-50 border-orange-200';
        return 'text-green-700 bg-green-50 border-green-200';
    };

    const renderLineNumber = (lineId: string) => {
        const regex = /[A-Z]?(\d+)/;
        const match = regex.exec(lineId);
        return match ? match[0] : lineId;
    };

    // Group arrivals by line
    const groupedArrivals = arrivals.reduce((acc, arrival) => {
        if (!acc[arrival.lineId]) {
            acc[arrival.lineId] = [];
        }
        acc[arrival.lineId].push(arrival);
        return acc;
    }, {} as Record<string, BizkaibusArrival[]>);

    return (
        <div className="min-h-screen bg-linear-to-b from-green-50 to-white">
            {/* Header */}
            <div className="bg-linear-to-r from-green-600 to-green-500 text-white sticky top-0 z-10 shadow-md">
                <div className="max-w-2xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between mb-4">
                        <button
                            onClick={() => router.back()}
                            className="p-2 hover:bg-white/20 rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleRefresh}
                                disabled={refreshing}
                                className="p-2 hover:bg-white/20 rounded-full transition-colors disabled:opacity-50"
                            >
                                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                            </button>
                            <button
                                onClick={handleToggleFavorite}
                                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                            >
                                <Star className={`w-5 h-5 ${isFavorite ? 'fill-yellow-300 text-yellow-300' : ''}`} />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                            <Bus className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold mb-1">{stop.name}</h1>
                            <div className="flex items-center gap-2 text-green-50">
                                <MapPin className="w-4 h-4" />
                                <span className="text-sm">{stop.municipality}</span>
                                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                                    ID: {stop.id}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-2xl mx-auto px-4 py-6">
                {loading && arrivals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <div className="relative">
                            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                                <img 
                                    src="/icons/icon-512x512.png" 
                                    alt="BilboTrans" 
                                    className="w-10 h-10"
                                />
                            </div>
                            <div className="absolute inset-0 rounded-full border-4 border-green-600 border-t-transparent animate-spin"></div>
                        </div>
                        <p className="mt-4 text-gray-600 text-sm">
                            {language === 'es' ? 'Cargando llegadas...' : 'Iritsierak kargatzen...'}
                        </p>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                        <p className="text-red-800 font-medium mb-2">
                            {language === 'es' ? 'Error al cargar' : 'Errorea kargatzean'}
                        </p>
                        <p className="text-red-600 text-sm">{error}</p>
                        <button
                            onClick={handleRefresh}
                            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                            {language === 'es' ? 'Reintentar' : 'Saiatu berriro'}
                        </button>
                    </div>
                ) : arrivals.length === 0 ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center">
                        <Bus className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600 font-medium mb-1">
                            {language === 'es' ? 'No hay buses próximos' : 'Ez dago autobus hurbilrik'}
                        </p>
                        <p className="text-gray-500 text-sm">
                            {language === 'es' ? 'Vuelve a intentarlo más tarde' : 'Saiatu beranduago'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-green-600" />
                                {language === 'es' ? 'Próximas llegadas' : 'Hurrengo iritsierak'}
                            </h2>
                            <span className="text-sm text-gray-500">
                                {arrivals.length} {language === 'es' ? 'buses' : 'autobus'}
                            </span>
                        </div>

                        {/* Arrivals by Line */}
                        {Object.entries(groupedArrivals).map(([lineId, lineArrivals], idx) => (
                            <div key={lineId} className="bg-white rounded-2xl shadow-sm border border-green-100 overflow-hidden">
                                {/* Line Header */}
                                <div className="bg-linear-to-r from-green-600 to-green-500 p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white text-green-600 font-bold">
                                            {renderLineNumber(lineId)}
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-white font-semibold">
                                                {language === 'es' ? 'Línea' : 'Lerroa'} {renderLineNumber(lineId)}
                                            </div>
                                            <div className="text-green-50 text-sm">
                                                {lineArrivals[0].destination}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Arrivals */}
                                <div className="p-4 space-y-2">
                                    {lineArrivals.map((arrival, arrivalIdx) => (
                                        <div
                                            key={`${lineId}-${arrivalIdx}`}
                                            className={`flex items-center justify-between p-3 rounded-xl border ${
                                                arrivalIdx === 0 ? 'border-l-4 border-l-orange-500' : ''
                                            } ${getTimeColor(arrival.etaMinutes)}`}
                                        >
                                            <div className="flex-1">
                                                <div className="font-medium text-sm">
                                                    {arrival.destination}
                                                </div>
                                                {arrival.nextEtaDisplay && arrivalIdx === 0 && (
                                                    <div className="text-xs opacity-75 mt-1">
                                                        {language === 'es' ? 'Siguiente' : 'Hurrengoa'}: {arrival.nextEtaDisplay}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <div className="text-2xl font-bold">
                                                    {arrival.etaDisplay}
                                                </div>
                                                {arrivalIdx === 0 && (
                                                    <span className="text-[10px] px-2 py-0.5 bg-orange-500 text-white rounded-full font-medium">
                                                        {language === 'es' ? 'PRÓXIMO' : 'HURRENGOA'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Info */}
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-2xl text-sm text-green-800">
                    <p className="flex items-start gap-2">
                        <Clock className="w-4 h-4 mt-0.5 shrink-0" />
                        <span>
                            {language === 'es'
                                ? 'Los tiempos se actualizan automáticamente cada 30 segundos'
                                : 'Denborak 30 segunduro eguneratzen dira automatikoki'}
                        </span>
                    </p>
                </div>
            </div>
        </div>
    );
}
