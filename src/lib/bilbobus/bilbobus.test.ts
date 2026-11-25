import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { BB_DETAILS, BB_LINES, BB_STOPS, getBbStop, lineColor, nearestBbStops, searchBbLines, searchBbStops, towardsFor } from './catalog';
import { _resetWaitingCache, fetchLineWaiting, fetchStopWaiting, parseWaiting } from './waiting';

/* ───────── Respuesta del AJAX ───────── */

test('parseWaiting: minutos, 0 = llegando, 9999 = sin información', () => {
    const out = parseWaiting([
        { codParada: '1101', tiempo: 0 },
        { codParada: '1102', tiempo: 11 },
        { codParada: '1103', tiempo: 9999 },
        { codParada: 1104, tiempo: '7' },
        { codParada: '1105', tiempo: -1 },
    ]);
    assert.deepEqual(out, { '1101': 0, '1102': 11, '1103': null, '1104': 7, '1105': 0 });
});

test('parseWaiting ignora lo que no es una lista válida', () => {
    assert.deepEqual(parseWaiting([]), {});
    assert.deepEqual(parseWaiting({ error: true }), {});
    assert.deepEqual(parseWaiting([{ codParada: '1' }, { tiempo: 3 }, { codParada: '2', tiempo: 'x' }, null]), {});
});

/* ───────── Catálogo (GTFS de Bilbobus, 29/10/2026) ───────── */

test('catálogo: 530 paradas y 56 líneas, 37 regulares', () => {
    assert.equal(BB_STOPS.length, 530);
    assert.equal(BB_LINES.length, 56);
    assert.equal(BB_LINES.filter((l) => !l.special).length, 37);
});

test('la parada 1101 conserva sus líneas y el sentido de cada una', () => {
    const stop = getBbStop('1101');
    assert.deepEqual(stop?.lines, ['10', '13', '18', '71']);
    // El destino es el rótulo del bus (PLAZA BIRIBILA), no la última parada del recorrido (GRAN VÍA 2).
    assert.equal(towardsFor('10', '1101'), 'PLAZA BIRIBILA');
});

test('buscar paradas por nombre y por código', () => {
    assert.ok(searchBbStops('lehendakari aguirre').every((s) => s.name.toLowerCase().includes('lehendakari aguirre')));
    assert.deepEqual(searchBbStops('1101').map((s) => s.code), ['1101']);
    assert.deepEqual(searchBbStops('   '), []);
});

test('buscar líneas por número y por barrio', () => {
    assert.equal(searchBbLines('a1')[0]?.code, 'A1');
    assert.ok(searchBbLines('otxarkoaga').length >= 2);
});

test('paradas cercanas ordenadas por distancia', () => {
    const s = getBbStop('1101')!;
    const near = nearestBbStops(s.lat, s.lon, 3, 400);
    assert.equal(near[0].code, '1101');
    assert.ok(near.every((x, i) => i === 0 || x.meters >= near[i - 1].meters));
});

/* ───────── Cliente con `fetch` simulado ───────── */

const realFetch = globalThis.fetch;
let calls: string[] = [];

function stub(handler: (line: string) => string | Error) {
    calls = [];
    globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
        const body = new URLSearchParams(String(init?.body));
        const line = body.get('codLinea') ?? '';
        calls.push(line);
        const out = handler(line);
        if (out instanceof Error) throw out;
        return new Response(out, { status: 200 });
    }) as typeof fetch;
}

beforeEach(() => _resetWaitingCache());
afterEach(() => {
    globalThis.fetch = realFetch;
});

test('una parada junta los tiempos de todas sus líneas, ordenados', async () => {
    stub((line) => JSON.stringify([{ codParada: '1101', tiempo: { '10': 5, '13': 2, '18': 9999, '71': 3 }[line] }]));
    const r = await fetchStopWaiting('1101');
    assert.deepEqual(r.arrivals.map((a) => [a.line, a.minutes]), [['13', 2], ['71', 3], ['10', 5], ['18', null]]);
    assert.deepEqual(r.unavailable, []);
    assert.equal(r.name, 'LEHENDAKARI AGUIRRE 149');
});

test('una línea que falla no tumba la parada y se marca como no disponible', async () => {
    stub((line) => (line === '13' ? new Error('timeout') : JSON.stringify([{ codParada: '1101', tiempo: 4 }])));
    const r = await fetchStopWaiting('1101');
    assert.deepEqual(r.unavailable, ['13']);
    assert.equal(r.arrivals.length, 3);
});

test('una línea sin servicio (respuesta vacía) va a "inactive", no a error', async () => {
    stub((line) => (line === '71' ? '[]' : JSON.stringify([{ codParada: '1101', tiempo: 4 }])));
    const r = await fetchStopWaiting('1101');
    assert.deepEqual(r.inactive, ['71']);
});

test('si todas las líneas fallan, la parada falla', async () => {
    stub(() => new Error('caído'));
    await assert.rejects(fetchStopWaiting('1101'));
});

test('la página "Request Rejected" del cortafuegos es un error, no "sin datos" (y no se reintenta)', async () => {
    stub(() => '<html><head><title>Request Rejected</title></head>');
    await assert.rejects(fetchLineWaiting('10'), /respuesta inesperada/);
});

test('caché: dos consultas seguidas hacen una sola petición, y `fresh` la salta', async () => {
    stub(() => '[{"codParada":"1101","tiempo":1}]');
    await fetchLineWaiting('10');
    await fetchLineWaiting('10');
    assert.equal(calls.length, 1);
    await fetchLineWaiting('10', true);
    assert.equal(calls.length, 2);
});

