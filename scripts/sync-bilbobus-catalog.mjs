// Precompila el GTFS de Bilbobus (Ayuntamiento de Bilbao / Open Data Euskadi, mismo fichero) en `src/data/bilbobus/catalog/`:
//   stops.json         paradas con las líneas que pasan por cada una
//   lines.json         líneas (`route_short_name`, la que usa la web y el AJAX de tiempos de espera) con su color oficial
//   lines-detail.json  recorrido de cada línea por sentido (`direction_id` 0/1) y destino final de cada sentido (`trip_headsign`)
//   times.json         horas de paso programadas por línea, sentido, parada y tipo de día (solo servidor; ~2 MB)
//   meta.json          vigencia del feed
// La clave de unión con el AJAX es `stop_code` (= `codParada`) y `route_short_name` (= `codLinea`). Ver API.md §4b.
//
// Uso: node scripts/sync-bilbobus-catalog.mjs [ruta/al/gtfs.zip]

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import AdmZip from 'adm-zip';

const GTFS_URL = 'https://opendata.euskadi.eus/transport/moveuskadi/bilbobus/gtfs_bilbobus.zip';
// El GTFS no trae `route_color`: los colores de cada línea están en la hoja de estilos de la web oficial (`.l56 {background: #3F2794}`).
// OJO: el cortafuegos de bilbao.eus rechaza los `User-Agent` propios; aquí se usan las cabeceras por defecto.
const CSS_URL = 'https://www.bilbao.eus/Bilbobus/css/bilbobus-styles.css';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'src', 'data', 'bilbobus', 'catalog');

/** CSV con comillas ("a,b" y "" dentro de un campo), sin dependencias. */
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
    const res = await fetch(GTFS_URL, { headers: { 'User-Agent': 'BilboTrans/1.0 (+catalog sync)' } });
    if (!res.ok) throw new Error(`GTFS ${res.status}`);
    return new AdmZip(Buffer.from(await res.arrayBuffer()));
}

