import axios from 'axios';
import fs from 'fs';
import path from 'path';

const AJAX_URL = 'https://www.bilbao.eus/cs/Satellite?pagename=Bilbaonet%2FComunes%2FPresentacion%2FBBUS_pintarRecorrido_Ajax';
const DATA_PATH = path.join(process.cwd(), 'src/data/bilbobus/data.json');

export interface BilbobusArrival {
    stopId: string;
    lineId: string;
    destination: string;
    etaMinutes: number;
    etaDisplay: string;
}

export interface BilbobusLine {
    id: string;
    name: string;
    stops: string[];
}

export interface BilbobusStop {
    id: string;
    name: string;
    lat: number;
    lon: number;
    lines: string[];
}

interface BilbobusData {
    lines: Record<string, BilbobusLine>;
    stops: Record<string, BilbobusStop>;
}

function getBilbobusData(): BilbobusData {
    try {
        const fileContent = fs.readFileSync(DATA_PATH, 'utf-8');
        return JSON.parse(fileContent);
    } catch (error) {
        console.error('Error reading Bilbobus data:', error);
        return { lines: {}, stops: {} };
    }
}

export async function getBilbobusArrivals(lineId: string): Promise<BilbobusArrival[]> {
    try {
        const params = new URLSearchParams();
        params.append('codLinea', lineId);
        params.append('temporada', '21'); // TODO: Make this dynamic if possible
        params.append('language', 'es');

        const response = await axios.post(AJAX_URL, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            timeout: 5000
        });

        if (!Array.isArray(response.data)) {
            console.warn(`Unexpected Bilbobus response for line ${lineId}:`, response.data);
            return [];
        }

        return response.data.map((item: any) => ({
            stopId: item.codParada,
            lineId: lineId,
            destination: item.nombreParada || 'Destino desconocido',
            etaMinutes: item.tiempo,
            etaDisplay: item.tiempo <= 0 ? 'En parada' : `${item.tiempo} min`
        }));

    } catch (error) {
        console.error(`Failed to fetch Bilbobus arrivals for line ${lineId}:`, error);
        return [];
    }
}

/**
 * Gets arrivals for a specific stop by querying all lines passing through it.
 * This is slightly inefficient but the only way given the API.
 */
export async function getBilbobusArrivalsByStop(stopId: string): Promise<BilbobusArrival[]> {
    const data = getBilbobusData();
    const stop = data.stops[stopId];

    if (!stop) return [];

    const arrivalPromises = stop.lines.map(lineId => getBilbobusArrivals(lineId));
    const nestedArrivals = await Promise.all(arrivalPromises);

    // Flatten and filter for the specific stop
    return nestedArrivals
        .flat()
        .filter(arrival => arrival.stopId === stopId)
        .sort((a, b) => a.etaMinutes - b.etaMinutes);
}

export function getAllBilbobusLines(): BilbobusLine[] {
    const data = getBilbobusData();
    return Object.values(data.lines);
}

export function getBilbobusLineDetails(lineId: string): BilbobusLine | undefined {
    const data = getBilbobusData();
    return data.lines[lineId];
}

export function searchBilbobusStops(query: string): BilbobusStop[] {
    const data = getBilbobusData();
    const q = query.toLowerCase();
    return Object.values(data.stops).filter(s =>
        s.id.includes(q) || s.name.toLowerCase().includes(q)
    ).slice(0, 20);
}

export function getBilbobusStop(stopId: string): BilbobusStop | undefined {
    const data = getBilbobusData();
    return data.stops[stopId];
}
