import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countdownParts, secondsUntil, wallToEpoch } from './time';

// 29/10/2026 en invierno (CET, UTC+1): las 12:00 en Bilbao son las 11:00 UTC.
const NOW = Date.UTC(2026, 9, 29, 11, 0, 0);

test('hora de pared de Bilbao a instante real (invierno)', () => {
    assert.equal(wallToEpoch('2026-10-29T12:30:00', NOW), Date.UTC(2026, 9, 29, 11, 30, 0));
});

test('hora de pared de Bilbao a instante real (verano, CEST UTC+2)', () => {
    const summer = Date.UTC(2026, 6, 15, 10, 0, 0);
    assert.equal(wallToEpoch('2026-07-15T12:30:00', summer), Date.UTC(2026, 6, 15, 10, 30, 0));
});

test('segundos hasta el tren', () => {
    assert.equal(secondsUntil('2026-10-29T12:04:32', NOW), 272);
    assert.equal(secondsUntil('2026-10-29T11:59:50', NOW), -10);
});

test('cuenta atrás: minutos, segundos y llegada', () => {
    assert.deepEqual(countdownParts(272), { minutes: 4, seconds: 32, arriving: false });
    assert.deepEqual(countdownParts(8), { minutes: 0, seconds: 8, arriving: true });
    assert.deepEqual(countdownParts(-5), { minutes: 0, seconds: 0, arriving: true });
});
