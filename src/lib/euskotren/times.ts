import timesJson from '@/data/euskotren/catalog/times.json';
import { ET_DETAILS, getEtStation, terminalOf } from './catalog';
import type { EtDirection } from './types';

/*
 * Servidor. Horas de salida programadas de una línea en una estación, del GTFS (`sync-euskotren-catalog.mjs`).
 * El feed trae decenas de "servicios" con rangos de fechas y excepciones; en vez de enseñarlos tal cual, se calcula qué sale
 * cada uno de los próximos 7 días y se agrupan los días con las mismas horas ("Lun–Jue", "Vie", "Sáb"…).
 */

interface ServiceDef {
    days: number[]; // 0 = domingo
    start: string; // AAAAMMDD
    end: string;
    added: string[];
    removed: string[];
}
const DATA = timesJson as unknown as { services: Record<string, ServiceDef>; times: Record<string, Record<string, string>> };

export interface PassGroup {
    label: string;
    times: string[];
    today: boolean;
}

export interface StationLineTimes {
    station: string;
    line: string;
    direction: EtDirection;
    towards: string;
    groups: PassGroup[];
    /** Primera salida de hoy a partir de ahora, si queda alguna. */
    next: string | null;
}

const DAY = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/** AAAAMMDD, día de la semana (0 = domingo) y minutos desde medianoche en Bilbao. */
export function madridNow(now = new Date()) {
    const parts = Object.fromEntries(
        new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
            .formatToParts(now)
            .map((p) => [p.type, p.value]),
    );
    const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
    return { date: `${parts.year}${parts.month}${parts.day}`, weekday, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

/** Suma `n` días a AAAAMMDD y devuelve esa fecha y su día de la semana. */
function addDays(date: string, weekday: number, n: number) {
    const d = new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(4, 6)) - 1, Number(date.slice(6, 8)) + n));
    const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
    return { date: ymd, weekday: (weekday + n) % 7 };
}

/** Servicios del GTFS que circulan ese día: dentro de su rango, con su patrón semanal, sin las fechas excluidas y con las añadidas. */
export function activeServices(date: string, weekday: number): Set<string> {
    return new Set(
        Object.entries(DATA.services)
            .filter(([, s]) => !s.removed.includes(date) && (s.added.includes(date) || (date >= s.start && date <= s.end && s.days.includes(weekday))))
            .map(([id]) => id),
    );
}

export const fmt = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/** "Lun–Jue", "Vie", "Sáb, Dom"… a partir de los días de la semana de un grupo, en orden de calendario (semana desde el lunes). */
function dayLabel(weekdays: number[]): string {
    const sorted = [...new Set(weekdays)].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
    if (sorted.length === 1) return DAY[sorted[0]];
    const run = sorted.every((d, i) => i === 0 || (d + 6) % 7 === ((sorted[i - 1] + 6) % 7) + 1);
    return run ? `${DAY[sorted[0]]}–${DAY[sorted[sorted.length - 1]]}` : sorted.map((d) => DAY[d]).join(', ');
}

/** Minutos de salida de un día para una combinación línea·sentido·estación, mezclando los servicios activos. */
function minutesFor(key: string, date: string, weekday: number): number[] {
    const bySvc = DATA.times[key];
    if (!bySvc) return [];
    const active = activeServices(date, weekday);
    return [...new Set(Object.entries(bySvc).filter(([svc]) => active.has(svc)).flatMap(([, csv]) => csv.split(',').map(Number)))].sort((a, b) => a - b);
}

export function stationTimes(line: string, station: string, now = new Date()): StationLineTimes[] {
    if (!getEtStation(station) || !ET_DETAILS[line]) return [];
    const today = madridNow(now);
    const out: StationLineTimes[] = [];
    for (const direction of ['0', '1'] as EtDirection[]) {
        const key = `${line}|${direction}|${station}`;
        if (!DATA.times[key]) continue;
        // en la última estación de un sentido no sale nadie: solo quedan viajes sueltos que acaban ahí
        if (ET_DETAILS[line].directions[direction]?.at(-1) === station) continue;
        const groups: Array<{ csv: string; mins: number[]; weekdays: number[]; today: boolean }> = [];
        for (let n = 0; n < 7; n++) {
            const d = addDays(today.date, today.weekday, n);
            const mins = minutesFor(key, d.date, d.weekday);
            if (!mins.length) continue;
            const csv = mins.join(',');
            const g = groups.find((x) => x.csv === csv);
            if (g) g.weekdays.push(d.weekday);
            else groups.push({ csv, mins, weekdays: [d.weekday], today: n === 0 });
        }
        const todayMins = groups.find((g) => g.today)?.mins ?? [];
        const next = todayMins.find((m) => m >= today.minutes);
        out.push({
            station,
            line,
            direction,
            towards: terminalOf(line, direction),
            groups: groups.map((g) => ({ label: g.today ? `Hoy · ${dayLabel(g.weekdays)}` : dayLabel(g.weekdays), times: g.mins.map(fmt), today: g.today })),
            next: next === undefined ? null : fmt(next),
        });
    }
    return out;
}

/** Próximas salidas programadas de una estación (todas las líneas), por si no hay tiempo real. */
export function scheduledNext(station: string, limit = 12, now = new Date()) {
    const { date, weekday, minutes } = madridNow(now);
    const st = getEtStation(station);
    if (!st) return [];
    const rows: Array<{ line: string; direction: EtDirection; minutes: number; towards: string }> = [];
    for (const line of st.lines) {
        for (const direction of ['0', '1'] as EtDirection[]) {
            for (const m of minutesFor(`${line}|${direction}|${station}`, date, weekday)) {
                if (m >= minutes) rows.push({ line, direction, minutes: m - minutes, towards: terminalOf(line, direction) });
            }
        }
    }
    return rows.sort((a, b) => a.minutes - b.minutes).slice(0, limit);
}
