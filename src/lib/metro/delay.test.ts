import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchDelays } from './delay';

const SCHEDULE = ['12:07:47', '12:14:27', '12:21:07', '12:27:47', '12:34:27'];

test('ABA→ANS real (29/10/2026): diferencias de segundos cuentan como en hora', () => {
    const r = matchDelays(['2026-10-29T12:20:57', '2026-10-29T12:27:38', '2026-10-29T12:34:03'], SCHEDULE);
    assert.deepEqual(r.map((x) => x?.state), ['on-time', 'on-time', 'on-time']);
    assert.equal(r[0]?.seconds, -10);
    assert.equal(r[0]?.scheduled, '12:21');
});

test('retraso de 3 min', () => {
    const [d] = matchDelays(['2026-10-29T12:24:10'], SCHEDULE);
    assert.equal(d?.state, 'late');
    assert.equal(d?.minutes, 3);
    assert.equal(d?.scheduled, '12:21');
});

test('adelanto de más de un minuto', () => {
    const [d] = matchDelays(['2026-10-29T12:26:00'], SCHEDULE);
    assert.equal(d?.state, 'early');
    assert.equal(d?.minutes, 2);
});

test('una salida programada no se asigna a dos trenes', () => {
    const r = matchDelays(['2026-10-29T12:21:00', '2026-10-29T12:21:30'], ['12:21:07', '12:27:47']);
    assert.equal(r[0]?.scheduled, '12:21');
    assert.equal(r[1]?.scheduled, '12:27');
});

test('sin salida programada cercana: null', () => {
    const [d] = matchDelays(['2026-10-29T15:00:00'], SCHEDULE);
    assert.equal(d, null);
    assert.deepEqual(matchDelays(['2026-10-29T12:21:00'], []), [null]);
});
