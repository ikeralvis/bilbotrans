import { NextResponse } from 'next/server';
import { getMetroArrivalsByStop } from '@/lib/metro/api';
import platformsData from '@/data/metro/platforms.json';
import stationsData from '@/data/metro/stations.json';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface TrainInfo {
    lineId: string;
    trainId: string;
    destination: string;
    currentStation: string;
    nextStation: string;
    etaMinutes: number;
    platform: string;
}

/**
 * Endpoint optimizado que devuelve TODOS los trenes activos
 * con UNA SOLA llamada desde el cliente
 */
export async function GET() {
    try {
        const trains: TrainInfo[] = [];
        const trainMap = new Map<string, TrainInfo>();

        // Obtener llegadas de todas las estaciones en paralelo
        const arrivalPromises = platformsData.map(async (station) => {
            try {
                const arrivals = await getMetroArrivalsByStop(station.code);
                return arrivals.map(arrival => ({
                    station: station.code,
                    ...arrival
                }));
            } catch (error) {
                console.error(`Error fetching arrivals for ${station.code}:`, error);
                return [];
            }
        });

        const allArrivals = (await Promise.all(arrivalPromises)).flat();

        // Procesar llegadas y crear mapa de trenes únicos
        allArrivals.forEach(arrival => {
            // Solo incluir trenes que están en movimiento o a punto de llegar (ETA <= 10 min)
            if (arrival.etaMinutes > 10) return;

            const line = (stationsData as any)[arrival.lineId];
            if (!line) return;

            // Encontrar la dirección y la estación anterior
            const stationList = line.stations;
            const stationIndex = stationList.findIndex((s: any) => s.code === arrival.station);
            if (stationIndex === -1) return;

            // Determinar si el tren va hacia adelante o hacia atrás en la lista de estaciones
            // L1: 0 (Etxebarri) -> 28 (Plentzia)
            // L1 Destination Plentzia: index increases
            // L1 Destination Etxebarri: index decreases

            // Simplificación: si el destino está después en la lista, el orden es ascendente
            const destIndex = stationList.findIndex((s: any) => s.name.includes(arrival.destination) || arrival.destination.includes(s.name));

            let previousStation = arrival.station;
            if (destIndex !== -1) {
                if (destIndex > stationIndex && stationIndex > 0) {
                    previousStation = stationList[stationIndex - 1].code;
                } else if (destIndex < stationIndex && stationIndex < stationList.length - 1) {
                    previousStation = stationList[stationIndex + 1].code;
                }
            }

            // Crear ID único para el tren
            const trainId = `${arrival.lineId}-${arrival.destination}-${arrival.platform || 1}`;

            // Si ya existe este tren, solo mantener el que tiene menor ETA
            const existing = trainMap.get(trainId);
            if (!existing || arrival.etaMinutes < existing.etaMinutes) {
                trainMap.set(trainId, {
                    lineId: arrival.lineId,
                    trainId,
                    destination: arrival.destination,
                    currentStation: previousStation,
                    nextStation: arrival.station,
                    etaMinutes: Number(arrival.etaMinutes),
                    platform: arrival.platform || '1'
                });
            }
        });

        const activeTrains = Array.from(trainMap.values());

        return NextResponse.json({
            trains: activeTrains,
            count: activeTrains.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error fetching train positions:', error);
        return NextResponse.json(
            { error: 'Failed to fetch train positions', details: String(error) },
            { status: 500 }
        );
    }
}