/** `.l56` → "56", `.l1` → "01", `.a3` → "A3", `.g4` → "G4". Los refuerzos E* usan el color de su línea base (E56 → 56). */
async function loadLineColors() {
    try {
        const res = await fetch(CSS_URL);
        if (!res.ok) throw new Error(String(res.status));
        const css = await res.text();
        const colors = {};
        for (const m of css.matchAll(/\.([lag])(\d{1,2})\s*\{\s*background:\s*(#[0-9a-fA-F]{6})\s*\}/g)) {
            const code = m[1] === 'l' ? m[2].padStart(2, '0') : `${m[1].toUpperCase()}${m[2]}`;
            colors[code] = m[3].toUpperCase();
        }
        if (Object.keys(colors).length < 20) throw new Error('el CSS no trae colores de línea (¿cambió el formato?)');
        return colors;
    } catch (e) {
        // Sin red o formato nuevo: se conservan los colores del catálogo anterior en vez de perderlos.
        console.warn(`⚠ No se pudieron leer los colores del CSS oficial (${e.message}); se conservan los anteriores.`);
        try {
            const prev = JSON.parse(await readFile(path.join(out, 'lines.json'), 'utf8'));
            return Object.fromEntries(prev.filter((l) => l.color).map((l) => [l.code, l.color]));
        } catch {
            return {};
        }
    }
}

const lineColors = await loadLineColors();
const colorOf = (code) => lineColors[code] ?? (code.startsWith('EA') ? lineColors[`A${code.slice(2)}`] : code.startsWith('E') ? lineColors[code.slice(1).padStart(2, '0')] : undefined) ?? null;

const zip = await loadZip();
const read = (name) => {
    const entry = zip.getEntry(name);
    if (!entry) throw new Error(`Falta ${name} en el GTFS`);
    return parseCsv(entry.getData().toString('utf8'));
};

const stopsRaw = read('stops.txt');
const routesRaw = read('routes.txt');
const tripsRaw = read('trips.txt');
const stopTimes = read('stop_times.txt');
const feed = read('feed_info.txt')[0] ?? {};

const stopById = new Map(stopsRaw.map((s) => [s.stop_id, s]));
const routeById = new Map(routesRaw.map((r) => [r.route_id, r]));

// Secuencia de paradas (stop_code) de cada viaje, en orden.
const seqByTrip = new Map();
for (const st of stopTimes) {
    const stop = stopById.get(st.stop_id);
    if (!stop) continue;
    let list = seqByTrip.get(st.trip_id);
    if (!list) seqByTrip.set(st.trip_id, (list = []));
    list.push([Number(st.stop_sequence), stop.stop_code]);
}
for (const list of seqByTrip.values()) list.sort((a, b) => a[0] - b[0]);

// Por línea y sentido: el patrón de paradas más repetido (si empatan, el más largo) es "el recorrido".
const patterns = new Map(); // `${linea}|${sentido}` → Map(patrón → nº de viajes)
const headsigns = new Map(); // `${linea}|${sentido}` → Map(destino → nº de viajes)

/** "PT-Semana / (JESUSEN BIHOTZA)" → "JESUSEN BIHOTZA". Sin paréntesis ("PT-Semana/Retirada" = viaje a cocheras) no es un destino. */
const terminalOf = (headsign) => /\(([^)]+)\)\s*$/.exec(headsign)?.[1]?.trim() ?? null;
const linesAtStop = new Map();
for (const trip of tripsRaw) {
    const route = routeById.get(trip.route_id);
    const seq = seqByTrip.get(trip.trip_id);
    if (!route || !seq) continue;
    const line = route.route_short_name;
    const codes = seq.map((s) => s[1]);
    const key = `${line}|${trip.direction_id}`;
    const map = patterns.get(key) ?? new Map();
    map.set(codes.join(','), (map.get(codes.join(',')) ?? 0) + 1);
    patterns.set(key, map);
    const terminal = terminalOf(trip.trip_headsign ?? '');
    if (terminal) {
        const hs = headsigns.get(key) ?? new Map();
        hs.set(terminal, (hs.get(terminal) ?? 0) + 1);
        headsigns.set(key, hs);
    }
    for (const code of codes) {
        const set = linesAtStop.get(code) ?? new Set();
        set.add(line);
        linesAtStop.set(code, set);
    }
}

const nameByCode = new Map(stopsRaw.map((s) => [s.stop_code, s.stop_name]));
const detail = {};
for (const [key, map] of patterns) {
    const [line, dir] = key.split('|');
    const best = [...map.entries()].sort((a, b) => b[1] - a[1] || b[0].split(',').length - a[0].split(',').length)[0][0];
    const stops = best.split(',').map((code) => ({ code, name: nameByCode.get(code) ?? code }));
    const route = routesRaw.find((r) => r.route_short_name === line);
    detail[line] ??= { code: line, name: route?.route_long_name ?? line, directions: {} };
    detail[line].directions[dir] = stops;
    const hs = headsigns.get(key);
    if (hs) {
        detail[line].terminals ??= {};
        detail[line].terminals[dir] = [...hs.entries()].sort((a, b) => b[1] - a[1])[0][0];
    }
}

/* ── Horas de paso programadas ──
 * El GTFS reparte los viajes en servicios (`24-60`…). Cada servicio es un tipo de día: lunes-jueves, viernes, sábado…
 * y los festivos y fechas especiales que solo salen en `calendar_dates.txt`. Se agrupan las horas por servicio y el servidor
 * decide cuál toca hoy. Se descartan los viajes sin destino entre paréntesis (retiradas a cocheras): no llevan viajeros. */
const calendarRows = read('calendar.txt');
const exceptionRows = read('calendar_dates.txt');
const DAY_COLUMNS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const services = {};
for (const c of calendarRows) services[c.service_id] = { days: DAY_COLUMNS.map((d, i) => (c[d] === '1' ? i : -1)).filter((i) => i >= 0), added: [], removed: [] };
for (const e of exceptionRows) {
    const svc = (services[e.service_id] ??= { days: [], added: [], removed: [] });
    (e.exception_type === '1' ? svc.added : svc.removed).push(e.date);
}
const DAYS_ES = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados'];
function serviceLabel(svc) {
    const d = svc.days.join(',');
    if (d === '1,2,3,4') return 'Lunes a jueves';
    if (d === '1,2,3,4,5') return 'Lunes a viernes';
    if (d === '5') return 'Viernes';
    if (d === '6') return 'Sábados';
    if (d === '0') return 'Domingos';
    if (svc.days.length) return svc.days.map((i) => DAYS_ES[i]).join(', ');
    if (svc.added.length >= 4) return 'Festivos';
    return `Día especial (${svc.added.map((x) => `${x.slice(6)}/${x.slice(4, 6)}`).join(', ')})`;
}

const tripMeta = new Map(); // trip_id → { line, dir, service }
for (const trip of tripsRaw) {
    const route = routeById.get(trip.route_id);
    if (route && terminalOf(trip.trip_headsign ?? '')) tripMeta.set(trip.trip_id, { line: route.route_short_name, dir: trip.direction_id, service: trip.service_id });
}
const timesByKey = {};
for (const st of stopTimes) {
    const meta = tripMeta.get(st.trip_id);
    const stop = stopById.get(st.stop_id);
    if (!meta || !stop) continue;
    const [h, m] = st.arrival_time.split(':').map(Number);
    const bucket = ((timesByKey[`${meta.line}|${meta.dir}|${stop.stop_code}`] ??= {})[meta.service] ??= []);
    bucket.push(h * 60 + m);
}
const usedServices = new Set();
for (const bySvc of Object.values(timesByKey)) {
    for (const [svc, list] of Object.entries(bySvc)) {
        usedServices.add(svc);
        bySvc[svc] = [...new Set(list.sort((a, b) => a - b))].join(',');
    }
}
const serviceOut = Object.fromEntries([...usedServices].map((id) => [id, { label: serviceLabel(services[id]), ...services[id] }]));

const special = (code) => /^(E|G|BT)/.test(code);
const lines = [...new Set(routesRaw.map((r) => r.route_short_name))]
    .map((code) => ({ code, name: detail[code]?.name ?? routesRaw.find((r) => r.route_short_name === code)?.route_long_name ?? code, special: special(code), color: colorOf(code) }))
    .sort((a, b) => Number(a.special) - Number(b.special) || a.code.localeCompare(b.code, 'es', { numeric: true }));

const stops = stopsRaw
    .map((s) => ({
        code: s.stop_code,
        name: s.stop_name,
        lat: Number(Number(s.stop_lat).toFixed(6)),
        lon: Number(Number(s.stop_lon).toFixed(6)),
        accessible: s.wheelchair_boarding === '1',
        lines: [...(linesAtStop.get(s.stop_code) ?? [])].sort((a, b) => a.localeCompare(b, 'es', { numeric: true })),
    }))
    .sort((a, b) => a.code.localeCompare(b.code));

await mkdir(out, { recursive: true });
await writeFile(path.join(out, 'stops.json'), JSON.stringify(stops));
await writeFile(path.join(out, 'lines.json'), JSON.stringify(lines));
await writeFile(path.join(out, 'lines-detail.json'), JSON.stringify(detail));
await writeFile(path.join(out, 'times.json'), JSON.stringify({ services: serviceOut, times: timesByKey }));
await writeFile(
    path.join(out, 'meta.json'),
    JSON.stringify({ feedStart: feed.feed_start_date ?? null, feedEnd: feed.feed_end_date ?? null, feedVersion: feed.feed_version ?? null, generatedAt: new Date().toISOString().slice(0, 10) }),
);
console.log(`horas: ${Object.keys(timesByKey).length} combinaciones línea·sentido·parada, servicios: ${Object.values(serviceOut).map((x) => x.label).join(' / ')}`);
console.log(`colores: ${lines.filter((l) => l.color).length}/${lines.length} líneas`);
console.log(`${stops.length} paradas, ${lines.length} líneas (${lines.filter((l) => !l.special).length} regulares), ${Object.keys(detail).length} recorridos → ${path.relative(root, out)}`);
