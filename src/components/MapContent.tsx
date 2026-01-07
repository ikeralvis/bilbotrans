'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect } from 'react';

interface StopLocation {
    id: string;
    name: string;
    agency: 'metro' | 'bilbobus';
    lat: number;
    lon: number;
}

interface MapContentProps {
    stops: StopLocation[];
    userLocation: { lat: number; lon: number } | null;
    selectedStopId?: string;
    onSelectStop?: (stopId: string, agency: string) => void;
}

// Custom icons
const createIcon = (agency: 'metro' | 'bilbobus') => {
    const bgColor = agency === 'metro' ? '#f97316' : '#dc2626';
    const html = `
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="14" fill="${bgColor}"/>
            <circle cx="16" cy="16" r="10" fill="white" opacity="0.3"/>
        </svg>
    `;
    return new L.DivIcon({
        html,
        className: 'custom-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    });
};

const userIcon = new L.DivIcon({
    html: `
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="14" cy="14" r="12" fill="#3b82f6" stroke="white" stroke-width="2"/>
            <circle cx="14" cy="14" r="6" fill="white"/>
        </svg>
    `,
    className: 'user-icon',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14]
});

function MapContent({ stops, userLocation, onSelectStop }: MapContentProps) {
    const map = useMap();

    useEffect(() => {
        if (stops.length === 0) return;

        // Ajustar bounds para incluir todos los stops y ubicación del usuario
        const bounds = L.latLngBounds(
            stops.map(s => [s.lat, s.lon])
        );

        if (userLocation) {
            bounds.extend([userLocation.lat, userLocation.lon]);
        }

        map.fitBounds(bounds, { padding: [50, 50] });
    }, [stops, userLocation, map]);

    return (
        <>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Ubicación del usuario */}
            {userLocation && (
                <Marker
                    position={[userLocation.lat, userLocation.lon]}
                    icon={userIcon}
                >
                    <Popup>
                        <div className="text-sm font-semibold">Tu ubicación</div>
                    </Popup>
                </Marker>
            )}

            {/* Paradas */}
            {stops.map(stop => (
                <Marker
                    key={`${stop.id}_${stop.agency}`}
                    position={[stop.lat, stop.lon]}
                    icon={createIcon(stop.agency)}
                    eventHandlers={{
                        click: () => {
                            onSelectStop?.(stop.id, stop.agency);
                        }
                    }}
                >
                    <Popup>
                        <div className="space-y-1">
                            <div className="font-semibold text-sm">{stop.name}</div>
                            <div className="text-xs text-slate-600">
                                {stop.agency === 'metro' ? 'Metro Bilbao' : 'Bilbobus'}
                            </div>
                            <button
                                onClick={() => onSelectStop?.(stop.id, stop.agency)}
                                className="mt-2 w-full px-2 py-1 bg-blue-500 text-white rounded text-xs font-medium hover:bg-blue-600 transition-colors"
                            >
                                Ver horarios
                            </button>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </>
    );
}

export default function MapView(props: MapContentProps) {
    const center: [number, number] = [43.2627, -2.9253]; // Bilbao center

    return (
        <MapContainer
            center={center}
            zoom={13}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%' }}
        >
            <MapContent {...props} />
        </MapContainer>
    );
}
