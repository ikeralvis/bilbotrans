/**
 * La API de Metro da horas "de reloj" de Bilbao sin zona ("2026-10-29T12:27:28").
 * Para contar atrás en segundos hay que pasarlas a instante real, sea cual sea la zona del móvil.
 */

const MADRID = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});

/** Diferencia (ms) entre la hora de pared de Bilbao y UTC en el instante `nowMs` (3 600 000 en invierno). */
export function madridOffsetMs(nowMs = Date.now()): number {
    const p = Object.fromEntries(MADRID.formatToParts(new Date(nowMs)).map((x) => [x.type, x.value]));
    const wall = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
    return wall - Math.floor(nowMs / 1000) * 1000;
}

/** Instante real (ms) de una hora de pared de Bilbao "YYYY-MM-DDTHH:mm:ss". */
export function wallToEpoch(iso: string, nowMs = Date.now()): number {
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(iso);
    if (!m) return Number.NaN;
    const wall = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] ?? 0));
    return wall - madridOffsetMs(nowMs);
}

/** Segundos que faltan para `iso` (negativo si ya pasó). */
export function secondsUntil(iso: string, nowMs = Date.now()): number {
    return Math.round((wallToEpoch(iso, nowMs) - nowMs) / 1000);
}

/** Cuenta atrás lista para pintar: minutos y segundos sueltos, y si ya llega. */
export function countdownParts(totalSeconds: number) {
    const s = Math.max(0, totalSeconds);
    return { minutes: Math.floor(s / 60), seconds: s % 60, arriving: s <= 10 };
}
