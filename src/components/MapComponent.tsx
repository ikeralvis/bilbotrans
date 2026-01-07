'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import 'leaflet/dist/leaflet.css';

interface StopLocation {
    id: string;
    name: string;
    agency: 'metro' | 'bilbobus';
    lat: number;
    lon: number;
}

interface MapComponentProps {
    stops: StopLocation[];
    userLocation: { lat: number; lon: number } | null;
    selectedStopId?: string;
    onSelectStop?: (stopId: string, agency: string) => void;
}

// Dynamic import for Leaflet to prevent SSR issues
const DynamicMapContent = dynamic(() => import('./MapContent'), {
    loading: () => (
        <div className="w-full h-96 rounded-xl bg-slate-100 flex items-center justify-center">
            <div className="text-slate-500">Cargando mapa...</div>
        </div>
    ),
    ssr: false
});

export default function MapComponent(props: MapComponentProps) {
    return (
        <div className="w-full h-96 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
            <Suspense
                fallback={
                    <div className="w-full h-full flex items-center justify-center bg-slate-100">
                        <div className="text-slate-500">Cargando mapa...</div>
                    </div>
                }
            >
                <DynamicMapContent {...props} />
            </Suspense>
        </div>
    );
}
