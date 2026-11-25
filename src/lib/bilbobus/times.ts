import timesJson from '@/data/bilbobus/catalog/times.json';
import { BB_DETAILS, getBbStop, towardsFor } from './catalog';
import type { BbDirection } from './types';

/*
 * Servidor. Horas de paso programadas de una línea en una parada, del GTFS (`sync-bilbobus-catalog.mjs`). Coinciden con el
 * "Horario estimado de paso" de la web oficial (comprobado con la línea 56 en Zamacola 168), pero salen al instante: esa
 * página tarda de 8 a 11 s por parada.
 */

interface ServiceDef {
    label: string;
    days: number[]; // 0 = domingo
    added: string[]; // AAAAMMDD
    removed: string[];
}
const DATA = timesJson as unknown as { services: Record<string, ServiceDef>; times: Record<string, Record<string, string>> };

export interface PassGroup {
    label: string;
    /** "HH:mm". Pasada la medianoche el GTFS sigue contando (25:10): se muestra como 01:10. */
    times: string[];
    today: boolean;
}

export interface StopLineTimes {
    stop: string;
    line: string;
    direction: BbDirection;
    towards: string;
    groups: PassGroup[];
    /** Primera salida de hoy a partir de ahora, si queda alguna. */
    next: string | null;
}

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

/** Servicios del GTFS que circulan ese día: patrón semanal, quitando las fechas excluidas y sumando las añadidas. */
export function activeServices(date: string, weekday: number): string[] {
    return Object.entries(DATA.services)
        .filter(([, s]) => !s.removed.includes(date) && (s.days.includes(weekday) || s.added.includes(date)))
        .map(([id]) => id);
}

const fmt = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/** Orden de las columnas: primero lo habitual de la semana, luego los días especiales. */
const RANK = ['Lunes a jueves', 'Lunes a viernes', 'Viernes', 'Sábados', 'Domingos', 'Festivos'];
const rank = (label: string) => {
    const i = RANK.indexOf(label);
    return i === -1 ? RANK.length : i;
};

export function passTimes(line: string, stop: string, now = new Date()): StopLineTimes[] {
    if (!getBbStop(stop) || !BB_DETAILS[line]) return [];
    const { date, weekday, minutes } = madridNow(now);
    const active = new Set(activeServices(date, weekday));
    const out: StopLineTimes[] = [];

    for (const direction of ['0', '1'] as BbDirection[]) {
        const bySvc = DATA.times[`${line}|${direction}|${stop}`];
        if (!bySvc) continue;
        const groups = Object.entries(bySvc)
            .map(([svc, csv]) => ({ svc, label: DATA.services[svc]?.label ?? svc, mins: csv.split(',').map(Number) }))
            .sort((a, b) => Number(active.has(b.svc)) - Number(active.has(a.svc)) || rank(a.label) - rank(b.label))
            .map<PassGroup & { mins: number[] }>((g) => ({ label: g.label, times: g.mins.map(fmt), today: active.has(g.svc), mins: g.mins }));
        const todayMins = groups.filter((g) => g.today).flatMap((g) => g.mins);
        const next = todayMins.find((m) => m >= minutes);
        out.push({
            stop,
            line,
            direction,
            towards: BB_DETAILS[line].terminals?.[direction] ?? towardsFor(line, stop),
            groups: groups.map(({ label, times, today }) => ({ label, times, today })),
            next: next === undefined ? null : fmt(next),
        });
    }
    return out;
}
