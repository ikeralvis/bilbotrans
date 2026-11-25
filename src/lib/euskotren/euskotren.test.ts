import assert from 'node:assert/strict';
import test from 'node:test';
import { transit_realtime as rt } from 'gtfs-realtime-bindings';
import { ET_DETAILS, ET_LINES, ET_STATIONS, getEtStation, searchEtStations } from './catalog';
import { departuresFrom, parseTripUpdates } from './realtime';
import { activeServices, scheduledNext, stationTimes } from './times';

test('el catálogo trae las líneas y estaciones esperadas', () => {
    assert.ok(ET_STATIONS.length > 100);
    for (const code of ['E1', 'E3', 'E4', 'L3', 'TR', 'FE']) assert.ok(ET_LINES.some((l) => l.code === code), code);
    const matiko = searchEtStations('matiko')[0];
    assert.ok(matiko.lines.includes('L3') && matiko.lines.includes('E1'));
    assert.deepEqual(ET_DETAILS.L3.terminals, { '0': 'Matiko-Bilbao', '1': 'Kukullaga-Etxebarri' });
});

test('el recorrido de cada línea solo usa estaciones del catálogo', () => {
    for (const d of Object.values(ET_DETAILS)) for (const ids of Object.values(d.directions)) for (const id of ids!) assert.ok(getEtStation(id), `${d.code} ${id}`);
});

/** Feed GTFS-RT mínimo: un viaje de L3 (route 9) Kukullaga → Matiko con tres paradas. */
function feed(times: number[], stations: string[]) {
    return rt.FeedMessage.encode({
        header: { gtfsRealtimeVersion: '2.0', timestamp: times[0] },
        entity: [
            {
                id: '0',
                tripUpdate: {
                    trip: { tripId: 'ES:Euskotren:Journey:1:', routeId: 'ES:Euskotren:Line:9:', directionId: 0 },
                    stopTimeUpdate: stations.map((s, i) => ({ stopId: `ES:Euskotren:Quay:${s}_Plataforma_Q1:`, departure: { time: times[i], delay: i === 0 ? 120 : 0 } })),
                },
            },
        ],
    }).finish();
}

test('parseTripUpdates y departuresFrom: sale de las paradas intermedias, no de la última', () => {
    const cat = ET_DETAILS.L3.directions['0']!;
    const [a, b, c] = [cat[0], cat[1], cat[2]];
    const now = 1_800_000_000;
    const { trips } = parseTripUpdates(feed([now + 120, now + 300, now + 600], [a, b, c]));
    assert.equal(trips.length, 1);
    assert.equal(trips[0].line, 'L3');

    const first = departuresFrom(trips, a, now);
    assert.equal(first.length, 1);
    assert.equal(first[0].minutes, 2);
    assert.equal(first[0].delay, 120);
    assert.equal(first[0].towards, getEtStation(c)!.name);

    assert.equal(departuresFrom(trips, c, now).length, 0, 'en el destino no sale nadie');
    assert.equal(departuresFrom(trips, a, now + 400).length, 0, 'ya salió');
});

test('el horario agrupa los días con las mismas horas y marca hoy', () => {
    const noon = new Date('2026-11-24T11:00:00Z'); // martes
    assert.ok(activeServices('20261124', 2).size > 0);
    const matiko = searchEtStations('matiko')[0];
    const times = stationTimes('L3', matiko.id, noon);
    assert.ok(times.length > 0);
    // Matiko es la cabecera: en un sentido casi no sale nadie, pero en el otro sí hay servicio hoy
    const today = times.flatMap((t) => t.groups).filter((g) => g.today);
    assert.ok(today.length > 0 && today.every((g) => g.label.startsWith('Hoy')));
    assert.ok(times.some((t) => t.groups.length > 1), 'los días con otras horas van en grupos aparte');
    assert.ok(scheduledNext(matiko.id, 5, noon).length > 0);
});
