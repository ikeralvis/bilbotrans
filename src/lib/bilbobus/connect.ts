import { BB_DETAILS, BB_STOPS, getBbStop } from './catalog';
import { distanceMeters } from '@/lib/shared/textGeo';
import type { BbDirection } from './types';

/** Línea directa entre dos paradas. */
export interface BbConnection {
    line: string;
    lineName: string;
    direction: BbDirection;
    from: { code: string; name: string };
    to: { code: string; name: string };
    /** Destino final del sentido, como lo rotula el bus ("Jesusen Bihotza"). */
    towards: string;
    /** Paradas que recorre el bus entre subida y bajada. */
    stops: number;
}

/** Paradas "equivalentes": la acera de enfrente o a pocos pasos (otro código). */
const EQUIVALENT_METERS = 120;
const MAX_EQUIVALENTS = 6;

function equivalents(code: string): string[] {
    const base = getBbStop(code);
    if (!base) return [code];
    const near = BB_STOPS.filter((s) => s.code !== code)
        .map((s) => ({ code: s.code, m: distanceMeters(base.lat, base.lon, s.lat, s.lon) }))
        .filter((s) => s.m <= EQUIVALENT_METERS)
        .sort((a, b) => a.m - b.m)
        .slice(0, MAX_EQUIVALENTS)
        .map((s) => s.code);
    return [code, ...near];
}

/**
 * Líneas que te llevan de una parada a otra sin transbordo: tienen que pasar por el origen *antes* que por el destino en el mismo
 * sentido del recorrido más habitual. Se incluyen paradas a ≤ 120 m de cada extremo.
 */
export function findBbDirect(fromCode: string, toCode: string): BbConnection[] {
    const origins = new Set(equivalents(fromCode));
    const targets = new Set(equivalents(toCode));
    const found = new Map<string, BbConnection>();

    for (const line of Object.values(BB_DETAILS)) {
        for (const direction of ['0', '1'] as BbDirection[]) {
            const seq = line.directions[direction] ?? [];
            let best: BbConnection | null = null;
            seq.forEach((from, i) => {
                if (!origins.has(from.code)) return;
                for (let j = i + 1; j < seq.length; j++) {
                    if (!targets.has(seq[j].code)) continue;
                    if (!best || j - i < best.stops) best = { line: line.code, lineName: line.name, direction, from, to: seq[j], towards: line.terminals?.[direction] ?? seq[seq.length - 1].name, stops: j - i };
                    break;
                }
            });
            const prev = found.get(line.code);
            if (best && (!prev || (best as BbConnection).stops < prev.stops)) found.set(line.code, best);
        }
    }
    return [...found.values()].sort((a, b) => a.stops - b.stops || a.line.localeCompare(b.line, 'es', { numeric: true }));
}
