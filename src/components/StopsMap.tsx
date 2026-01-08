'use client';

import dynamic from 'next/dynamic';
import { useGeolocation } from '@/context/GeolocationContext';
import { useMemo } from 'react';
import { MapPin, Loader2 } from 'lucide-react';

import { StopLocation } from '@/types/transport';

interface StopsMapProps {
    readonly stops: StopLocation[];
    readonly selectedStopId?: string;
    readonly onSelectStop?: (stopId: string, agency: string) => void;
}

// Importar dinámicamente para evitar errores de SSR
const MapComponent = dynamic(
    () => import('./MapComponent'),
    {
        loading: () => (
            <div className="w-full h-96 rounded-xl bg-slate-100 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                    <p className="text-sm text-slate-400">Cargando mapa...</p>
                </div>
            </div>
        ),
        ssr: false
    }
);

export function StopsMap({ stops, selectedStopId, onSelectStop }: StopsMapProps) {
    const { location, requestLocation, isLoading: geoLoading } = useGeolocation();

    const mapData = useMemo(() => ({
        stops,
        userLocation: location ? { lat: location.lat, lon: location.lon } : null,
        selectedStopId
    }), [stops, location, selectedStopId]);

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-semibold text-slate-600 tracking-wide">Ver en Mapa</h3>
                {!location && (
                    <button
                        onClick={requestLocation}
                        disabled={geoLoading}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-blue-50 hover:bg-blue-100 
                                 active:scale-95 transition-all disabled:opacity-50"
                    >
                        <MapPin className="w-3 h-3 text-blue-600" />
                        <span className="text-xs font-medium text-blue-600">Ubicarme</span>
                    </button>
                )}
            </div>

            <MapComponent
                {...mapData}
                onSelectStop={onSelectStop}
            />
        </div>
    );
}
