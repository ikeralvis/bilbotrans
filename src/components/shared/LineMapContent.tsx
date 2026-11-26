'use client';

import Link from 'next/link';
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export interface MapStop {
    code: string;
    name: string;
    lat: number;
    lon: number;
    href: string;
}

/**
 * Recorrido de una línea sobre el mapa: paradas en orden unidas por una línea recta del color de la línea
 * (los catálogos no traen la geometría de calle) y cabeceras más grandes. Se carga solo al abrirlo (`LineMapCard`).
 */
export default function LineMapContent({ stops, color }: { stops: MapStop[]; color: string }) {
    const path = stops.map((s) => [s.lat, s.lon] as [number, number]);
    const last = stops.length - 1;
    return (
        <MapContainer bounds={path} boundsOptions={{ padding: [24, 24] }} className="h-full w-full" zoomControl={false} preferCanvas attributionControl>
            <TileLayer
                url="https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
                attribution="Tiles &copy; Esri"
                maxZoom={17}
            />
            <Polyline positions={path} pathOptions={{ color, weight: 5, opacity: 0.85, lineCap: 'round', lineJoin: 'round' }} />
            {stops.map((s, i) => {
                const end = i === 0 || i === last;
                return (
                    <CircleMarker
                        key={`${s.code}-${i}`}
                        center={[s.lat, s.lon]}
                        radius={end ? 8 : 5}
                        pathOptions={{ color: end ? '#ffffff' : color, weight: end ? 3 : 2, fillColor: end ? color : '#ffffff', fillOpacity: 1 }}
                    >
                        <Popup className="bt-popup" closeButton={false} offset={[0, -2]}>
                            <div className="m-0 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-2)]">
                                {i === 0 ? 'Salida' : i === last ? 'Final' : `Parada ${i + 1} de ${stops.length}`}
                            </div>
                            <div className="m-0 mt-0.5 font-semibold">{s.name}</div>
                            <Link href={s.href} className="mt-2 inline-block font-semibold underline underline-offset-2">
                                Ver tiempos
                            </Link>
                        </Popup>
                    </CircleMarker>
                );
            })}
        </MapContainer>
    );
}
