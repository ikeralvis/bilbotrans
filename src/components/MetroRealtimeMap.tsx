'use client';

import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Train, Loader2, RefreshCw } from 'lucide-react';
import { getAllTrainPositions, getMetroLines, TrainPosition, MetroLine } from '@/lib/metro/trainPosition';
import 'leaflet/dist/leaflet.css';

interface Props {
    autoUpdate?: boolean;
    updateInterval?: number; // ms
    className?: string;
}

// Componente para centrar el mapa automáticamente
function MapBounds({ lines }: { lines: MetroLine[] }) {
    const map = useMap();

    useEffect(() => {
        if (lines.length > 0) {
            const allCoords: [number, number][] = [];
            lines.forEach(line => {
                line.stations.forEach(station => {
                    allCoords.push([station.lat, station.lon]);
                });
            });

            if (allCoords.length > 0) {
                const bounds = L.latLngBounds(allCoords);
                map.fitBounds(bounds, { padding: [50, 50] });
            }
        }
    }, [lines, map]);

    return null;
}

export function MetroRealtimeMap({
    autoUpdate = true,
    updateInterval = 30000,
    className = ''
}: Props) {
    const [trains, setTrains] = useState<TrainPosition[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

    const lines = useMemo(() => getMetroLines(), []);

    // Crear iconos para estaciones
    const stationIcon = useMemo(() => {
        return L.divIcon({
            className: 'custom-station-marker',
            html: `
        <div class="w-3 h-3 rounded-full bg-white border-2 border-slate-400 shadow-sm"></div>
      `,
            iconSize: [12, 12],
            iconAnchor: [6, 6]
        });
    }, []);

    // Crear iconos para trenes por línea
    const trainIcons = useMemo(() => {
        const icons: Record<string, L.DivIcon> = {};
        lines.forEach(line => {
            icons[line.id] = L.divIcon({
                className: 'custom-train-marker',
                html: `
          <div class="relative">
            <div class="w-6 h-6 rounded-full shadow-lg flex items-center justify-center animate-pulse" 
                 style="background-color: ${line.color}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
                <rect x="3" y="6" width="18" height="12" rx="2"/>
                <path d="M3 10h18"/>
                <circle cx="8" cy="16" r="1" fill="white"/>
                <circle cx="16" cy="16" r="1" fill="white"/>
              </svg>
            </div>
          </div>
        `,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });
        });
        return icons;
    }, [lines]);

    const updateTrains = async () => {
        try {
            setIsRefreshing(true);
            const positions = await getAllTrainPositions();
            setTrains(positions);
            setLastUpdate(new Date());
        } catch (error) {
            console.error('Error updating train positions:', error);
        } finally {
            setIsRefreshing(false);
            setIsLoading(false);
        }
    };

    useEffect(() => {
        updateTrains();

        if (autoUpdate) {
            const interval = setInterval(updateTrains, updateInterval);
            return () => clearInterval(interval);
        }
    }, [autoUpdate, updateInterval]);

    if (isLoading) {
        return (
            <div className={`flex items-center justify-center h-96 bg-slate-50 rounded-xl ${className}`}>
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-2" />
                    <p className="text-sm text-slate-600">Cargando mapa del metro...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`relative ${className}`}>
            {/* Header con info y botón de refresh */}
            <div className="absolute top-4 left-4 right-4 z-[1000] flex items-center justify-between gap-2">
                <div className="bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-slate-200">
                    <div className="flex items-center gap-2">
                        <Train className="w-4 h-4 text-orange-500" />
                        <span className="text-sm font-semibold text-slate-900">
                            {trains.length} {trains.length === 1 ? 'tren' : 'trenes'} en circulación
                        </span>
                    </div>
                    {lastUpdate && (
                        <p className="text-xs text-slate-500 mt-0.5">
                            Actualizado: {lastUpdate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                    )}
                </div>

                <button
                    onClick={updateTrains}
                    disabled={isRefreshing}
                    className="bg-white/95 backdrop-blur-sm rounded-lg p-2.5 shadow-lg border border-slate-200 
                     hover:bg-white transition-colors disabled:opacity-50"
                    title="Actualizar posiciones"
                >
                    <RefreshCw className={`w-4 h-4 text-slate-700 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Leyenda de líneas */}
            <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-slate-200">
                <div className="space-y-1.5">
                    {lines.map(line => (
                        <div key={line.id} className="flex items-center gap-2">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: line.color }}
                            />
                            <span className="text-xs font-medium text-slate-700">{line.id}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Mapa */}
            <MapContainer
                center={[43.2627, -2.9253]}
                zoom={12}
                className="h-96 w-full rounded-xl"
                zoomControl={true}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />

                <MapBounds lines={lines} />

                {/* Líneas del metro */}
                {lines.map(line => {
                    const coordinates: [number, number][] = line.stations.map(s => [s.lat, s.lon]);
                    return (
                        <Polyline
                            key={line.id}
                            positions={coordinates}
                            color={line.color}
                            weight={4}
                            opacity={0.8}
                        />
                    );
                })}

                {/* Estaciones */}
                {lines.map(line =>
                    line.stations.map(station => (
                        <Marker
                            key={`${line.id}-${station.code}`}
                            position={[station.lat, station.lon]}
                            icon={stationIcon}
                        >
                            <Popup>
                                <div className="text-center">
                                    <p className="font-semibold text-sm">{station.name}</p>
                                    <p className="text-xs text-slate-500">{line.id}</p>
                                </div>
                            </Popup>
                        </Marker>
                    ))
                )}

                {/* Trenes en movimiento */}
                {trains.map(train => (
                    <Marker
                        key={train.trainId}
                        position={[train.lat, train.lon]}
                        icon={trainIcons[train.lineId]}
                    >
                        <Popup>
                            <div className="text-center min-w-[120px]">
                                <p className="font-bold text-sm" style={{ color: lines.find(l => l.id === train.lineId)?.color }}>
                                    Línea {train.lineId}
                                </p>
                                <p className="text-xs text-slate-600 mt-1">→ {train.destination}</p>
                                <p className="text-xs text-slate-500 mt-1">
                                    Próxima: {train.nextStation}
                                </p>
                                <p className="text-xs font-semibold text-orange-600 mt-1">
                                    {train.etaMinutes === 0 ? 'En estación' : `${train.etaMinutes} min`}
                                </p>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}
