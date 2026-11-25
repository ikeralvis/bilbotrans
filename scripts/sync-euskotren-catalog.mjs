// Precompila el GTFS de Euskotren (Open Data Euskadi: tren, L3, tranvía de Bilbao y Vitoria, funicular de Larreineta) en
// `src/data/euskotren/catalog/`:
//   stations.json      estaciones/paradas con sus líneas, zona y accesibilidad
//   lines.json         líneas (`route_short_name`) con color oficial, modo y operador
//   lines-detail.json  recorrido de cada línea por sentido (`direction_id`) y destino de cada sentido (`trip_headsign`)
//   times.json         horas de salida programadas por línea, sentido, estación y servicio (solo servidor)
//   meta.json          vigencia del feed
// El tiempo real (GTFS-RT `trip_updates`) se pide al vuelo; aquí solo va lo estático. Una estación es el `StopPlace:N` del GTFS y
// sus andenes son los `Quay:N_Plataforma_Qx` (el número N los une, y es el mismo que usa el GTFS-RT).
//
// Uso: node scripts/sync-euskotren-catalog.mjs [ruta/al/gtfs.zip]

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AdmZip from 'adm-zip';

const GTFS_URL = 'https://opendata.euskadi.eus/transport/moveuskadi/euskotren/gtfs_euskotren.zip';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'src', 'data', 'euskotren', 'catalog');

/** CSV con comillas, sin dependencias. */
function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = '';
    let quoted = false;
    const src = text.replace(/^﻿/, '');
    for (let i = 0; i < src.length; i++) {
        const ch = src[i];
        if (quoted) {
            if (ch === '"' && src[i + 1] === '"') {
                field += '"';
                i++;
            } else if (ch === '"') quoted = false;
            else field += ch;
        } else if (ch === '"') quoted = true;
        else if (ch === ',') {
            row.push(field);
            field = '';
        } else if (ch === '\n' || ch === '\r') {
            if (ch === '\r' && src[i + 1] === '\n') i++;
            row.push(field);
            field = '';
            if (row.length > 1 || row[0] !== '') rows.push(row);
            row = [];
        } else field += ch;
    }
    if (field !== '' || row.length) {
        row.push(field);
        rows.push(row);
    }
    const [header, ...body] = rows;
    return body.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

async function loadZip() {
    const arg = process.argv[2];
    if (arg) return new AdmZip(await readFile(arg));
    const res = await fetch(GTFS_URL, { signal: AbortSignal.timeout(120_000) });
    if (!res.ok) throw new Error(`GTFS ${res.status}`);
    return new AdmZip(Buffer.from(await res.arrayBuffer()));
}

const zip = await loadZip();
const read = (name) => {
    const e = zip.getEntry(name);
    return e ? parseCsv(e.getData().toString('utf8')) : [];
};

const routes = read('routes.txt');
const agencies = Object.fromEntries(read('agency.txt').map((a) => [a.agency_id, a]));
const trips = read('trips.txt');
const stops = read('stops.txt');
const stopTimes = read('stop_times.txt');
const calendar = read('calendar.txt');
const calendarDates = read('calendar_dates.txt');
const feed = read('feed_info.txt')[0] ?? {};

/** `ES:Euskotren:Quay:2675_Plataforma_Q1:` / `ES:Euskotren:StopPlace:2675:` → "2675". */
const stationOf = (stopId) => /:(?:Quay|StopPlace|Place):(\d+)/.exec(stopId)?.[1] ?? null;
const OPERATOR = { EUS_Tren: 'tren', EUS_TrBi: 'tranvia-bilbao', EUS_TrGa: 'tranvia-vitoria', EUS_Funi: 'funicular' };

// ── Líneas (se descarta FCC: línea genérica "Línea EuskoTren" que solo aparece en el tiempo real) ──
const lineList = routes
    .filter((r) => r.route_short_name !== 'FCC')
    .map((r) => ({
        id: r.route_id,
        code: r.route_short_name,
        name: r.route_long_name,
        color: `#${r.route_color || '003f8c'}`,
        textColor: `#${r.route_text_color || 'FFFFFF'}`,
        operator: OPERATOR[/:Operator:([A-Za-z_]+):/.exec(r.agency_id)?.[1] ?? ''] ?? 'tren',
        order: Number(r.route_sort_order || 99),
    }))
    .sort((a, b) => a.order - b.order)
    .map((l) => ({ id: l.id, code: l.code, name: l.name, color: l.color, textColor: l.textColor, operator: l.operator }));
const lineById = new Map(lineList.map((l) => [l.id, l]));
const tripInfo = new Map();
for (const t of trips) {
    const line = lineById.get(t.route_id);
    if (line) tripInfo.set(t.trip_id, { line: line.code, dir: t.direction_id || '0', service: t.service_id, headsign: t.trip_headsign, accessible: t.wheelchair_accessible === '1' });
}

// ── Estaciones ──
const stationRows = new Map(); // N → fila de StopPlace (si existe)
for (const s of stops) if (s.location_type === '1') stationRows.set(stationOf(s.stop_id), s);
const quayRow = new Map();
for (const s of stops) if (s.location_type === '' || s.location_type === '0') quayRow.set(s.stop_id, s);

