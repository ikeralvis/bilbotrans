'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapContainer, TileLayer, Polyline, Marker, Popup, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { ArrowLeft, Loader2, RefreshCw, Train as TrainIcon } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Import station data
import stationsData from '@/data/metro/stations.json';

interface TrainInfo {
    lineId: string;
    trainId: string;
    destination: string;
    currentStation: string;
    nextStation: string;
    etaMinutes: number;
}

export default function MetroMapPage() {
    const router = useRouter();
    const [trains, setTrains] = useState<TrainInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);

    const lines = Object.values(stationsData) as any[];

    // Crear iconos para trenes
    const createTrainIcon = (color: string) => {
        return L.divIcon({
            className: 'custom-train-marker',
            html: `
        <div class="relative animate-pulse">
          <div class="w-10 h-10 rounded-full shadow-2xl flex items-center justify-center border-4 border-white" 
               style="background-color: ${color}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
              <rect x="3" y="6" width="18" height="12" rx="2"/>
              <path d="M3 10h18"/>
              <circle cx="8" cy="16" r="1.5" fill="white"/>
              <circle cx="16" cy="16" r="1.5" fill="white"/>
            </svg>
          </div>
          <div class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-white"></div>
        </div>
      `,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });
    };

    const trainIcons: Record<string, L.DivIcon> = {
        L1: createTrainIcon('#f97316'),
        L2: createTrainIcon('#16a34a')
    };

    const updateTrains = async () => {
        try {
            setIsRefreshing(true);
            setError(null);

            const response = await fetch('/api/metro/trains');
            if (!response.ok) throw new Error('Failed to fetch trains');

            const data = await response.json();
            setTrains(data.trains || []);
            setLastUpdate(new Date());
        } catch (err) {
            console.error('Error updating trains:', err);
            setError('Error al cargar los trenes');
        } finally {
            setIsRefreshing(false);
            setIsLoading(false);
        }
    };

    useEffect(() => {
        updateTrains();
        const interval = setInterval(updateTrains, 30000);
        return () => clearInterval(interval);
    }, []);

    // Calcular posición del tren
    const getTrainPosition = (train: TrainInfo) => {
        const line = lines.find(l => l.id === train.lineId);
        if (!line) return null;

        const currentIdx = line.stations.findIndex((s: any) => s.code === train.currentStation);
        const nextIdx = line.stations.findIndex((s: any) => s.code === train.nextStation);

        if (currentIdx === -1 || nextIdx === -1) return null;

        const current = line.stations[currentIdx];
        const next = line.stations[nextIdx];

        // Si ETA = 0, está en la estación
        if (train.etaMinutes === 0) {
            return { lat: current.lat, lon: current.lon };
        }

        // Interpolar posición (asumiendo 3 min entre estaciones)
        const progress = Math.max(0, Math.min(1, 1 - (train.etaMinutes / 3)));
        const lat = current.lat + (next.lat - current.lat) * progress;
        const lon = current.lon + (next.lon - current.lon) * progress;

        return { lat, lon };
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-orange-500 mx-auto mb-4" />
                    <p className="text-lg font-semibold text-slate-700">Cargando mapa del metro...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen flex flex-col bg-slate-900">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-700" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900">Mapa del Metro en Tiempo Real</h1>
                        <p className="text-xs text-slate-500">
                            {trains.length} {trains.length === 1 ? 'tren' : 'trenes'} en circulación
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {lastUpdate && (
                        <span className="text-xs text-slate-500">
                            {lastUpdate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    )}
                    <button
                        onClick={updateTrains}
                        disabled={isRefreshing}
                        className="p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-50"
                        title="Actualizar"
                    >
                        <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Map */}
            <div className="flex-1 relative">
                {error && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
                        {error}
                    </div>
                )}

                {/* Legend */}
                <div className="absolute bottom-6 left-6 z-[1000] bg-white/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-xl border border-slate-200">
                    <h3 className="text-xs font-bold text-slate-700 mb-2">Líneas</h3>
                    <div className="space-y-2">
                        {lines.map((line: any) => (
                            <div key={line.id} className="flex items-center gap-2">
                                <div
                                    className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                                    style={{ backgroundColor: line.color }}
                                />
                                <span className="text-sm font-medium text-slate-700">{line.id}</span>
                                <span className="text-xs text-slate-500">({line.stations.length} estaciones)</span>
                            </div>
                        ))}
                    </div>
                </div>

                <MapContainer
                    center={[43.2627, -2.9253]}
                    zoom={12}
                    className="h-full w-full"
                    zoomControl={true}
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; OpenStreetMap'
                    />

                    {/* Líneas del metro */}
                    {lines.map((line: any) => {
                        const coordinates: [number, number][] = line.stations.map((s: any) => [s.lat, s.lon]);
                        return (
                            <Polyline
                                key={line.id}
                                positions={coordinates}
                                color={line.color}
                                weight={6}
                                opacity={0.9}
                            />
                        );
                    })}

                    {/* Estaciones - más pequeñas y discretas */}
                    {lines.map((line: any) =>
                        line.stations.map((station: any) => (
                            <CircleMarker
                                key={`${line.id}-${station.code}`}
                                center={[station.lat, station.lon]}
                                radius={5}
                                fillColor="white"
                                fillOpacity={1}
                                color={line.color}
                                weight={2}
                            >
                                <Popup>
                                    <div className="text-center">
                                        <p className="font-bold text-sm">{station.name}</p>
                                        <p className="text-xs text-slate-500">{line.id}</p>
                                    </div>
                                </Popup>
                            </CircleMarker>
                        ))
                    )}

                    {/* Trenes - grandes y visibles */}
                    {trains.map(train => {
                        const position = getTrainPosition(train);
                        if (!position) return null;

                        return (
                            <Marker
                                key={train.trainId}
                                position={[position.lat, position.lon]}
                                icon={trainIcons[train.lineId]}
                                zIndexOffset={1000}
                            >
                                <Popup>
                                    <div className="text-center min-w-[140px]">
                                        <div className="flex items-center justify-center gap-2 mb-2">
                                            <TrainIcon className="w-4 h-4" style={{ color: lines.find(l => l.id === train.lineId)?.color }} />
                                            <p className="font-bold text-sm">Línea {train.lineId}</p>
                                        </div>
                                        <p className="text-xs text-slate-600 mb-1">→ {train.destination}</p>
                                        <p className="text-xs text-slate-500">
                                            {train.currentStation} → {train.nextStation}
                                        </p>
                                        <p className="text-sm font-bold text-orange-600 mt-2">
                                            {train.etaMinutes === 0 ? '🚉 En estación' : `⏱️ ${train.etaMinutes} min`}
                                        </p>
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}
                </MapContainer>
            </div>
        </div>
    );
}
