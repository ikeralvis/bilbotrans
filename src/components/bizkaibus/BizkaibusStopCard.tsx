'use client';

import { useState, useEffect, useCallback } from 'react';
import { useFavorites } from '@/context/FavoritesContext';
import { useLanguage } from '@/context/LanguageContext';
import { getBizkaibusArrivals, type BizkaibusArrival } from '@/lib/bizkaibus/api';
import { Star, MapPin, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface BizkaibusStopCardProps {
    readonly stopId: string;
    readonly stopName: string;
    readonly municipality?: string;
}

export default function BizkaibusStopCard({ stopId, stopName, municipality }: BizkaibusStopCardProps) {
    const { language } = useLanguage();
    const { favorites, addFavorite, removeFavorite } = useFavorites();
    const [arrivals, setArrivals] = useState<BizkaibusArrival[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isFavorite = favorites.some(fav => fav.id === stopId && fav.agency === 'bizkaibus');

    const fetchArrivals = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await getBizkaibusArrivals(stopId);
            
            if (response.status === 'OK') {
                setArrivals(response.arrivals);
            } else if (response.status === 'NOINFO') {
                setArrivals([]);
                setError(language === 'es' ? 'No hay información disponible' : 'Ez dago informaziorik eskuragarri');
            } else {
                setError(language === 'es' ? 'Error al cargar llegadas' : 'Errorea iritsierak kargatzean');
            }
        } catch (err) {
            console.error('Error fetching Bizkaibus arrivals:', err);
            setError(language === 'es' ? 'Error de conexión' : 'Konexio errorea');
        } finally {
            setLoading(false);
        }
    }, [stopId, language]);

    useEffect(() => {
        fetchArrivals();
        const interval = setInterval(fetchArrivals, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, [fetchArrivals]);

    const handleToggleFavorite = () => {
        if (isFavorite) {
            removeFavorite(stopId, 'bizkaibus');
        } else {
            addFavorite({
                stopId: stopId,
                name: stopName,
                agency: 'bizkaibus',
                lat: 0,
                lon: 0
            });
        }
    };

    const renderLineNumber = (lineId: string) => {
        // Extract just the number/letter if format is like "A3123"
        const regex = /[A-Z]?(\d+)/;
        const match = regex.exec(lineId);
        return match ? match[0] : lineId;
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all hover:border-green-400">
            {/* Header */}
            <div className="p-4 border-b border-slate-100">
                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                        {/* Bizkaibus Logo */}
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-white flex items-center justify-center shrink-0 border border-slate-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                                src="/logoBizkaibus.png" 
                                alt="Bizkaibus" 
                                className="w-9 h-9 object-contain"
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <Link 
                                href={`/bizkaibus/stop/${stopId}`}
                                className="text-slate-900 font-bold text-base hover:text-green-700 transition-colors block"
                            >
                                {stopName}
                            </Link>
                            {municipality && (
                                <div className="flex items-center gap-1 text-slate-500 text-xs mt-0.5">
                                    <MapPin className="w-3 h-3" />
                                    <span>{municipality}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={handleToggleFavorite}
                        className="p-2 rounded-full hover:bg-slate-100 transition-colors"
                        aria-label={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                    >
                        <Star
                            className={`w-5 h-5 ${isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-slate-400'}`}
                        />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 pt-0">
                {loading ? (
                    <div className="flex items-center justify-center py-6">
                        <Loader2 className="w-6 h-6 text-green-600 animate-spin" />
                    </div>
                ) : error ? (
                    <div className="text-center py-4 text-slate-500 text-sm">
                        {error}
                    </div>
                ) : arrivals.length === 0 ? (
                    <div className="text-center py-4 text-slate-500 text-sm">
                        {language === 'es' ? 'No hay buses próximos' : 'Ez dago autobus hurbilrik'}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        {arrivals.slice(0, 4).map((arrival) => (
                            <div
                                key={`${arrival.lineId}-${arrival.destination}-${arrival.etaMinutes}`}
                                className="flex items-center gap-2 bg-white rounded-full pl-1 pr-4 py-2 border border-slate-200 shadow-sm"
                            >
                                {/* SQUARE badge with line number */}
                                <div 
                                    className="w-14 h-8 rounded-lg flex items-center justify-center font-bold text-[11px] shrink-0 ml-0.5"
                                    style={{ backgroundColor: '#22533d', color: 'white' }}
                                >
                                    {renderLineNumber(arrival.lineId)}
                                </div>
                                
                                {/* Destination */}
                                <div className="flex flex-col min-w-0 flex-1">
                                    <span className="text-[14px] font-medium text-slate-600 truncate">
                                        {arrival.destination}
                                    </span>
                                </div>
                                
                                {/* Time */}
                                <div className="flex items-baseline gap-0.5 ml-1">
                                    <span className="font-black leading-none text-[11px]" style={{ color: '#22533d' }}>
                                        {arrival.etaMinutes <= 0 ? '0' : arrival.etaMinutes}
                                    </span>
                                    <span className="text-xs font-bold" style={{ color: '#22533d' }}>&apos;</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
