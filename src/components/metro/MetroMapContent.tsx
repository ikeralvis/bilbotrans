'use client';

import { useEffect, useMemo, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { divIcon } from 'leaflet';
import { TrainFront } from 'lucide-react';
import { CircleMarker, MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import gtfsJson from '@/data/metro/gtfs.json';
import { getStation } from '@/lib/metro/catalog';
import { LINE_COLOR as LINE_COLORS } from '@/lib/metro/lines';
import { bilbaoClock, isFeedValid, lineOf, simulateTrains, type Gtfs, type SimTrain } from '@/lib/metro/trainSim';

const GTFS = gtfsJson as unknown as Gtfs;
const REFRESH_MS = 3000;
const LINE_COLOR: Record<string, string> = { ...LINE_COLORS };
const DRAW_ORDER = ['L3', 'L2', 'L1'] as const;
/** Etxebarri–Plentzia (L1) y Basauri–Kabiezes (L2): recorridos completos de cada línea. */
const CANONICAL_SHAPE: Record<string, string> = { L1: 'ETX_PLE', L2: 'BSR_KAB', L3: 'L3' };
const LINE_WEIGHT: Record<string, number> = { L1: 4, L2: 7, L3: 5 };

const BOUNDS = Object.values(GTFS.stops).filter((s) => s[0]).map((s) => [s[0], s[1]] as [number, number]);

const linesByStop = (code: string) => getStation(code)?.lines ?? [];
const stopName = (code: string) => GTFS.stops[code]?.[2] ?? code;

export interface MapStatus {
    trains: number;
    feedValid: boolean;
    validTo: string;
}

export default function MetroMapContent({ onStatus }: { onStatus?: (s: MapStatus) => void }) {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        let id: ReturnType<typeof setInterval> | undefined;
        const start = () => {
            setNow(new Date());
            id = setInterval(() => setNow(new Date()), REFRESH_MS);
        };
        const onVis = () => {
            clearInterval(id);
            if (!document.hidden) start();
        };
        start();
        document.addEventListener('visibilitychange', onVis);
        return () => {
            clearInterval(id);
            document.removeEventListener('visibilitychange', onVis);
        };
    }, []);

    // Cada línea se dibuja con UN shape canónico (los ~30 shapes del GTFS son variantes
    // de servicio con geometrías ligeramente distintas y dibujarlos todos duplica el trazado).
    const shapes = useMemo(() => {
        const longest = new Map<string, string>();
        for (const p of GTFS.patterns) {
            const line = lineOf(p.stops, linesByStop);
            const cur = longest.get(line);
            if (!cur || GTFS.shapes[p.shape].length > GTFS.shapes[cur].length) longest.set(line, p.shape);
        }
        return DRAW_ORDER.flatMap((line) => {
            const id = CANONICAL_SHAPE[line] in GTFS.shapes ? CANONICAL_SHAPE[line] : longest.get(line);
            return id ? [{ line, id }] : [];
        });
    }, []);

    const stations = useMemo(() => Object.entries(GTFS.stops).filter(([code]) => code), []);
    const trains = useMemo(() => simulateTrains({ gtfs: GTFS, linesByStop }, now), [now]);
    const feedValid = isFeedValid(GTFS, bilbaoClock(now).date);

    useEffect(() => {
        onStatus?.({ trains: trains.length, feedValid, validTo: GTFS.validTo });
    }, [trains.length, feedValid, onStatus]);

    return (
        <MapContainer bounds={BOUNDS} boundsOptions={{ padding: [8, 8] }} zoomSnap={1} className="h-full w-full" zoomControl={false} preferCanvas>
            <TileLayer
                url="https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
                attribution="Tiles &copy; Esri"
                maxZoom={16}
            />

            {shapes.map(({ id, line }) => (
                <Polyline key={id} positions={GTFS.shapes[id]} pathOptions={{ color: LINE_COLOR[line], weight: LINE_WEIGHT[line], opacity: 0.95, lineCap: 'round', lineJoin: 'round' }} />
            ))}

            {stations.map(([code, [lat, lon, name]]) => (
                <CircleMarker key={code} center={[lat, lon]} radius={5} pathOptions={{ color: '#3F3F46', weight: 2, fillColor: '#fff', fillOpacity: 1 }}>
                    <Popup className="bt-popup" closeButton={false} offset={[0, -2]}>
                        <div className="m-0 font-semibold">{name}</div>
                        <div className="mt-1.5 flex gap-1">
                            {linesByStop(code).map((l) => (
                                <LineChip key={l} line={l} />
                            ))}
                        </div>
                    </Popup>
                </CircleMarker>
            ))}

            {trains.map((t) => (
                <TrainMarker key={t.id} train={t} />
            ))}
        </MapContainer>
    );
}

const ICONS = new Map<string, ReturnType<typeof divIcon>>();
/** Insignia redonda con el color de la línea y un tren; en estación lleva un halo. */
function trainIcon(line: string, dwelling: boolean) {
    const key = `${line}-${dwelling}`;
    let icon = ICONS.get(key);
    if (!icon) {
        const glyph = renderToStaticMarkup(<TrainFront size={15} strokeWidth={2.4} color="#fff" aria-hidden />);
        const ring = dwelling ? `0 0 0 4px ${LINE_COLOR[line]}33,` : '';
        icon = divIcon({
            className: '',
            iconSize: [28, 28],
            iconAnchor: [14, 14],
            popupAnchor: [0, -14],
            html: `<div style="width:28px;height:28px;border-radius:50%;background:${LINE_COLOR[line]};border:2.5px solid #fff;box-shadow:${ring}0 2px 6px rgba(0,0,0,.35);display:grid;place-items:center">${glyph}</div>`,
        });
        ICONS.set(key, icon);
    }
    return icon;
}

function LineChip({ line }: { line: string }) {
    return (
        <span className="inline-grid h-5 min-w-7 place-items-center rounded-full px-1.5 text-[11px] font-bold text-white" style={{ background: LINE_COLOR[line] }}>
            {line}
        </span>
    );
}

function TrainMarker({ train: t }: { train: SimTrain }) {
    const dwelling = t.state === 'dwelling';
    const mins = Math.max(1, Math.round(t.etaSec / 60));
    return (
        <Marker position={t.pos} icon={trainIcon(t.line, dwelling)} zIndexOffset={1000}>
            <Popup className="bt-popup" closeButton={false}>
                <div className="flex items-center gap-2">
                    <LineChip line={t.line} />
                    <div className="m-0 font-semibold">→ {t.headsign}</div>
                </div>
                <div className="m-0 mt-2 text-[var(--ink-2)]">{dwelling ? 'En estación' : `${stopName(t.prevStop)} → ${stopName(t.nextStop)}`}</div>
                <div className="bt-num m-0 mt-0.5 font-semibold">{dwelling ? stopName(t.nextStop) : `Llega a ${stopName(t.nextStop)} en ~${mins} min`}</div>
                <div className="m-0 mt-1.5 text-[11px] text-[var(--ink-2)]">Estimado según horario</div>
            </Popup>
        </Marker>
    );
}
