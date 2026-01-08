import stationsData from '@/data/metro/stations.json';
import { getMetroArrivalsByStop } from './api';

export interface MetroStation {
    code: string;
    name: string;
    lat: number;
    lon: number;
    order: number;
}

export interface MetroLine {
    id: string;
    name: string;
    color: string;
    stations: MetroStation[];
}

export interface TrainPosition {
    lineId: string;
    trainId: string;
    destination: string;
    currentStation?: string;
    nextStation: string;
    progress: number; // 0-1 entre estaciones
    etaMinutes: number;
    lat: number;
    lon: number;
}

/**
 * Interpola la posición entre dos estaciones
 */
function interpolatePosition(
    from: MetroStation,
    to: MetroStation,
    progress: number
): { lat: number; lon: number } {
    const lat = from.lat + (to.lat - from.lat) * progress;
    const lon = from.lon + (to.lon - from.lon) * progress;
    return { lat, lon };
}

/**
 * Encuentra la estación anterior en la ruta
 */
function getPreviousStation(
    line: MetroLine,
    nextStationCode: string
): MetroStation | null {
    const nextIndex = line.stations.findIndex(s => s.code === nextStationCode);
    if (nextIndex <= 0) return null;
    return line.stations[nextIndex - 1];
}

/**
 * Calcula la posición de un tren basándose en su ETA
 */
export function calculateTrainPosition(
    lineId: string,
    nextStationCode: string,
    etaMinutes: number,
    destination: string
): TrainPosition | null {
    const lineData = stationsData[lineId as keyof typeof stationsData];
    if (!lineData) return null;

    const line: MetroLine = lineData as MetroLine;
    const nextStation = line.stations.find(s => s.code === nextStationCode);
    if (!nextStation) return null;

    // Si ETA = 0, el tren está en la estación
    if (etaMinutes === 0) {
        return {
            lineId,
            trainId: `${lineId}-${nextStationCode}-${destination}`,
            destination,
            currentStation: nextStationCode,
            nextStation: nextStationCode,
            progress: 1,
            etaMinutes: 0,
            lat: nextStation.lat,
            lon: nextStation.lon
        };
    }

    // Obtener estación anterior
    const previousStation = getPreviousStation(line, nextStationCode);
    if (!previousStation) {
        // Si no hay estación anterior, el tren está en la primera estación
        return {
            lineId,
            trainId: `${lineId}-${nextStationCode}-${destination}`,
            destination,
            nextStation: nextStationCode,
            progress: 0,
            etaMinutes,
            lat: nextStation.lat,
            lon: nextStation.lon
        };
    }

    // Calcular progreso (asumiendo 3 minutos promedio entre estaciones)
    const averageDuration = 3;
    const progress = Math.max(0, Math.min(1, 1 - (etaMinutes / averageDuration)));

    // Interpolar posición
    const { lat, lon } = interpolatePosition(previousStation, nextStation, progress);

    return {
        lineId,
        trainId: `${lineId}-${nextStationCode}-${destination}`,
        destination,
        currentStation: previousStation.code,
        nextStation: nextStationCode,
        progress,
        etaMinutes,
        lat,
        lon
    };
}

/**
 * Obtiene todas las posiciones de trenes activos
 */
export async function getAllTrainPositions(): Promise<TrainPosition[]> {
    const positions: TrainPosition[] = [];

    // Obtener todas las estaciones
    const allStations: MetroStation[] = [];
    Object.values(stationsData).forEach((line: any) => {
        allStations.push(...line.stations);
    });

    // Para cada estación, obtener llegadas
    const arrivalPromises = allStations.map(async (station) => {
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

    // Calcular posiciones únicas de trenes
    const trainMap = new Map<string, TrainPosition>();

    allArrivals.forEach(arrival => {
        const position = calculateTrainPosition(
            arrival.lineId,
            arrival.station,
            arrival.etaMinutes,
            arrival.destination
        );

        if (position) {
            // Usar combinación de línea + destino + próxima estación como ID único
            const key = `${position.lineId}-${position.destination}-${position.nextStation}`;

            // Solo mantener el tren con menor ETA (más cercano)
            const existing = trainMap.get(key);
            if (!existing || position.etaMinutes < existing.etaMinutes) {
                trainMap.set(key, position);
            }
        }
    });

    return Array.from(trainMap.values());
}

/**
 * Obtiene los datos de las líneas del metro
 */
export function getMetroLines(): MetroLine[] {
    return Object.values(stationsData) as MetroLine[];
}

/**
 * Obtiene una línea específica
 */
export function getMetroLine(lineId: string): MetroLine | null {
    const lineData = stationsData[lineId as keyof typeof stationsData];
    return lineData ? (lineData as MetroLine) : null;
}
