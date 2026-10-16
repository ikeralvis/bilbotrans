'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { AlertTriangle, TramFront } from 'lucide-react';
import gtfsJson from '@/data/metro/gtfs.json';
import { getStation } from '@/lib/metro/catalog';
import { type LineId, type LineStation } from '@/lib/metro/lines';
import { useMetroLine } from '@/lib/metro/hooks';
import { simulateTrains, type Gtfs, type SimTrain } from '@/lib/metro/trainSim';
import { LineChip, SPRING } from './parts';

const GTFS = gtfsJson as unknown as Gtfs;
const ROW = 64; // alto de cada estación (px)
const TICK_MS = 3000;
const linesByStop = (code: string) => getStation(code)?.lines ?? [];

/** Reloj de 3 s (pausado con la pestaña oculta) que alimenta la simulación de trenes. */
function useTick() {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        let id: ReturnType<typeof setInterval> | undefined;
        const start = () => {
            setNow(new Date());
            id = setInterval(() => setNow(new Date()), TICK_MS);
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
    return now;
}

/** Color de línea con variante para modo oscuro (L2 es negra en claro y gris claro en oscuro). */
const lineVar = (line: LineId) => `var(--${line.toLowerCase()})`;

/** Tramo de vía: color de la línea; en el troncal compartido, mitad L1 y mitad L2. */
function trackBackground(line: LineId, trunk: boolean) {
    if (trunk && line !== 'L3') return 'linear-gradient(90deg, var(--l1) 50%, var(--l2) 50%)';
    return lineVar(line);
}

function StationRow({ s, line, index, first, last, zoneChanged }: { s: LineStation; line: LineId; index: number; first: boolean; last: boolean; zoneChanged: boolean }) {
    const known = Boolean(getStation(s.code));
    const color = lineVar(line);
    const body = (
        <div className="relative flex items-center" style={{ height: ROW }}>
            {/* Vía */}
            <span
                aria-hidden
                className="absolute left-[27px] w-[6px] rounded-full"
                style={{ top: first ? '50%' : 0, bottom: last ? '50%' : 0, background: trackBackground(line, s.trunk) }}
            />
            {/* Estación */}
            <span
                aria-hidden
                className="absolute left-[21px] grid h-[18px] w-[18px] place-items-center rounded-full"
                style={{ background: 'var(--surface)', border: `4px solid ${s.trunk ? 'var(--ink)' : color}` }}
            />
            <div className="ml-16 flex min-w-0 flex-1 items-center gap-2 pr-4">
                <div className="min-w-0 flex-1">
                    <p className="truncate text-[16px] font-semibold" style={{ color: 'var(--ink)' }}>{s.name}</p>
                    <p className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--ink-2)' }}>
                        {s.trunk && line !== 'L3' && <LineChip line={line === 'L1' ? 'L2' : 'L1'} size="sm" />}
                        {s.connection && <span className="font-medium">Conexión</span>}
                    </p>
                </div>
                {s.issues && (
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full" style={{ background: 'color-mix(in srgb, var(--warn) 22%, var(--surface))' }} role="img" aria-label="Incidencia">
                        <AlertTriangle className="h-4 w-4" style={{ color: 'var(--warn)' }} />
                    </span>
                )}
                {s.minToNext !== null && !last && (
                    <span className="bt-num shrink-0 self-end pb-1.5 text-[11px]" style={{ color: 'var(--ink-2)' }}>{s.minToNext} min</span>
                )}
            </div>
        </div>
    );
    return (
        <motion.li initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ ...SPRING, delay: Math.min(index, 10) * 0.025 }}>
            {zoneChanged && (
                <div className="relative flex h-8 items-center">
                    <span aria-hidden className="absolute left-[27px] top-0 h-full w-[6px]" style={{ background: trackBackground(line, s.trunk) }} />
                    <span className="ml-16 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}>
                        Zona {s.zone.replace('Z', '')}
                    </span>
                </div>
            )}
            {known ? (
                <Link href={`/metro/station/${s.code}?agency=metro`} className="bt-press block rounded-2xl hover:bg-[var(--surface-2)]">
                    {body}
                </Link>
            ) : (
                body
            )}
        </motion.li>
    );
}

/** Marcador de tren entre dos estaciones, con posición estimada según horario (GTFS). */
function TrainMarker({ y, line, headsign }: { y: number; line: LineId; headsign: string }) {
    const reduce = useReducedMotion();
    return (
        <motion.div
            className="pointer-events-none absolute left-[12px] z-10"
            initial={false}
            animate={{ y }}
            transition={reduce ? { duration: 0 } : { duration: TICK_MS / 1000, ease: 'linear' }}
            style={{ top: -12 }}
            title={`Hacia ${headsign}`}
        >
            <span
                className="grid h-6 w-9 place-items-center rounded-md shadow-md"
                style={{ background: lineVar(line), color: `var(--${line.toLowerCase()}-ink)`, outline: '2px solid var(--surface)' }}
            >
                <TramFront className="h-3.5 w-3.5" aria-hidden />
            </span>
        </motion.div>
    );
}

export function LineDiagram({ line }: { line: LineId }) {
    const { data, error } = useMetroLine(line);
    const now = useTick();
    const stations = useMemo(() => data?.stations ?? [], [data]);

    const trains = useMemo(() => (stations.length ? simulateTrains({ gtfs: GTFS, linesByStop }, now).filter((t) => t.line === line) : []), [now, line, stations.length]);

    const markers = useMemo(() => {
        const idx = new Map(stations.map((s, i) => [s.code, i]));
        // Las filas de zona añaden 32 px sobre la estación que abre la zona
        const offset = (i: number) => {
            let extra = 0;
            for (let k = 1; k <= i; k++) if (stations[k].zone !== stations[k - 1].zone) extra += 32;
            return i * ROW + extra;
        };
        return trains.flatMap((t: SimTrain) => {
            const a = idx.get(t.prevStop);
            const b = idx.get(t.nextStop);
            if (a === undefined || b === undefined) return [];
            const seg = Math.max(60, (stations[Math.min(a, b)].minToNext ?? 2) * 60);
            const progress = a === b ? 0 : Math.min(1, Math.max(0, 1 - t.etaSec / seg));
            const ya = offset(a) + ROW / 2;
            const yb = offset(b) + ROW / 2;
            return [{ id: t.id, y: ya + (yb - ya) * progress, headsign: t.headsign }];
        });
    }, [trains, stations]);

    if (error && !data) return <p className="px-4 py-10 text-center text-sm" style={{ color: 'var(--ink-2)' }}>No se pudo cargar la línea.</p>;
    if (!data) {
        return (
            <div className="space-y-3 px-4 pt-4" aria-hidden>
                {Array.from({ length: 8 }).map((_, i) => <div key={i} className="bt-skeleton h-12" />)}
            </div>
        );
    }

    return (
        <div className="bt-card relative overflow-hidden py-2">
            <ul className="relative">
                {stations.map((s, i) => (
                    <StationRow key={s.code} s={s} line={line} index={i} first={i === 0} last={i === stations.length - 1} zoneChanged={i > 0 && s.zone !== stations[i - 1].zone} />
                ))}
                {markers.map((m) => (
                    <TrainMarker key={m.id} y={m.y} line={line} headsign={m.headsign} />
                ))}
            </ul>
        </div>
    );
}
