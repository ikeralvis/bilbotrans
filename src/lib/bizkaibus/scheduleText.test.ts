import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isToday, parseSchedule } from './scheduleText';

test('A3527 (texto real): origen, tres tipos de día, rangos con frecuencia y notas', () => {
    const p = parseSchedule(
        'SALIDAS DE BILBAO:\n\nLaborables: Primera salida 06:15 hasta Mungia.\nDe 06:45 a 21:45 cada 30 minutos.\nHoras de paso por Mungia a :05 y :35.\n\nSábados: De 06:45 a 21:45 cada hora\nHoras de paso por Mungia a :05.\n\nFestivos: De 09:00 a 21:00 cada dos horas\n\n(*) Solo se parará en Ametzaga cuando alguien lo pida.',
    );
    assert.equal(p.origin, 'BILBAO');
    assert.deepEqual(p.groups.map((g) => g.label), ['Laborables', 'Sábados', 'Festivos']);
    assert.deepEqual(p.groups[0].lines[1], { kind: 'ranges', ranges: [{ from: '06:45', to: '21:45', every: 'cada 30 min' }] });
    assert.deepEqual(p.groups[1].lines[0], { kind: 'ranges', ranges: [{ from: '06:45', to: '21:45', every: 'cada hora' }] });
    assert.equal(p.notes.length, 1);
    assert.match(p.notes[0], /Ametzaga/);
});

test('lista de horas sueltas', () => {
    const p = parseSchedule('SALIDAS DE LANESTOSA:\n\nSábados y festivos: 10:15 18:15\nTodo servicio circula por San Miguel de Artzentales y Turtzioz.');
    assert.deepEqual(p.groups[0].lines[0], { kind: 'times', times: ['10:15', '18:15'] });
    assert.deepEqual(p.groups[0].lines[1], { kind: 'text', text: 'Todo servicio circula por San Miguel de Artzentales y Turtzioz.' });
});

test('varios rangos en una línea, cada uno con su frecuencia', () => {
    const p = parseSchedule('SALIDAS DE BILBAO:\n\nDe 10:00 a 13:30 cada media hora y de 17:00 a 22:30 cada media hora.');
    assert.deepEqual(p.groups[0].lines[0], {
        kind: 'ranges',
        ranges: [
            { from: '10:00', to: '13:30', every: 'cada media hora' },
            { from: '17:00', to: '22:30', every: 'cada media hora' },
        ],
    });
});

test('horas sueltas y un rango en la misma línea, con horas de un solo dígito', () => {
    const p = parseSchedule('SALIDAS DE BALMASEDA:\n\nSábados: 6:35, 7:35, 8:35. De 9:35 a 21:35 cada 30 minutos');
    assert.deepEqual(p.groups[0].lines, [
        { kind: 'times', times: ['06:35', '07:35', '08:35'] },
        { kind: 'ranges', ranges: [{ from: '09:35', to: '21:35', every: 'cada 30 min' }] },
    ]);
});

test('horario sin tipo de día: un grupo sin etiqueta', () => {
    const p = parseSchedule('SALIDAS DE GETXO:\n\n06:30 07:00 07:25* 08:00\n* Salidas desde Azkorri.');
    assert.equal(p.groups[0].label, '');
    assert.deepEqual(p.groups[0].lines[0], { kind: 'times', times: ['06:30', '07:00', '07:25*', '08:00'] });
});

test('sin servicio no inventa grupos', () => {
    const p = parseSchedule('NO HAY SERVICIO');
    assert.deepEqual(p.groups, []);
    assert.deepEqual(p.notes, ['No hay servicio']);
});

test('"Salidas desde X: …" con contenido es un grupo, no una cabecera', () => {
    const p = parseSchedule('Salidas desde el Hospital de Galdakao: De 06:00 a 22:00 cada hora');
    assert.equal(p.origin, null);
    assert.equal(p.groups[0].label, 'Salidas desde el Hospital de Galdakao');
});

test('qué tipo de día es hoy (martes, sábado, domingo)', () => {
    const tue = new Date('2026-10-27T10:00:00+01:00');
    const sat = new Date('2026-10-31T10:00:00+01:00');
    const sun = new Date('2026-11-01T10:00:00+01:00');
    assert.equal(isToday('Laborables', tue), true);
    assert.equal(isToday('Festivos', tue), false);
    assert.equal(isToday('Sábados', sat), true);
    assert.equal(isToday('Laborables y sábados', sat), true);
    assert.equal(isToday('Sábados y festivos', sun), true);
    assert.equal(isToday('Laborables', sun), false);
    assert.equal(isToday('Diario', sun), true);
});
