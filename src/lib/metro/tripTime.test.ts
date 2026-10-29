import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Timetable } from './client';
import { bilbaoClock, defaultWindow, flattenTrips, fromMinutes, parseWindow, scheduleHref, toMinutes, windowIsNow } from './tripTime';

// 29/10/2026 12:03 en Bilbao (CET): 11:03 UTC.
const NOW = Date.UTC(2026, 9, 29, 11, 3, 0);

const dep = (dep: string, arr: string, transferAt: string | null = null) => ({ dep, arr, exact: dep, arrExact: arr, transferAt, transferExact: null, finalExact: null });

test('reloj de Bilbao y franja por defecto', () => {
    assert.deepEqual(bilbaoClock(NOW), { date: '2026-10-29', time: '12:03' });
    assert.deepEqual(defaultWindow(NOW), { date: '2026-10-29', start: '12:00', end: '14:00' });
});

test('la franja por defecto no pasa de medianoche', () => {
    const late = Date.UTC(2026, 9, 29, 22, 40, 0); // 23:40
    assert.equal(defaultWindow(late).end, '23:59');
});

test('minutos ↔ HH:mm', () => {
    assert.equal(toMinutes('10:05'), 605);
    assert.equal(fromMinutes(605), '10:05');
});

test('parseWindow valida y usa hoy si falta la fecha', () => {
    const q = (s: string) => new URLSearchParams(s);
    assert.deepEqual(parseWindow(q('start=10:00&end=16:00&date=2026-10-29')), { start: '10:00', end: '16:00', date: '2026-10-29' });
    assert.equal(parseWindow(q('start=10:00')), null);
    assert.equal(parseWindow(q('start=25:00&end=16:00&date=2026-10-29')), null);
    assert.equal(parseWindow(q('start=10:00&end=16:00&date=29-10-2026')), null);
    assert.ok(parseWindow(q('start=10:00&end=16:00')));
});

test('scheduleHref', () => {
    assert.equal(scheduleHref('ANS', 'PLE', { start: '10:00', end: '16:00', date: '2026-10-29' }), '/metro/route?origin=ANS&dest=PLE&start=10:00&end=16:00&date=2026-10-29');
});

test('flattenTrips une las franjas, ordena y quita duplicados', () => {
    const t: Timetable = {
        transfer: false,
        duration: null,
        legs: [
            { key: '2_4', departures: [dep('10:25', '11:10')] },
            { key: '1_5', departures: [dep('10:00', '10:45'), dep('10:20', '11:05'), dep('10:25', '11:10')] },
        ],
    };
    const rows = flattenTrips(t);
    assert.deepEqual(rows.map((r) => r.dep), ['10:00', '10:20', '10:25']);
    assert.equal(rows[0].minutes, 45);
    assert.equal(rows[0].transfer, false);
});

test('con cambio y pasando de medianoche', () => {
    const t: Timetable = { transfer: true, duration: null, legs: [{ key: '1', departures: [dep('23:50', '00:30', '00:05')] }] };
    const [r] = flattenTrips(t);
    assert.equal(r.minutes, 40);
    assert.equal(r.transfer, true);
});

test('windowIsNow', () => {
    assert.equal(windowIsNow({ date: '2026-10-29', start: '10:00', end: '14:00' }, NOW), true);
    assert.equal(windowIsNow({ date: '2026-10-29', start: '13:00', end: '14:00' }, NOW), false);
    assert.equal(windowIsNow({ date: '2026-10-30', start: '10:00', end: '14:00' }, NOW), false);
});
