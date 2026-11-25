import { transit_realtime } from 'gtfs-realtime-bindings';
import { ET_LINES, getEtStation } from './catalog';
import { scheduledNext } from './times';
import type { EtArrival, EtDirection, EtStationLive } from './types';

/*
 * Servidor. Tiempo real de Euskotren: GTFS-RT `trip_updates` de Open Data Euskadi (sin clave). Un solo fichero (~250 KB) con todos
 * los viajes en curso y las horas previstas de sus paradas restantes; se decodifica una vez y se reutiliza unos segundos entre peticiones.
 * `vehicle_positions` y `alerts` llegan vacíos (comprobado el 2026-11-22), así que no hay GPS ni avisos por esta vía.
 * `gtfs.euskotren.eus` (el enlace de data.ctb.eus) está detrás de un login: no se usa.
 */

export const TRIP_UPDATES_URL = 'https://opendata.euskadi.eus/transport/moveuskadi/euskotren/gtfsrt_euskotren_trip_updates.pb';
const TTL_MS = 15_000;

interface TripUpdate {
    line: string;
    direction: EtDirection;
    /** Estaciones restantes con su salida (segundos Unix) y retraso. El último es el destino. */
    stops: Array<{ station: string; time: number; delay: number }>;
}

interface Snapshot {
    at: number;
    feedTime: number;
    trips: TripUpdate[];
}
let cache: Snapshot | null = null;
let inflight: Promise<Snapshot> | null = null;

const lineByRoute = new Map(ET_LINES.map((l) => [l.id, l.code]));
/** `ES:Euskotren:Quay:2675_Plataforma_Q1:` → "2675" */
const stationOf = (stopId: string | null | undefined) => /:(?:Quay|StopPlace|Place):(\d+)/.exec(stopId ?? '')?.[1] ?? null;
/** protobuf entrega los enteros de 64 bits como `Long`. */
const num = (v: unknown): number => (typeof v === 'number' ? v : v ? Number(String(v)) : 0);

export function parseTripUpdates(buf: Uint8Array): { feedTime: number; trips: TripUpdate[] } {
    const feed = transit_realtime.FeedMessage.decode(buf);
    const trips: TripUpdate[] = [];
    for (const e of feed.entity) {
        const tu = e.tripUpdate;
        if (!tu || tu.trip.scheduleRelationship === transit_realtime.TripDescriptor.ScheduleRelationship.CANCELED) continue;
        const line = lineByRoute.get(tu.trip.routeId ?? '');
        if (!line) continue; // FCC y viajes de otras líneas que no están en el catálogo
        const stops: TripUpdate['stops'] = [];
        for (const u of tu.stopTimeUpdate ?? []) {
            const station = stationOf(u.stopId);
            if (!station || u.scheduleRelationship === transit_realtime.TripUpdate.StopTimeUpdate.ScheduleRelationship.SKIPPED) continue;
            const time = num(u.departure?.time) || num(u.arrival?.time);
            if (!time) continue;
            // una estación con dos andenes seguidos no debe repetirse
            if (stops[stops.length - 1]?.station === station) continue;
            stops.push({ station, time, delay: u.departure?.delay ?? u.arrival?.delay ?? 0 });
        }
        if (stops.length) trips.push({ line, direction: tu.trip.directionId === 1 ? '1' : '0', stops });
    }
    return { feedTime: num(feed.header.timestamp), trips };
}

async function load(): Promise<Snapshot> {
    if (cache && Date.now() - cache.at < TTL_MS) return cache;
    inflight ??= (async () => {
        const res = await fetch(TRIP_UPDATES_URL, { cache: 'no-store', signal: AbortSignal.timeout(8_000) });
        if (!res.ok) throw new Error(`GTFS-RT ${res.status}`);
        const parsed = parseTripUpdates(new Uint8Array(await res.arrayBuffer()));
        const snap: Snapshot = { at: Date.now(), ...parsed };
        cache = snap;
        return snap;
    })().finally(() => {
        inflight = null;
    });
    try {
        return await inflight;
    } catch (e) {
        if (cache) return cache; // mejor un dato de hace un minuto que nada
        throw e;
    }
}

/** Trenes que van a salir de una estación, ordenados. En la última parada de un viaje no sale nadie: no cuenta. */
export function departuresFrom(trips: TripUpdate[], station: string, nowSec: number): EtArrival[] {
    const out: EtArrival[] = [];
    for (const t of trips) {
        const i = t.stops.findIndex((s) => s.station === station);
        if (i === -1 || i === t.stops.length - 1) continue;
        const stop = t.stops[i];
        if (stop.time < nowSec - 30) continue; // ya salió
        const dest = getEtStation(t.stops[t.stops.length - 1].station);
        out.push({
            line: t.line,
            towards: dest?.name ?? '',
            direction: t.direction,
            time: stop.time,
            minutes: Math.max(0, Math.floor((stop.time - nowSec) / 60)),
            delay: stop.delay,
        });
    }
    return out.sort((a, b) => a.time - b.time);
}

/** Próximas salidas de una estación: tiempo real si lo hay; si no, el horario programado (marcado como tal). */
export async function fetchStationLive(id: string): Promise<EtStationLive> {
    const st = getEtStation(id);
    if (!st) throw new Error('unknown station');
    const nowSec = Math.floor(Date.now() / 1000);
    let live: EtArrival[] = [];
    let fetchedAt = Date.now();
    try {
        const { trips, at } = await load();
        fetchedAt = at;
        live = departuresFrom(trips, id, nowSec).slice(0, 30);
    } catch {
        /* sin tiempo real: se cae al horario */
    }
    if (live.length) return { id, name: st.name, arrivals: live, source: 'live', fetchedAt };
    const arrivals = scheduledNext(id, 12).map<EtArrival>((r) => ({
        line: r.line,
        towards: r.towards,
        direction: r.direction,
        time: nowSec + r.minutes * 60,
        minutes: r.minutes,
        delay: 0,
    }));
    return { id, name: st.name, arrivals, source: 'schedule', fetchedAt: Date.now() };
}
