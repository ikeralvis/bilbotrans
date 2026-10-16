import { groupByDirection, type DirectionGroup, type RawTrain } from './direction';
import type { LineDiagramData, LineId } from './lines';

const BASE = 'https://api.metrobilbao.eus';
const TIMEOUT_MS = 6000;

async function getJson<T>(path: string, revalidate: number): Promise<T> {
    const res = await fetch(`${BASE}${path}`, {
        next: { revalidate },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`Metro API ${res.status} ${path}`);
    return (await res.json()) as T;
}

const CODE_RE = /^[A-Z]{3}$/;
export const isStationCode = (c: string) => CODE_RE.test(c);

/* ───────── Estación en vivo ───────── */

interface StationRaw {
    code: string;
    name: string;
    line: string[];
    issues?: Array<{ title?: string; description?: string }>;
    platforms?: {
        Platforms?: RawTrain[][];
        Entrances?: Array<{ id: number; name: string; message_es?: string }>;
    };
}

export interface StationLive {
    code: string;
    name: string;
    lines: string[];
    groups: DirectionGroup[];
    notices: string[];
    fetchedAt: number;
}

export async function fetchStationLive(code: string, lang = 'es'): Promise<StationLive> {
    const raw = await getJson<StationRaw>(`/api/stations/${code}?lang=${lang}`, 10);
    const notices = [
        ...(raw.issues ?? []).map((i) => [i.title, i.description].filter(Boolean).join(' — ')),
        ...(raw.platforms?.Entrances ?? []).map((e) => (e.message_es ?? '').replace(/\s+/g, ' ').trim()),
    ].filter(Boolean);
    return {
        code: raw.code,
        name: raw.name,
        lines: raw.line ?? [],
        groups: groupByDirection(raw.platforms?.Platforms, code),
        notices,
        fetchedAt: Date.now(),
    };
}

/* ───────── Trayecto en vivo ───────── */

interface RouteRaw {
    trains: Array<{ wagons: number; estimated: number; direction: string; time: string; timeRounded: string }>;
    messages?: unknown[];
    trip: { fromStation: { code: string; name: string }; toStation: { code: string; name: string }; duration: number; line: string; transfer: boolean };
    exits?: {
        origin?: Array<{ id: number; name: string; elevator: boolean; nocturnal: boolean }>;
        destiny?: Array<{ id: number; name: string; elevator: boolean; nocturnal: boolean }>;
    };
    co2Metro?: { diff?: string };
}

export interface RouteLive {
    from: { code: string; name: string };
    to: { code: string; name: string };
    line: string;
    duration: number;
    transfer: boolean;
    trains: Array<{ destination: string; minutes: number; wagons: number; time: string; clock: string }>;
    messages: string[];
    originExits: Array<{ id: number; name: string; elevator: boolean; nocturnal: boolean }>;
    destinationExits: Array<{ id: number; name: string; elevator: boolean; nocturnal: boolean }>;
    fetchedAt: number;
}

export async function fetchRouteLive(from: string, to: string): Promise<RouteLive> {
    const raw = await getJson<RouteRaw>(`/metro/real-time/${from}/${to}`, 10);
    return {
        from: raw.trip.fromStation,
        to: raw.trip.toStation,
        line: raw.trip.line,
        duration: raw.trip.duration,
        transfer: raw.trip.transfer,
        trains: raw.trains
            .map((t) => ({ destination: t.direction, minutes: Math.max(0, t.estimated), wagons: t.wagons, time: t.time, clock: t.timeRounded }))
            .sort((a, b) => a.minutes - b.minutes),
        messages: (raw.messages ?? []).map((m) => (typeof m === 'string' ? m : JSON.stringify(m))),
        originExits: raw.exits?.origin ?? [],
        destinationExits: raw.exits?.destiny ?? [],
        fetchedAt: Date.now(),
    };
}

/* ───────── Horario programado ───────── */

interface TimetableRaw {
    trips?: Record<string, Array<{ originArrivalTimeRounder: string; destinyArrivalTimeRounder: string }>>;
    transfer?: boolean;
    time?: string;
}

export interface Timetable {
    transfer: boolean;
    duration: number | null;
    legs: Array<{ key: string; departures: Array<{ dep: string; arr: string }> }>;
}

export async function fetchTimetable(from: string, to: string, fromTime: string, toTime: string, date: string, lang = 'es'): Promise<Timetable> {
    const raw = await getJson<TimetableRaw>(`/metro/obtain-schedule-of-trip/${from}/${to}/${fromTime}/${toTime}/${date}/${lang}`, 300);
    return {
        transfer: Boolean(raw.transfer),
        duration: raw.time ? Number(raw.time) : null,
        legs: Object.entries(raw.trips ?? {}).map(([key, list]) => ({
            key,
            departures: list.map((t) => ({ dep: t.originArrivalTimeRounder, arr: t.destinyArrivalTimeRounder })),
        })),
    };
}

/* ───────── Estado del servicio ───────── */

export interface ServiceStatus {
    blocked: boolean;
    lines: Record<string, { issues: Array<{ code: string; name: string }> }>;
    fetchedAt: number;
}

interface LineIssuesRaw {
    [zone: string]: { stations: Array<{ code: string; name: string; issues: unknown }> };
}

export async function fetchServiceStatus(): Promise<ServiceStatus> {
    const [maint, l1, l2] = await Promise.allSettled([
        getJson<{ isBlocked: boolean }>('/metro-is-in-maintenance', 60),
        getJson<LineIssuesRaw>('/metro/line-with-issues/L1/1', 60),
        getJson<LineIssuesRaw>('/metro/line-with-issues/L2/1', 60),
    ]);
    const issuesOf = (r: PromiseSettledResult<LineIssuesRaw>) =>
        r.status === 'fulfilled'
            ? Object.values(r.value)
                  .flatMap((z) => z.stations ?? [])
                  .filter((s) => s.issues)
                  .map((s) => ({ code: s.code, name: s.name }))
            : [];
    return {
        blocked: maint.status === 'fulfilled' ? Boolean(maint.value.isBlocked) : false,
        lines: { L1: { issues: issuesOf(l1) }, L2: { issues: issuesOf(l2) } },
        fetchedAt: Date.now(),
    };
}

/* ───────── Diagrama de línea ───────── */

interface LineIssuesFull {
    [section: string]: {
        zone: string;
        stations: Array<{ code: string; name: string; zone: string; weight: number; line: string; issues: unknown; timeToNextStation: number | null; connection: boolean }>;
    };
}

export async function fetchLineDiagram(line: LineId): Promise<LineDiagramData> {
    const raw = await getJson<LineIssuesFull>(`/metro/line-with-issues/${line.toLowerCase()}/1`, 60);
    const stations = Object.values(raw)
        .flatMap((sec) => sec.stations ?? [])
        .sort((a, b) => a.weight - b.weight)
        .map((s) => ({
            code: s.code,
            name: s.name.replace(/\s*\/\s*/g, '/'),
            zone: s.zone,
            trunk: s.line === 'T',
            issues: Boolean(s.issues),
            minToNext: s.timeToNextStation,
            connection: Boolean(s.connection),
        }));
    return { line, stations, fetchedAt: Date.now() };
}
