import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupByDirection, lineOfDestination, neighborsBySide, sideOf, sidesServed, type RawTrain } from './direction';

const t = (Destination: string, Direction: string | number, line: string, Minutes = 3): RawTrain => ({
    Destination,
    Direction,
    line,
    Minutes,
    Length: 4,
    Time: '2026-10-16T14:20:00',
});

test('Abando real: no mezcla Basauri/Etxebarri con Kabiezes/Plentzia', () => {
    const platforms = [
        [t('Basauri', 'Etxebarri/Basauri', 'L2', 0), t('Etxebarri', 2, 'L1', 4)],
        [t('Kabiezes', 'Kabiezes/Plentzia', 'L2', 0), t('Ibarbengoa', 1, 'L1', 2)],
    ];
    const [inland, coast] = groupByDirection(platforms, 'ABA');
    assert.deepEqual(inland.trains.map((x) => x.destination), ['Basauri', 'Etxebarri']);
    assert.deepEqual(coast.trains.map((x) => x.destination), ['Kabiezes', 'Ibarbengoa']);
});

test('Plentzia (terminal): el índice 1 trae el sentido interior', () => {
    const platforms = [[], [t('Etxebarri', 'Etxebarri/Basauri', 'L1', 16), t('Etxebarri', 2, 'L1', 36)]];
    const [inland, coast] = groupByDirection(platforms, 'PLE');
    assert.equal(inland.trains.length, 2);
    assert.equal(coast.trains.length, 0);
});

test('Sin Direction fiable: usa el orden del destino en la línea', () => {
    assert.equal(sideOf(t('Plentzia', '', 'L1'), 'ABA'), 'coast');
    assert.equal(sideOf(t('Etxebarri', '', 'L1'), 'ABA'), 'inland');
    assert.equal(sideOf(t('Kabieces', '', 'L2'), 'ANS'), 'coast');
    assert.equal(sideOf(t('Basauri', '', 'L2'), 'ANS'), 'inland');
});

test('sidesServed en terminales', () => {
    assert.deepEqual(sidesServed('PLE'), ['inland']);
    assert.deepEqual(sidesServed('BSR'), ['coast']);
    assert.deepEqual(sidesServed('ABA').sort(), ['coast', 'inland']);
});

test('vecinas de referencia: Abando tiene una por sentido (todos los trenes paran en ella)', () => {
    const n = neighborsBySide('ABA');
    assert.deepEqual(n.inland.map((x) => x.code), ['CAV']);
    assert.deepEqual(n.coast.map((x) => x.code), ['MOY']);
    assert.deepEqual(n.coast[0].lines.sort(), ['L1', 'L2']);
});

test('vecinas en una bifurcación: San Ignazio hacia la costa son dos (L1 a Lutxana, L2 a Gurutzeta)', () => {
    const coast = neighborsBySide('SIN').coast.map((x) => `${x.code}:${x.lines.join('')}`).sort();
    assert.deepEqual(coast, ['GUR:L2', 'LUT:L1']);
});

test('terminales: Plentzia solo tiene sentido interior', () => {
    const n = neighborsBySide('PLE');
    assert.equal(n.coast.length, 0);
    assert.equal(n.inland.length, 1);
});

test('línea de un tren por su destino', () => {
    assert.equal(lineOfDestination('Basauri', ['L1', 'L2']), 'L2');
    assert.equal(lineOfDestination('Kabiezes', ['L1', 'L2']), 'L2');
    assert.equal(lineOfDestination('Etxebarri', ['L1', 'L2']), 'L1');
    assert.equal(lineOfDestination('Larrabasterra', ['L1', 'L2']), 'L1');
    assert.equal(lineOfDestination('Lo que sea', ['L2']), 'L2');
});
