/**
 * Simulación de trenes a partir del GTFS estático (src/data/metro/gtfs.json).
 * Funciones puras: sin red ni estado. La posición es una ESTIMACIÓN según horario.
 */

export type LatLng = [number, number];

export interface GtfsService { id: string; days: number[]; start: string; end: string }
export interface GtfsPattern { shape: string; headsign: string; dir: number; stops: string[]; t: number[]; d: number[] }
export interface Gtfs {
    generatedAt: string;
    validFrom: string;
    validTo: string;
    stops: Record<string, [number, number, string]>;
    shapes: Record<string, LatLng[]>;
    services: GtfsService[];
    /** [índice de servicio, YYYYMMDD, 1 añade | 2 quita] */
    exceptions: Array<[number, string, number]>;
    patterns: GtfsPattern[];
    /** [índice de patrón, índice de servicio, hora de salida en segundos] */
    trips: Array<[number, number, number]>;
}

export type TrainState = 'running' | 'dwelling';

export interface SimTrain {
    id: string;
    line: 'L1' | 'L2' | 'L3';
    headsign: string;
    direction: number;
    pos: LatLng;
    state: TrainState;
    /** Última parada alcanzada y siguiente (en estación: ambas iguales si es la última). */
    prevStop: string;
    nextStop: string;
    /** Segundos hasta llegar a nextStop. */
    etaSec: number;
}

const DAY = 86400;

/** Fecha y segundos desde medianoche en Europe/Madrid. */
export function bilbaoClock(now: Date): { date: string; weekday: number; secs: number } {
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Madrid',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(now);
    const g = (t: string) => Number(parts.find((p) => p.type === t)!.value);
    const y = g('year'), m = g('month'), d = g('day');
    return {
        date: `${y}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}`,
        weekday: new Date(Date.UTC(y, m - 1, d)).getUTCDay(),
        secs: g('hour') * 3600 + g('minute') * 60 + g('second'),
    };
}

/** YYYYMMDD del día anterior. */
export function prevDate(date: string): string {
    const t = Date.UTC(+date.slice(0, 4), +date.slice(4, 6) - 1, +date.slice(6, 8)) - DAY * 1000;
    const d = new Date(t);
    return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
}

/** Índices de servicios activos en una fecha (calendar + calendar_dates). */
export function activeServices(gtfs: Gtfs, date: string): Set<number> {
    const weekday = new Date(Date.UTC(+date.slice(0, 4), +date.slice(4, 6) - 1, +date.slice(6, 8))).getUTCDay();
    const out = new Set<number>();
    gtfs.services.forEach((s, i) => {
        if (s.days[weekday] === 1 && date >= s.start && date <= s.end) out.add(i);
    });
    for (const [i, d, type] of gtfs.exceptions) {
        if (d !== date) continue;
        if (type === 1) out.add(i);
        else if (type === 2) out.delete(i);
    }
    return out;
}

/** El feed solo cubre un rango; fuera de él no hay horario fiable. */
export function isFeedValid(gtfs: Gtfs, date: string): boolean {
    return date >= gtfs.validFrom && date <= gtfs.validTo;
}

/** Línea del patrón según las líneas de las paradas que toca. */
export function lineOf(stops: string[], linesByStop: (code: string) => string[]): 'L1' | 'L2' | 'L3' {
    const sets = stops.map(linesByStop);
    for (const l of ['L1', 'L3', 'L2'] as const) if (sets.every((s) => s.includes(l))) return l;
    if (sets.some((s) => s.length === 1 && s[0] === 'L3')) return 'L3';
    if (sets.some((s) => s.length === 1 && s[0] === 'L2')) return 'L2';
    return 'L1';
}

/** Punto a `meters` metros del inicio de la polilínea. `cum` = distancias acumuladas por vértice. */
export function pointAt(line: LatLng[], cum: number[], meters: number): LatLng {
    if (meters <= 0) return line[0];
    const total = cum[cum.length - 1];
    if (meters >= total) return line[line.length - 1];
    let lo = 0, hi = cum.length - 1;
    while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (cum[mid] <= meters) lo = mid; else hi = mid;
    }
    const span = cum[hi] - cum[lo];
    const f = span ? (meters - cum[lo]) / span : 0;
    return [line[lo][0] + (line[hi][0] - line[lo][0]) * f, line[lo][1] + (line[hi][1] - line[lo][1]) * f];
}

