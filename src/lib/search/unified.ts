import { STATIONS } from '@/lib/metro/catalog';
import { BB_LINES, BB_STOPS } from '@/lib/bilbobus/catalog';
import { LINES as BZ_LINES, STOPS as BZ_STOPS, shortLine } from '@/lib/bizkaibus/catalog';
import { ET_LINES, ET_STATIONS } from '@/lib/euskotren/catalog';
import { isNetworkEnabled } from '@/lib/networks';
import { distanceMeters, normalize, titleCase } from '@/lib/shared/textGeo';
import type { NetworkId } from '@/components/shared/brand';

/**
 * Buscador único de la home: estaciones, paradas y líneas de todas las redes activas.
 * Corre solo en servidor (`/api/search`) para no meter los catálogos de bus en el bundle de la home.
 */

export interface SearchHit {
    kind: 'stop' | 'line';
    network: NetworkId;
    id: string;
    name: string;
    /** Municipio, código de parada o nombre de la línea. */
    detail: string;
    /** Líneas que paran (solo paradas), en el formato corto que se muestra en el chip. */
    lines: string[];
    /** Color de la línea (solo líneas con color propio). */
    color: string | null;
    href: string;
}

export interface SearchGroup {
    /** Nombre normalizado del lugar: agrupa "Abando" de Metro, Bilbobus y Bizkaibus. */
    key: string;
    name: string;
    hits: SearchHit[];
}

interface Indexed { hit: SearchHit; text: string; name: string }

const PLACE_NOISE = /\b(geltokia|estacion|estación|geltoki|metro|parada|kalea|calle|av|avda|etorbidea)\b/g;
/** Clave de lugar: el nombre sin la coletilla bilingüe ni palabras de relleno. */
const placeKey = (name: string) => normalize(name.replace(/\(.*?\)/g, ' ')).replace(PLACE_NOISE, ' ').replace(/\s+/g, ' ').trim();

let INDEX: Indexed[] | null = null;

function buildIndex(): Indexed[] {
    const out: Indexed[] = [];
    const add = (hit: SearchHit, extra = '') => out.push({ hit, text: normalize(`${hit.name} ${hit.detail} ${extra}`), name: normalize(hit.name) });

    if (isNetworkEnabled('metro')) {
        for (const s of STATIONS) {
            add({ kind: 'stop', network: 'metro', id: s.code, name: s.name, detail: s.zone ? `Zona ${s.zone}` : 'Metro Bilbao', lines: s.lines, color: null, href: `/metro/station/${s.code}?agency=metro` }, s.code);
        }
    }
    if (isNetworkEnabled('bilbobus')) {
        for (const s of BB_STOPS) {
            add({ kind: 'stop', network: 'bilbobus', id: s.code, name: titleCase(s.name), detail: `Parada ${s.code}`, lines: s.lines, color: null, href: `/bilbobus/stop/${s.code}` }, s.code);
        }
        for (const l of BB_LINES) {
            add({ kind: 'line', network: 'bilbobus', id: l.code, name: l.code, detail: titleCase(l.name), lines: [], color: l.color, href: `/bilbobus/lines/${l.code}` });
        }
    }
    if (isNetworkEnabled('bizkaibus')) {
        for (const s of BZ_STOPS) {
            add({ kind: 'stop', network: 'bizkaibus', id: s.code, name: titleCase(s.name), detail: titleCase(s.municipality), lines: s.lines.map(shortLine), color: null, href: `/bizkaibus/stop/${s.code}` }, s.code);
        }
        for (const l of BZ_LINES) {
            add({ kind: 'line', network: 'bizkaibus', id: l.code, name: l.code, detail: titleCase(l.name), lines: [], color: null, href: `/bizkaibus/lines/${l.code}` });
        }
    }
    if (isNetworkEnabled('euskotren')) {
        for (const s of ET_STATIONS) {
            add({ kind: 'stop', network: 'euskotren', id: s.id, name: s.name, detail: s.desc || 'Euskotren', lines: s.lines, color: null, href: `/euskotren/station/${s.id}` });
        }
        for (const l of ET_LINES) {
            add({ kind: 'line', network: 'euskotren', id: l.code, name: l.code, detail: l.name, lines: [], color: l.color, href: `/euskotren/lines/${l.code}` });
        }
    }
    return out;
}