test('peticiones simultáneas de la misma línea comparten una sola llamada', async () => {
    stub(() => '[{"codParada":"1101","tiempo":1}]');
    await Promise.all([fetchLineWaiting('10'), fetchLineWaiting('10'), fetchLineWaiting('10')]);
    assert.equal(calls.length, 1);
});

test('no se manda User-Agent propio (el cortafuegos lo rechaza)', async () => {
    let headers: HeadersInit | undefined;
    globalThis.fetch = (async (_u: unknown, init?: RequestInit) => {
        headers = init?.headers;
        return new Response('[]', { status: 200 });
    }) as typeof fetch;
    await fetchLineWaiting('10', true);
    assert.deepEqual(Object.keys(headers as Record<string, string>).map((k) => k.toLowerCase()), ['content-type']);
});

test('un fallo suelto se reintenta una vez', async () => {
    let n = 0;
    globalThis.fetch = (async () => {
        n++;
        if (n === 1) throw new Error('timeout');
        return new Response('[{"codParada":"1101","tiempo":4}]', { status: 200 });
    }) as typeof fetch;
    const r = await fetchLineWaiting('10', true);
    assert.equal(n, 2);
    assert.equal(r.minutes['1101'], 4);
});

test('si el servicio cae, se sirve el último dato bueno reciente (con su hora original)', async () => {
    stub(() => '[{"codParada":"1101","tiempo":6}]');
    const good = await fetchLineWaiting('10', true);
    stub(() => new Error('caído'));
    const again = await fetchLineWaiting('10', true);
    assert.equal(again.fetchedAt, good.fetchedAt);
    assert.equal(again.minutes['1101'], 6);
});

test('sin ningún dato previo, el fallo sí se propaga', async () => {
    stub(() => new Error('caído'));
    await assert.rejects(fetchLineWaiting('13', true));
});

test('"¿Qué bus cojo?": la línea 10 va de Lehendakari Aguirre 161 a 149, en ese orden', async () => {
    const { findBbDirect } = await import('./connect');
    const lines = findBbDirect('1103', '1101').map((c) => c.line);
    assert.ok(lines.includes('10'));
    assert.ok(findBbDirect('1103', '1101').every((c) => c.stops >= 1));
});

test('destino de la línea 56: "Jesusen Bihotza", no una parada intermedia', () => {
    assert.equal(towardsFor('56', BB_DETAILS['56'].directions['0']![3].code), 'JESUSEN BIHOTZA');
    assert.equal(towardsFor('56', BB_DETAILS['56'].directions['1']![3].code), 'LA PEÑA');
});

test('colores oficiales de línea: la 56 es morada y las que no tienen color devuelven null', () => {
    assert.equal(lineColor('56'), '#3F2794');
    assert.equal(lineColor('A1'), '#B9D867');
    assert.equal(lineColor('E56'), '#3F2794'); // el refuerzo usa el color de su línea
    assert.equal(lineColor('A9'), null);
    assert.equal(lineColor('ZZ'), null);
});

test('al buscar un trayecto el destino es el de la línea', async () => {
    const { findBbDirect } = await import('./connect');
    const c = findBbDirect('1103', '1101').find((x) => x.line === '10');
    assert.equal(c?.towards, 'PLAZA BIRIBILA');
});

/* ───────── Horas de paso programadas (GTFS) ───────── */

test('horas de paso: la línea 56 en Zamacola 168 coincide con la web oficial (lunes a jueves)', async () => {
    const { passTimes } = await import('./times');
    const [ida] = passTimes('56', '5518', new Date('2026-10-29T10:00:00+01:00')); // jueves
    assert.equal(ida.direction, '0');
    assert.equal(ida.towards, 'JESUSEN BIHOTZA');
    assert.equal(ida.groups[0].label, 'Lunes a jueves');
    assert.equal(ida.groups[0].today, true);
    assert.deepEqual(ida.groups[0].times.slice(0, 8), ['05:15', '05:40', '06:10', '06:30', '06:45', '06:55', '07:05', '07:14']);
    assert.equal(ida.groups[0].times.length, 98);
});

test('qué tipo de día toca: jueves normal, festivo entre semana, Nochebuena y domingo', async () => {
    const { activeServices } = await import('./times');
    assert.deepEqual(activeServices('20261029', 4), ['24-60']);
    assert.ok(!activeServices('20261012', 1).includes('24-60'), 'el 12 de octubre no es un lunes normal');
    assert.ok(activeServices('20261012', 1).includes('24-64'));
    assert.ok(activeServices('20261224', 4).includes('24-132'));
    assert.deepEqual(activeServices('20261101', 0), ['24-362']);
});

test('próxima salida de hoy y orden de los grupos (hoy primero)', async () => {
    const { passTimes } = await import('./times');
    const [ida] = passTimes('56', '5518', new Date('2026-10-31T10:03:00+01:00')); // sábado
    assert.equal(ida.groups[0].label, 'Sábados');
    assert.equal(ida.next, '10:15');
    assert.deepEqual(ida.groups.map((g) => g.today), [true, ...ida.groups.slice(1).map(() => false)]);
});

test('una línea que no pasa por la parada no devuelve nada', async () => {
    const { passTimes } = await import('./times');
    assert.deepEqual(passTimes('10', '5518'), []);
});