const R = 6371000;
function haversine(a: LatLng, b: LatLng): number {
    const dLat = ((b[0] - a[0]) * Math.PI) / 180;
    const dLon = ((b[1] - a[1]) * Math.PI) / 180;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
}

export function cumulative(line: LatLng[]): number[] {
    const cum = [0];
    for (let i = 1; i < line.length; i++) cum.push(cum[i - 1] + haversine(line[i - 1], line[i]));
    return cum;
}

/**
 * Posición de un viaje `elapsed` segundos después de su salida, o null si no está en circulación.
 * `t` = [arr0, dep0, arr1, dep1, ...] relativos a la salida; `d` = metros sobre el shape por parada.
 */
export function locateOnPattern(
    p: Pick<GtfsPattern, 'stops' | 't' | 'd'>,
    elapsed: number,
): { meters: number; state: TrainState; prev: number; next: number; etaSec: number } | null {
    const n = p.stops.length;
    if (elapsed < 0 || elapsed > p.t[2 * n - 1]) return null;
    for (let i = 0; i < n; i++) {
        const arr = p.t[2 * i];
        const dep = p.t[2 * i + 1];
        if (elapsed >= arr && elapsed <= dep) {
            return { meters: p.d[i], state: 'dwelling', prev: i, next: i, etaSec: 0 };
        }
        if (i < n - 1 && elapsed > dep && elapsed < p.t[2 * (i + 1)]) {
            const nextArr = p.t[2 * (i + 1)];
            const f = (elapsed - dep) / (nextArr - dep);
            return { meters: p.d[i] + (p.d[i + 1] - p.d[i]) * f, state: 'running', prev: i, next: i + 1, etaSec: nextArr - elapsed };
        }
    }
    return null;
}

export interface SimContext {
    gtfs: Gtfs;
    /** Líneas por código de estación (del catálogo). */
    linesByStop: (code: string) => string[];
}

const cache = new WeakMap<Gtfs, { cum: Map<string, number[]> }>();
function cumFor(gtfs: Gtfs, shape: string): number[] {
    let c = cache.get(gtfs);
    if (!c) cache.set(gtfs, (c = { cum: new Map() }));
    let v = c.cum.get(shape);
    if (!v) c.cum.set(shape, (v = cumulative(gtfs.shapes[shape])));
    return v;
}

/** Trenes en circulación en el instante `now`, con posición interpolada sobre el shape. */
export function simulateTrains(ctx: SimContext, now: Date): SimTrain[] {
    const { gtfs } = ctx;
    const clock = bilbaoClock(now);
    if (!isFeedValid(gtfs, clock.date)) return [];

    const days: Array<{ date: string; offset: number; services: Set<number> }> = [
        { date: clock.date, offset: clock.secs, services: activeServices(gtfs, clock.date) },
        // Viajes que salieron ayer y pasan de medianoche (horas 24:xx)
        { date: prevDate(clock.date), offset: clock.secs + DAY, services: activeServices(gtfs, prevDate(clock.date)) },
    ];

    const lineCache = new Map<number, 'L1' | 'L2' | 'L3'>();
    const out: SimTrain[] = [];
    gtfs.trips.forEach(([pi, si, start], idx) => {
        for (const day of days) {
            if (!day.services.has(si)) continue;
            const p = gtfs.patterns[pi];
            const loc = locateOnPattern(p, day.offset - start);
            if (!loc) continue;
            const cum = cumFor(gtfs, p.shape);
            const pos = pointAt(gtfs.shapes[p.shape], cum, loc.meters);
            let line = lineCache.get(pi);
            if (!line) lineCache.set(pi, (line = lineOf(p.stops, ctx.linesByStop)));
            out.push({
                id: `${day.date}-${idx}`,
                line,
                headsign: p.headsign,
                direction: p.dir,
                pos,
                state: loc.state,
                prevStop: p.stops[loc.prev],
                nextStop: p.stops[loc.next],
                etaSec: Math.round(loc.etaSec),
            });
        }
    });
    return out;
}
