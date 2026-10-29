import type { Timetable } from './client';

/* Búsqueda de trayectos por franja horaria (origen, destino, hora inicio, hora fin y fecha). Todo en hora de Bilbao. */

export interface TripWindow {
    start: string; // HH:mm
    end: string; // HH:mm
    date: string; // YYYY-MM-DD
}

export interface TripRow {
    dep: string;
    arr: string;
    /** Minutos de viaje (con cambio incluido). */
    minutes: number;
    transfer: boolean;
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const isClock = (v: string | null | undefined): v is string => !!v && TIME_RE.test(v);
export const isIsoDate = (v: string | null | undefined): v is string => !!v && DATE_RE.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));

export const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
export const fromMinutes = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

/** Fecha y hora actuales en Bilbao (el navegador puede estar en otra zona horaria). */
export function bilbaoClock(nowMs = Date.now()) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Madrid',
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date(nowMs));
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
    return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` };
}

/** Franja por defecto: desde ahora (redondeado a 5 min hacia abajo) y 2 horas, sin pasar de medianoche. */
export function defaultWindow(nowMs = Date.now()): TripWindow {
    const { date, time } = bilbaoClock(nowMs);
    const start = Math.floor(toMinutes(time) / 5) * 5;
    return { date, start: fromMinutes(start), end: fromMinutes(Math.min(start + 120, 23 * 60 + 59)) };
}

/** Lee la franja de los parámetros de la URL; devuelve null si falta o es inválida (entonces se muestra el modo «ahora»). */
export function parseWindow(sp: { get(name: string): string | null }): TripWindow | null {
    const start = sp.get('start');
    const end = sp.get('end');
    const date = sp.get('date') ?? bilbaoClock().date;
    if (!isClock(start) || !isClock(end) || !isIsoDate(date)) return null;
    return { start, end, date };
}

export function scheduleHref(origin: string, dest: string, w: TripWindow) {
    return `/metro/route?origin=${origin}&dest=${dest}&start=${w.start}&end=${w.end}&date=${w.date}`;
}

/** Une todas las franjas de salida de la respuesta en una lista ordenada y sin duplicados: «sale → llega». */
export function flattenTrips(t: Timetable): TripRow[] {
    const seen = new Set<string>();
    const rows: TripRow[] = [];
    for (const leg of t.legs) {
        for (const d of leg.departures) {
            const key = `${d.dep}>${d.arr}`;
            if (seen.has(key) || !isClock(d.dep) || !isClock(d.arr)) continue;
            seen.add(key);
            let minutes = toMinutes(d.arr) - toMinutes(d.dep);
            if (minutes < 0) minutes += 24 * 60; // pasa de medianoche
            rows.push({ dep: d.dep, arr: d.arr, minutes, transfer: d.transferAt !== null || t.transfer });
        }
    }
    return rows.sort((a, b) => a.dep.localeCompare(b.dep) || a.arr.localeCompare(b.arr));
}

/** «Viajar ahora» está dentro de la franja: la fecha es hoy y la hora actual cae entre inicio y fin. */
export function windowIsNow(w: TripWindow, nowMs = Date.now()) {
    const now = bilbaoClock(nowMs);
    return w.date === now.date && toMinutes(now.time) >= toMinutes(w.start) && toMinutes(now.time) <= toMinutes(w.end);
}
