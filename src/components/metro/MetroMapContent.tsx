'use client';

import { MapContainer, TileLayer, Polyline, Marker, Popup, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { Train as TrainIcon } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet tile loading issues
import { useEffect } from 'react';

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

interface MetroMapContentProps {
    trains: TrainInfo[];
}

export default function MetroMapContent({ trains }: MetroMapContentProps) {
    const lines = Object.values(stationsData) as any[];

    // Crear iconos para trenes
    const createTrainIcon = (color: string) => {
        return L.divIcon({
            className: 'custom-train-marker',
            html: `
        <div class="relative animate-pulse">
          <div class="w-10 h-10 rounded-full shadow-2xl flex items-center justify-center border-4 border-white" 
               style="background-color: ${color}">
            <img src="/iconoMetroMapa.png" class="w-6 h-6" alt="Metro" />
          </div>
          <div class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-white"></div>
        </div>
      `,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });
    };

    const trainIcons: Record<string, L.DivIcon> = {
        L1: createTrainIcon('#f14e2d'),
        L2: createTrainIcon('#242324'),
        L3: createTrainIcon('#0ea5e9')
    };

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

    return (
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
                        icon={trainIcons[train.lineId] || trainIcons.L1}
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
    );
}
