/** Retraso = hora real prevista menos hora programada de la misma salida (ver API.md §1.6). */

export type DelayState = 'on-time' | 'late' | 'early';

export interface TrainDelay {
    state: DelayState;
    /** Segundos de diferencia; positivo = retraso. */
    seconds: number;
    /** Minutos redondeados de la diferencia (siempre ≥ 1 salvo en hora). */
    minutes: number;
    /** Hora programada "HH:mm" de esa salida. */
    scheduled: string;
}

/** Bajo este margen el tren cuenta como en hora. */
export const ON_TIME_MARGIN_S = 60;
/** Si la salida programada más cercana está a más de esto, no se considera la misma. */
export const MAX_MATCH_S = 10 * 60;

/** Segundos desde medianoche de "HH:mm[:ss]" o de un ISO local "YYYY-MM-DDTHH:mm:ss". */
export function secondsOfDay(value: string): number {
    const t = value.includes('T') ? value.slice(value.indexOf('T') + 1) : value;
    const [h, m, s] = t.split(':').map((x) => Number.parseInt(x, 10));
    return (h || 0) * 3600 + (m || 0) * 60 + (s || 0);
}

/**
 * Empareja cada tren real con la salida programada más cercana, sin repetir salida.
 * Devuelve un retraso por tren (en el mismo orden) o `null` si no hay salida programada creíble.
 */
export function matchDelays(realTimes: string[], scheduledDepartures: string[]): Array<TrainDelay | null> {
    const sched = scheduledDepartures.map((d) => ({ d, s: secondsOfDay(d) }));
    const used = new Set<number>();
    const order = realTimes.map((t, i) => ({ i, s: secondsOfDay(t) })).sort((a, b) => a.s - b.s);
    const out: Array<TrainDelay | null> = realTimes.map(() => null);

    for (const { i, s } of order) {
        let best = -1;
        let bestGap = Infinity;
        sched.forEach((c, j) => {
            const gap = Math.abs(s - c.s);
            if (!used.has(j) && gap < bestGap) {
                best = j;
                bestGap = gap;
            }
        });
        if (best < 0 || bestGap > MAX_MATCH_S) continue;
        used.add(best);
        const seconds = s - sched[best].s;
        const state: DelayState = Math.abs(seconds) < ON_TIME_MARGIN_S ? 'on-time' : seconds > 0 ? 'late' : 'early';
        out[i] = {
            state,
            seconds,
            minutes: state === 'on-time' ? 0 : Math.max(1, Math.round(Math.abs(seconds) / 60)),
            scheduled: sched[best].d.slice(0, 5),
        };
    }
    return out;
}
