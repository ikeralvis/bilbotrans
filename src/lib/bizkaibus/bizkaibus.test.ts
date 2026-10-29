import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getStop, normalize, searchLines, searchStops } from './catalog';
import { findDirect } from './connect';
import { parseLooseJson } from './tq';

test('JSONP con comillas simples y XML dentro (respuesta real de la API de llegadas)', () => {
    const raw = `({'STATUS': 'OK','Resultado': '<GetPasoParadaResult><PasoParada><e1><minutos>11</minutos></e1><linea>A3527</linea><ruta>MUNGIA</ruta></PasoParada></GetPasoParadaResult>','Info': ''});`;
    const json = parseLooseJson<{ STATUS: string; Resultado: string }>(raw);
    assert.equal(json.STATUS, 'OK');
    assert.match(json.Resultado, /<linea>A3527<\/linea>/);
});

test('JSONP con comillas dobles dentro del texto no se rompe', () => {
    const json = parseLooseJson<{ a: string }>(`x({'a': 'dice "hola"'})`);
    assert.equal(json.a, 'dice "hola"');
});

test('normalize: sin tildes ni signos', () => {
    assert.equal(normalize('  Gurutzeta/Cruces – Pío X '), 'gurutzeta cruces pio x');
});

test('buscar paradas por nombre, por código y por municipio', () => {
    assert.ok(searchStops('moyua').some((s) => s.code === '4255'));
    assert.deepEqual(searchStops('4255').map((s) => s.code), ['4255']);
    assert.ok(searchStops('goietako mungia').every((s) => s.municipality.toLowerCase().includes('mungia')));
    assert.deepEqual(searchStops(''), []);
});

test('buscar líneas por número y por municipio', () => {
    assert.equal(searchLines('a3527')[0]?.code, 'A3527');
    assert.ok(searchLines('balmaseda').length > 0);
});

test('Moyúa → Goietako plaza: líneas directas, ida y en orden', () => {
    const lines = findDirect('4255', '3435').map((c) => c.line);
    assert.ok(lines.includes('A3527') && lines.includes('A3516'));
    assert.ok(findDirect('4255', '3435').every((c) => c.stops >= 1));
});

test('el sentido importa: la vuelta Goietako → Moyúa no usa los mismos tramos de ida', () => {
    const back = findDirect('3435', '4255');
    for (const c of back) assert.notEqual(c.from.code, c.to.code);
});

test('el catálogo incluye las líneas de cada parada', () => {
    assert.ok(getStop('4255')?.lines.includes('A3527'));
});
