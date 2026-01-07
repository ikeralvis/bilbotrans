'use client';

import { MapPin, Loader2 } from 'lucide-react';
import { useGeolocation } from '@/context/GeolocationContext';

interface NearbyStopsProps {
    stops: Array<{
        id: string;
        name: string;
        agency: 'metro' | 'bilbobus';
        lat: number;
        lon: number;
    }>;
    onSelectStop?: (stopId: string, agency: string) => void;
    isLoading?: boolean;
}

export function NearbyStops({ stops, onSelectStop, isLoading = false }: NearbyStopsProps) {
    const { location, requestLocation, isLoading: geoLoading, calculateDistance } = useGeolocation();

    const sortedStops = location
        ? [...stops].sort((a, b) => {
            const distA = calculateDistance(a.lat, a.lon);
            const distB = calculateDistance(b.lat, b.lon);
            return distA - distB;
        }).slice(0, 5)
        : stops.slice(0, 5);

    const handleRequestLocation = () => {
        requestLocation();
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-semibold text-slate-600 tracking-wide">Paradas Cercanas</h3>
                {!location && (
                    <button
                        onClick={handleRequestLocation}
                        disabled={geoLoading}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-blue-50 hover:bg-blue-100 
                                 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {geoLoading ? (
                            <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                        ) : (
                            <MapPin className="w-3 h-3 text-blue-600" />
                        )}
                        <span className="text-xs font-medium text-blue-600">Detectar</span>
                    </button>
                )}
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-8">
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
                        <p className="text-sm text-slate-400">Cargando paradas...</p>
                    </div>
                </div>
            ) : sortedStops.length === 0 ? (
                <div className="text-center py-8">
                    <MapPin className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">No hay paradas disponibles</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {sortedStops.map((stop, idx) => {
                        const distance = location ? calculateDistance(stop.lat, stop.lon) : null;
                        const agencyColor = stop.agency === 'metro' ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600';

                        return (
                            <button
                                key={stop.id}
                                onClick={() => onSelectStop?.(stop.id, stop.agency)}
                                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 
                                         hover:bg-slate-100 active:scale-95 transition-all border border-slate-100"
                            >
                                <div className="flex items-center gap-3 flex-1">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-sm ${agencyColor}`}>
                                        {idx + 1}
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-medium text-slate-900">{stop.name}</p>
                                        {distance && (
                                            <p className="text-xs text-slate-500">
                                                {distance < 1 ? (distance * 1000).toFixed(0) + ' m' : distance.toFixed(2) + ' km'}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
