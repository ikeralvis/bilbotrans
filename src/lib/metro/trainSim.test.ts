import test from 'node:test';
import assert from 'node:assert/strict';
import { activeServices, bilbaoClock, cumulative, isFeedValid, locateOnPattern, pointAt, simulateTrains, type Gtfs } from './trainSim';
import real from '../../data/metro/gtfs.json';

// Línea recta de 0 a 0.01° de longitud (~812 m a lat 43.26)
const line: Array<[number, number]> = [[43.26, -2.93], [43.26, -2.925], [43.26, -2.92]];

const mini: Gtfs = {
    generatedAt: '', validFrom: '20261016', validTo: '20261116',
    stops: { A: [43.26, -2.93, 'A'], B: [43.26, -2.92, 'B'] },
    shapes: { S: line },
    services: [
        { id: 'lab', days: [0, 1, 1, 1, 1, 0, 0], start: '20261016', end: '20261116' },
        { id: 'extra', days: [0, 0, 0, 0, 0, 0, 0], start: '00000000', end: '00000000' },
    ],
    exceptions: [[0, '20261022', 2], [1, '20261022', 1]],
    patterns: [{ shape: 'S', headsign: 'B', dir: 0, stops: ['A', 'B'], t: [0, 30, 130, 150], d: [0, 800] }],
    trips: [[0, 0, 8 * 3600], [0, 1, 9 * 3600], [0, 0, 24 * 3600 - 60]],
};
const ctx = { gtfs: mini, linesByStop: () => ['L1'] };

test('bilbaoClock usa Europe/Madrid (horario de invierno UTC+1)', () => {
    const c = bilbaoClock(new Date('2026-11-02T10:30:15Z'));
    assert.deepEqual(c, { date: '20261102', weekday: 1, secs: 11 * 3600 + 30 * 60 + 15 });
});

test('bilbaoClock en horario de verano cruza la medianoche', () => {
    assert.equal(bilbaoClock(new Date('2026-07-01T22:30:00Z')).date, '20260702');
});

test('activeServices respeta días de la semana y excepciones', () => {
    assert.deepEqual([...activeServices(mini, '20261019')], [0]); // lunes
    assert.deepEqual([...activeServices(mini, '20261017')], []); // sábado
    assert.deepEqual([...activeServices(mini, '20261022')], [1]); // excepción: quita 0, añade 1
    assert.deepEqual([...activeServices(mini, '20261201')], []); // fuera de rango
});

test('isFeedValid detecta feed caducado', () => {
    assert.equal(isFeedValid(mini, '20261120'), false);
    assert.equal(isFeedValid(mini, '20261101'), true);
});

test('locateOnPattern: fuera de rango, en parada y entre paradas', () => {
    const p = mini.patterns[0];
    assert.equal(locateOnPattern(p, -1), null);
    assert.equal(locateOnPattern(p, 151), null);
    assert.equal(locateOnPattern(p, 10)?.state, 'dwelling');
    const mid = locateOnPattern(p, 80)!; // mitad de [30,130]
    assert.equal(mid.state, 'running');
    assert.equal(mid.meters, 400);
    assert.equal(mid.etaSec, 50);
    assert.equal(locateOnPattern(p, 150)?.state, 'dwelling');
});

test('pointAt interpola sobre el shape', () => {
    const cum = cumulative(line);
    const total = cum[2];
    const p = pointAt(line, cum, total / 2);
    assert.ok(Math.abs(p[1] - -2.925) < 1e-6);
    assert.deepEqual(pointAt(line, cum, -5), line[0]);
    assert.deepEqual(pointAt(line, cum, total + 100), line[2]);
});

test('simulateTrains: lunes 08:01:20 hay un tren a mitad de camino', () => {
    // 08:01:20 hora local = 07:01:20Z (UTC+1)
    const t = simulateTrains(ctx, new Date('2026-11-02T07:01:20Z'));
    assert.equal(t.length, 1);
    assert.equal(t[0].state, 'running');
    assert.equal(t[0].prevStop, 'A');
    assert.equal(t[0].nextStop, 'B');
    assert.ok(t[0].pos[1] > -2.93 && t[0].pos[1] < -2.92);
});

test('simulateTrains: ningún tren en sábado ni con feed caducado', () => {
    assert.equal(simulateTrains(ctx, new Date('2026-11-07T07:01:20Z')).length, 0);
    assert.equal(simulateTrains(ctx, new Date('2027-01-05T07:01:20Z')).length, 0);
});

test('simulateTrains: viaje 23:59 del día anterior sigue activo pasada la medianoche', () => {
    // domingo→lunes 00:00:30 local (23:00:30Z domingo). El servicio del domingo no está activo; probamos lunes→martes:
    const t = simulateTrains(ctx, new Date('2026-11-02T23:00:30Z')); // martes 00:00:30 local
    assert.equal(t.length, 1);
    assert.equal(t[0].state, 'running');
    assert.ok(t[0].id.startsWith('20261102-'));
});

test('GTFS real: hay trenes en hora punta y todos caen cerca de su shape', () => {
    const gtfs = real as unknown as Gtfs;
    const trains = simulateTrains({ gtfs, linesByStop: () => ['L1'] }, new Date('2026-10-20T07:00:00Z'));
    assert.ok(trains.length > 15, `solo ${trains.length}`);
    for (const t of trains) {
        assert.ok(t.pos[0] > 43.1 && t.pos[0] < 43.5 && t.pos[1] > -3.2 && t.pos[1] < -2.8);
    }
    // de madrugada (03:00) no hay servicio
    assert.equal(simulateTrains({ gtfs, linesByStop: () => ['L1'] }, new Date('2026-10-20T01:00:00Z')).length, 0);
});