/** Orden de redes dentro de un mismo lugar: primero la de alta capacidad. */
const NET_ORDER: Record<string, number> = { metro: 0, euskotren: 1, bilbobus: 2, bizkaibus: 3 };

/**
 * Todas las palabras deben aparecer. Las paradas del mismo lugar (mismo nombre limpio) se agrupan,
 * así "Moyua" devuelve una sola entrada con la estación de Metro y las paradas de bus de alrededor.
 */
export function searchAll(query: string, limit = 8): { places: SearchGroup[]; lines: SearchHit[] } {
    const q = normalize(query);
    if (q.length < 2) return { places: [], lines: [] };
    INDEX ??= buildIndex();
    const words = q.split(' ');

    const lines: SearchHit[] = [];
    const scored: Array<{ hit: SearchHit; rank: number }> = [];
    for (const x of INDEX) {
        if (x.hit.kind === 'line') {
            // Una línea solo aparece si se busca por su código ("A3247", "56", "E1").
            const code = normalize(x.hit.id);
            const short = x.hit.network === 'bizkaibus' ? normalize(shortLine(x.hit.id)) : code;
            if (code === q || short === q || (q.length >= 2 && (code.startsWith(q) || short.startsWith(q)))) lines.push(x.hit);
            continue;
        }
        if (!words.every((w) => x.text.includes(w))) continue;
        const rank = x.name.startsWith(q) ? 0 : x.name.split(' ').some((w) => w.startsWith(words[0])) ? 1 : 2;
        scored.push({ hit: x.hit, rank });
    }

    scored.sort((a, b) => a.rank - b.rank || NET_ORDER[a.hit.network] - NET_ORDER[b.hit.network] || a.hit.name.length - b.hit.name.length);

    const groups = new Map<string, SearchGroup>();
    for (const { hit } of scored) {
        const key = placeKey(hit.name) || normalize(hit.name);
        let g = groups.get(key);
        if (!g) {
            if (groups.size >= limit) continue;
            g = { key, name: hit.name, hits: [] };
            groups.set(key, g);
        }
        // Máximo 4 paradas por lugar y red (las calles largas tienen muchas).
        if (g.hits.filter((h) => h.network === hit.network).length < 4) g.hits.push(hit);
    }
    for (const g of groups.values()) {
        g.hits.sort((a, b) => NET_ORDER[a.network] - NET_ORDER[b.network]);
        // El nombre del grupo: el de la estación de mayor capacidad.
        g.name = g.hits[0].name;
    }

    lines.sort((a, b) => a.id.length - b.id.length || a.id.localeCompare(b.id));
    return { places: [...groups.values()], lines: lines.slice(0, 6) };
}

export interface NearbyHit extends SearchHit { meters: number }

/** Paradas más cercanas de cada red activa (como mucho `perNetwork` por red y a menos de `maxMeters`). */
export function nearbyAll(lat: number, lon: number, perNetwork = 2, maxMeters = 900): NearbyHit[] {
    INDEX ??= buildIndex();
    const coords = coordIndex();
    const best = new Map<string, NearbyHit[]>();
    for (const x of INDEX) {
        if (x.hit.kind !== 'stop') continue;
        const c = coords.get(`${x.hit.network}:${x.hit.id}`);
        if (!c) continue;
        const meters = distanceMeters(lat, lon, c[0], c[1]);
        if (meters > maxMeters) continue;
        const list = best.get(x.hit.network) ?? [];
        list.push({ ...x.hit, meters });
        best.set(x.hit.network, list);
    }
    return [...best.values()]
        .flatMap((l) => l.sort((a, b) => a.meters - b.meters).slice(0, perNetwork))
        .sort((a, b) => a.meters - b.meters);
}

let COORDS: Map<string, [number, number]> | null = null;
function coordIndex() {
    if (COORDS) return COORDS;
    COORDS = new Map();
    for (const s of STATIONS) if (s.lat !== null && s.lon !== null) COORDS.set(`metro:${s.code}`, [s.lat, s.lon]);
    for (const s of BB_STOPS) COORDS.set(`bilbobus:${s.code}`, [s.lat, s.lon]);
    for (const s of BZ_STOPS) COORDS.set(`bizkaibus:${s.code}`, [s.lat, s.lon]);
    for (const s of ET_STATIONS) COORDS.set(`euskotren:${s.id}`, [s.lat, s.lon]);
    return COORDS;
}