const byTrip = new Map();
for (const st of stopTimes) {
    if (!tripInfo.has(st.trip_id)) continue;
    let a = byTrip.get(st.trip_id);
    if (!a) byTrip.set(st.trip_id, (a = []));
    a.push(st);
}
for (const a of byTrip.values()) a.sort((x, y) => Number(x.stop_sequence) - Number(y.stop_sequence));

const stationLines = new Map(); // N → Set<line>
const stationQuays = new Map();
for (const [tripId, seq] of byTrip) {
    const { line } = tripInfo.get(tripId);
    for (const st of seq) {
        const n = stationOf(st.stop_id);
        if (!n) continue;
        (stationLines.get(n) ?? stationLines.set(n, new Set()).get(n)).add(line);
        (stationQuays.get(n) ?? stationQuays.set(n, new Set()).get(n)).add(st.stop_id);
    }
}

const lineOrder = new Map(lineList.map((l, i) => [l.code, i]));
const stations = [...stationLines.keys()]
    .map((n) => {
        const row = stationRows.get(n) ?? quayRow.get([...stationQuays.get(n)][0]);
        const quay = quayRow.get([...stationQuays.get(n)][0]);
        return {
            id: n,
            name: row.stop_name,
            /** Calle o municipio (`stop_desc`), por ejemplo "Calle Uribitarte / Bilbao". */
            desc: row.stop_desc || '',
            lat: Number(row.stop_lat || quay?.stop_lat),
            lon: Number(row.stop_lon || quay?.stop_lon),
            accessible: row.wheelchair_boarding === '1' || quay?.wheelchair_boarding === '1',
            zone: (row.zone_id || quay?.zone_id || '').replace(/^.*Zone:|:$/g, '') || null,
            lines: [...stationLines.get(n)].sort((a, b) => lineOrder.get(a) - lineOrder.get(b)),
        };
    })
    .filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lon))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
const stationIds = new Set(stations.map((s) => s.id));

// ── Recorrido por línea y sentido: el viaje con más paradas (hay cortes en E1, E3…), y destino más común ──
const details = {};
const tally = {};
for (const [tripId, seq] of byTrip) {
    const t = tripInfo.get(tripId);
    const ids = seq.map((s) => stationOf(s.stop_id)).filter((n, i, a) => n && stationIds.has(n) && a[i - 1] !== n);
    const d = (details[t.line] ??= { code: t.line, name: lineById.get([...lineById.keys()].find((k) => lineById.get(k).code === t.line)).name, directions: {}, terminals: {} });
    if (!d.directions[t.dir] || ids.length > d.directions[t.dir].length) d.directions[t.dir] = ids;
    const key = `${t.line}|${t.dir}`;
    const counts = (tally[key] ??= {});
    counts[t.headsign] = (counts[t.headsign] ?? 0) + 1;
}
for (const [key, counts] of Object.entries(tally)) {
    const [line, dir] = key.split('|');
    details[line].terminals[dir] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

// ── Servicios y horas de salida ──
const DAY_COLUMNS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const services = {};
for (const c of calendar) {
    services[c.service_id] = { days: DAY_COLUMNS.map((d, i) => (c[d] === '1' ? i : -1)).filter((i) => i >= 0), start: c.start_date, end: c.end_date, added: [], removed: [] };
}
for (const e of calendarDates) {
    const svc = (services[e.service_id] ??= { days: [], start: e.date, end: e.date, added: [], removed: [] });
    (e.exception_type === '1' ? svc.added : svc.removed).push(e.date);
}
const toMin = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
};
const timesByKey = {};
const usedServices = new Set();
for (const [tripId, seq] of byTrip) {
    const t = tripInfo.get(tripId);
    seq.forEach((st, i) => {
        const n = stationOf(st.stop_id);
        if (!n || !stationIds.has(n) || i === seq.length - 1) return; // en la última parada no salen viajeros
        const bucket = ((timesByKey[`${t.line}|${t.dir}|${n}`] ??= {})[t.service] ??= []);
        bucket.push(toMin(st.departure_time || st.arrival_time));
        usedServices.add(t.service);
    });
}
for (const bySvc of Object.values(timesByKey)) for (const [svc, mins] of Object.entries(bySvc)) bySvc[svc] = [...new Set(mins)].sort((a, b) => a - b).join(',');
const serviceOut = Object.fromEntries([...usedServices].map((id) => [id, services[id]]));

await mkdir(out, { recursive: true });
const meta = { feedStart: feed.feed_start_date || null, feedEnd: feed.feed_end_date || null, feedVersion: feed.feed_version || null, generatedAt: new Date().toISOString() };
await writeFile(path.join(out, 'stations.json'), JSON.stringify(stations));
await writeFile(path.join(out, 'lines.json'), JSON.stringify(lineList));
await writeFile(path.join(out, 'lines-detail.json'), JSON.stringify(details));
await writeFile(path.join(out, 'times.json'), JSON.stringify({ services: serviceOut, times: timesByKey }));
await writeFile(path.join(out, 'meta.json'), JSON.stringify(meta));

console.log(`estaciones: ${stations.length}, líneas: ${lineList.map((l) => l.code).join(' ')}, agencias: ${Object.keys(agencies).length}`);
console.log(`horas: ${Object.keys(timesByKey).length} combinaciones línea·sentido·estación, servicios: ${Object.keys(serviceOut).length}`);
console.log(`feed ${meta.feedStart} → ${meta.feedEnd}`);
