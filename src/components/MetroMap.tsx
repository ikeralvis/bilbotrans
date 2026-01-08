'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Zap } from 'lucide-react';
import { useGeolocation } from '@/context/GeolocationContext';

interface MetroStop {
    code: string;
    name: string;
    lat: number;
    lon: number;
    lines: string[];
}

// Datos correctos de las estaciones del Metro Bilbao
const METRO_STOPS: MetroStop[] = [
    // L1 - Plentzia direction
    { code: 'SAM', name: 'Santimami/San Mamés', lat: 43.264, lon: -2.9367, lines: ['L1', 'L2'] },
    { code: 'DEU', name: 'Deustu', lat: 43.2681, lon: -2.9475, lines: ['L1', 'L2'] },
    { code: 'SAR', name: 'Sarriko', lat: 43.2739, lon: -2.9514, lines: ['L1', 'L2'] },
    { code: 'SIN', name: 'San Ignazio', lat: 43.2828, lon: -2.9556, lines: ['L1', 'L2'] },
    { code: 'GUR', name: 'Gurutzeta/Cruces', lat: 43.2878, lon: -2.9606, lines: ['L2'] },
    { code: 'LUT', name: 'Lutxana', lat: 43.2889, lon: -2.9658, lines: ['L1'] },
    { code: 'ERA', name: 'Erandio', lat: 43.3014, lon: -2.9697, lines: ['L1'] },
    { code: 'AST', name: 'Astrabudua', lat: 43.3106, lon: -2.975, lines: ['L1'] },
    { code: 'LEI', name: 'Leioa', lat: 43.3278, lon: -2.9858, lines: ['L1'] },
    { code: 'LAM', name: 'Lamiako', lat: 43.3381, lon: -2.9917, lines: ['L1'] },
    { code: 'ARE', name: 'Areeta', lat: 43.3425, lon: -2.9972, lines: ['L1'] },
    { code: 'GOB', name: 'Gobela', lat: 43.3489, lon: -3.0033, lines: ['L1'] },
    { code: 'NEG', name: 'Neguri', lat: 43.355, lon: -3.0117, lines: ['L1'] },
    { code: 'AIB', name: 'Aiboa', lat: 43.3608, lon: -3.0167, lines: ['L1'] },
    { code: 'ALG', name: 'Algorta', lat: 43.3681, lon: -3.025, lines: ['L1'] },
    { code: 'BID', name: 'Bidezabal', lat: 43.3744, lon: -3.0328, lines: ['L1'] },
    { code: 'IBB', name: 'Ibarbengoa', lat: 43.3803, lon: -3.0417, lines: ['L1'] },
    { code: 'BER', name: 'Berango', lat: 43.3858, lon: -3.05, lines: ['L1'] },
    { code: 'LAR', name: 'Larrabasterra', lat: 43.3914, lon: -3.0583, lines: ['L1'] },
    { code: 'SOP', name: 'Sopela', lat: 43.3975, lon: -3.0667, lines: ['L1'] },
    { code: 'URD', name: 'Urduliz', lat: 43.4042, lon: -3.075, lines: ['L1'] },
    { code: 'PLE', name: 'Plentzia', lat: 43.4111, lon: -3.085, lines: ['L1'] },

    // Centro (L1 y L2)
    { code: 'MOY', name: 'Moyua', lat: 43.2627, lon: -2.9261, lines: ['L1', 'L2'] },
    { code: 'IND', name: 'Indautxu', lat: 43.2639, lon: -2.9311, lines: ['L1', 'L2'] },
    { code: 'ABA', name: 'Abando', lat: 43.2568, lon: -2.9235, lines: ['L1', 'L2'] },
    { code: 'CAV', name: 'Zazpikaleak/Casco Viejo', lat: 43.2571, lon: -2.927, lines: ['L1', 'L2'] },
    { code: 'SAN', name: 'Santutxu', lat: 43.2662, lon: -2.9207, lines: ['L1', 'L2'] },
    { code: 'BAS', name: 'Basarrate', lat: 43.2712, lon: -2.9165, lines: ['L1', 'L2'] },
    { code: 'BOL', name: 'Bolueta', lat: 43.2738, lon: -2.9113, lines: ['L1', 'L2'] },
    { code: 'ETX', name: 'Etxebarri', lat: 43.2814, lon: -2.9038, lines: ['L1', 'L2'] },

    // L2 - Santurtzi direction
    { code: 'ANS', name: 'Ansio', lat: 43.2944, lon: -2.97, lines: ['L2'] },
    { code: 'BAR', name: 'Barakaldo', lat: 43.3019, lon: -2.9803, lines: ['L2'] },
    { code: 'BAG', name: 'Bagatza', lat: 43.3086, lon: -2.9906, lines: ['L2'] },
    { code: 'URB', name: 'Urbinaga', lat: 43.3147, lon: -2.9992, lines: ['L2'] },
    { code: 'SES', name: 'Sestao', lat: 43.3222, lon: -3.0067, lines: ['L2'] },
    { code: 'ABT', name: 'Abatxolo', lat: 43.3281, lon: -3.0147, lines: ['L2'] },
    { code: 'POR', name: 'Portugalete', lat: 43.3342, lon: -3.0225, lines: ['L2'] },
    { code: 'PEN', name: 'Peñota', lat: 43.3403, lon: -3.0308, lines: ['L2'] },
    { code: 'STZ', name: 'Santurtzi', lat: 43.3464, lon: -3.0392, lines: ['L2'] },
    { code: 'KAB', name: 'Kabiezes', lat: 43.3525, lon: -3.0475, lines: ['L2'] },

    // L2 - Basauri direction
    { code: 'ARZ', name: 'Ariz', lat: 43.2847, lon: -2.8933, lines: ['L2'] },
    { code: 'BSR', name: 'Basauri', lat: 43.2878, lon: -2.8867, lines: ['L2'] },
];

