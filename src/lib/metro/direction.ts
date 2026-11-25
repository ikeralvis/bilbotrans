import stationsData from '@/data/metro/stations.json';

/** Sentido físico de un tren respecto a la estación consultada. */
export type Side = 'inland' | 'coast';

export const SIDE_LABEL: Record<Side, string> = {
    inland: 'Basauri · Etxebarri',
    coast: 'Kabiezes · Plentzia',
};

export interface RawTrain {
    Destination: string;
    Direction: string | number;
    Length: number;
    Minutes: number;
    Time: string;
    line: string;
}

export interface Train {
    line: string;
    destination: string;
    minutes: number;
    wagons: number;
    time: string;
    side: Side;
}

export interface DirectionGroup {
    side: Side;
    label: string;
    trains: Train[];
}

interface LineDef {
    stations: Array<{ code: string; name: string; order: number }>;
}

const LINES = stationsData as unknown as Record<string, LineDef>;

const norm = (s: string) =>
    s
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/kabieces/g, 'kabiezes')
        .replace(/plencia/g, 'plentzia')
        .trim();

/** Nombre de estación normalizado -> orden dentro de cada línea (orden creciente = hacia la costa). */
function orderIn(line: string, nameOrCode: string): number | null {
    const def = LINES[line];
    if (!def) return null;
    const n = norm(nameOrCode);
    const hit = def.stations.find((s) => s.code === nameOrCode || norm(s.name) === n || norm(s.name).includes(n) || n.includes(norm(s.name)));
    return hit ? hit.order : null;
}

/**
 * Determina el sentido de un tren. Orden de fiabilidad:
 * 1. `Direction` de la API: "Etxebarri/Basauri" | 2 => interior; "Kabiezes/Plentzia" | 1 => costa.
 * 2. Orden del destino frente al de la estación en la línea.
 * Nunca se usa el índice del array `Platforms` (no es estable en terminales).
 */
export function sideOf(train: RawTrain, stationCode: string): Side {
    const d = train.Direction;
    if (d === 2 || d === '2') return 'inland';
    if (d === 1 || d === '1') return 'coast';
    if (typeof d === 'string') {
        const n = norm(d);
        if (n.startsWith('etxebarri') || n.startsWith('basauri')) return 'inland';
        if (n.startsWith('kabiezes') || n.startsWith('plentzia')) return 'coast';
    }
    const line = train.line in LINES ? train.line : 'L1';
    const here = orderIn(line, stationCode);
    const there = orderIn(line, train.Destination);
    if (here !== null && there !== null) return there > here ? 'coast' : 'inland';
    const dest = norm(train.Destination);
    return dest.includes('basauri') || dest.includes('etxebarri') ? 'inland' : 'coast';
}

export function toTrain(raw: RawTrain, stationCode: string): Train {
    return {
        line: raw.line || 'L1',
        destination: raw.Destination,
        minutes: Math.max(0, raw.Minutes),
        wagons: raw.Length,
        time: raw.Time,
        side: sideOf(raw, stationCode),
    };
}

/**
 * Agrupa trenes por sentido. Siempre devuelve los grupos que existen en la estación
 * (terminales: solo uno) en orden estable: interior primero, costa después.
 */
export function groupByDirection(platforms: RawTrain[][] | undefined, stationCode: string, perSide = 4): DirectionGroup[] {
    const all = (platforms ?? []).flat().map((t) => toTrain(t, stationCode));
    const groups: DirectionGroup[] = [];
    for (const side of ['inland', 'coast'] as Side[]) {
        const trains = all
            .filter((t) => t.side === side)
            .sort((a, b) => a.minutes - b.minutes)
            .slice(0, perSide);
        groups.push({ side, label: SIDE_LABEL[side], trains });
    }
    return groups;
}

/**
 * Estación contigua en cada sentido, agrupada: pedir /metro/real-time/{estación}/{vecina} devuelve todos los trenes
 * que paran en la vecina. Si las líneas se separan justo ahí (p. ej. San Ignazio hacia la costa) salen dos vecinas.
 */
export function neighborsBySide(stationCode: string): Record<Side, Array<{ code: string; lines: string[] }>> {
    const out: Record<Side, Array<{ code: string; lines: string[] }>> = { inland: [], coast: [] };
    for (const line of ['L1', 'L2']) {
        const stations = LINES[line]?.stations ?? [];
        const idx = stations.findIndex((s) => s.code === stationCode);
        if (idx === -1) continue;
        for (const [side, at] of [['inland', idx - 1], ['coast', idx + 1]] as Array<[Side, number]>) {
            const n = stations[at];
            if (!n) continue;
            const hit = out[side].find((x) => x.code === n.code);
            if (hit) hit.lines.push(line);
            else out[side].push({ code: n.code, lines: [line] });
        }
    }
    return out;
}

/** Línea de un tren de /metro/real-time (que no la trae) a partir de su destino final. */
export function lineOfDestination(destination: string, candidates: string[]): string {
    if (candidates.length === 1) return candidates[0];
    const n = norm(destination);
    if (n.startsWith('basauri') || n.startsWith('kabiezes')) return 'L2';
    if (n.startsWith('etxebarri') || n.startsWith('plentzia')) return 'L1';
    const only = candidates.filter((l) => orderIn(l, destination) !== null);
    return only.length === 1 ? only[0] : candidates[0];
}

/** Líneas y sentidos que sirve una estación según la topología (para estaciones terminales). */
export function sidesServed(stationCode: string): Side[] {
    const sides = new Set<Side>();
    for (const def of Object.values(LINES)) {
        const idx = def.stations.findIndex((s) => s.code === stationCode);
        if (idx === -1) continue;
        if (idx > 0) sides.add('inland');
        if (idx < def.stations.length - 1) sides.add('coast');
    }
    return [...sides];
}
