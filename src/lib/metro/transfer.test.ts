import { test } from 'node:test';
import assert from 'node:assert/strict';
import { waitMinutes } from './transfer';

test('PLE→BSR: llega a San Ignazio 13:53:52 y sale 13:57:12 → 3 min de espera', () => {
    assert.equal(waitMinutes('13:53:52', '13:57:12'), 3);
});

test('ANS→PLE: llega 13:10:32 y toma el tren de las 13:20:43 → 10 min', () => {
    assert.equal(waitMinutes('13:10:32', '13:20:43'), 10);
});

test('salida anterior a la llegada no es una espera válida', () => {
    assert.equal(waitMinutes('13:10:32', '13:05:00'), null);
});