// Calcular distancia entre dos puntos en km
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + 
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

export function MetroMap() {
    const { location, requestLocation, isLoading } = useGeolocation();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [selectedLine, setSelectedLine] = useState<string>('all');
    const [userLocation, setUserLocation] = useState(location);

    useEffect(() => {
        setUserLocation(location);
    }, [location]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Dimensiones del canvas
        const width = canvas.width;
        const height = canvas.height;

        // Limpiar canvas
        ctx.fillStyle = '#f3f4f6';
        ctx.fillRect(0, 0, width, height);

        // Calcular bounds del mapa
        const minLat = Math.min(...METRO_STOPS.map(s => s.lat));
        const maxLat = Math.max(...METRO_STOPS.map(s => s.lat));
        const minLon = Math.min(...METRO_STOPS.map(s => s.lon));
        const maxLon = Math.max(...METRO_STOPS.map(s => s.lon));

        const padding = 40;
        const mapWidth = width - padding * 2;
        const mapHeight = height - padding * 2;

        const latRange = maxLat - minLat;
        const lonRange = maxLon - minLon;

        // Función para convertir coordenadas geográficas a pixel
        const toPixel = (lat: number, lon: number) => {
            const x = padding + ((lon - minLon) / lonRange) * mapWidth;
            const y = height - padding - ((lat - minLat) / latRange) * mapHeight;
            return { x, y };
        };

        // Dibujar líneas del metro
        const lines = ['L1', 'L2', 'L3'];
        const lineColors: Record<string, string> = {
            'L1': '#ff6b35',
            'L2': '#22c55e',
            'L3': '#3b82f6'
        };

        lines.forEach(line => {
            if (selectedLine !== 'all' && selectedLine !== line) return;

            const lineStops = METRO_STOPS.filter(s => s.lines.includes(line));
            
            ctx.strokeStyle = lineColors[line];
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            for (let i = 0; i < lineStops.length - 1; i++) {
                const p1 = toPixel(lineStops[i].lat, lineStops[i].lon);
                const p2 = toPixel(lineStops[i + 1].lat, lineStops[i + 1].lon);
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }
        });

        // Dibujar estaciones
        METRO_STOPS.forEach(stop => {
            if (selectedLine !== 'all' && !stop.lines.includes(selectedLine)) return;

            const pixel = toPixel(stop.lat, stop.lon);
            
            // Círculo de fondo
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(pixel.x, pixel.y, 8, 0, Math.PI * 2);
            ctx.fill();

            // Círculo de línea (color según línea)
            const color = lineColors[stop.lines[0]];
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(pixel.x, pixel.y, 8, 0, Math.PI * 2);
            ctx.stroke();
        });

        // Dibujar ubicación del usuario
        if (userLocation) {
            const userPixel = toPixel(userLocation.lat, userLocation.lon);
            
            // Pulso de localización
            ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
            ctx.beginPath();
            ctx.arc(userPixel.x, userPixel.y, 20, 0, Math.PI * 2);
            ctx.fill();

            // Punto de usuario
            ctx.fillStyle = '#3b82f6';
            ctx.beginPath();
            ctx.arc(userPixel.x, userPixel.y, 6, 0, Math.PI * 2);
            ctx.fill();

            // Borde blanco
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(userPixel.x, userPixel.y, 6, 0, Math.PI * 2);
            ctx.stroke();
        }
    }, [selectedLine, userLocation]);

    const getNearestStop = () => {
        if (!userLocation) return null;

        let nearest = METRO_STOPS[0];
        let minDist = Infinity;

        METRO_STOPS.forEach(stop => {
            const dist = calculateDistance(userLocation.lat, userLocation.lon, stop.lat, stop.lon);
            if (dist < minDist) {
                minDist = dist;
                nearest = stop;
            }
        });

        return { stop: nearest, distance: minDist };
    };

    const nearest = getNearestStop();

    // Simplificación de ternarios
    const getButtonClass = (line: string, selectedLine: string) => {
        if (selectedLine === line) {
            switch (line) {
                case 'all':
                    return 'bg-slate-900 text-white';
                case 'L1':
                    return 'bg-orange-500 text-white';
                case 'L2':
                    return 'bg-green-600 text-white';
                case 'L3':
                    return 'bg-blue-600 text-white';
            }
        }
        return 'bg-slate-100 text-slate-700 hover:bg-slate-200';
    };

    const getBadgeClass = (line: string) => {
        switch (line) {
            case 'L1':
                return 'bg-orange-500';
            case 'L2':
                return 'bg-green-600';
            case 'L3':
                return 'bg-blue-600';
        }
    };

    return (
        <div className="space-y-4">
            {/* Canvas para el mapa */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <canvas
                    ref={canvasRef}
                    width={500}
                    height={800}
                    className="w-full h-auto"
                />
            </div>

            {/* Controles */}
            <div className="space-y-4">
                {/* Filtro de líneas */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold text-slate-600 mb-3">Líneas</p>
                    <div className="flex gap-2">
                        {['all', 'L1', 'L2', 'L3'].map(line => (
                            <button
                                key={line}
                                onClick={() => setSelectedLine(line)}
                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                                    getButtonClass(line, selectedLine)
                                }`}
                            >
                                {line === 'all' ? 'Todas' : line}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Botón de ubicación */}
                <button
                    onClick={requestLocation}
                    disabled={isLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white py-3 rounded-xl transition-colors font-medium flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <>
                            <Zap className="w-4 h-4 animate-spin" />
                            Localizando...
                        </>
                    ) : (
                        <>
                            <Navigation className="w-4 h-4" />
                            Mi ubicación
                        </>
                    )}
                </button>

                {/* Info de estación cercana */}
                {nearest && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <MapPin className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-blue-900">Estación más cercana</p>
                                <p className="text-lg font-bold text-blue-900 mt-1">{nearest.stop.name}</p>
                                <p className="text-xs text-blue-700 mt-1">
                                    📍 {(nearest.distance * 1000).toFixed(0)}m de distancia
                                </p>
                                <div className="flex gap-1 mt-2">
                                    {nearest.stop.lines.map(line => (
                                        <span
                                            key={line}
                                            className={`px-2 py-0.5 rounded text-xs font-bold text-white ${
                                                getBadgeClass(line)
                                            }`}
                                        >
                                            {line}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default MetroMap;

