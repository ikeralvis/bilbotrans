/**
 * Bizkaibus API Service
 * Endpoint: https://apli.bizkaia.net/APPS/DANOK/TQWS/TQ.ASMX/GetPasoParadaMobile_JSON
 */

import bizkaibusStopsData from '@/data/bizkaibus/stops.json';

interface BizkaibusStopRaw {
    PROVINCIA: string;
    DESCRIPCION_PROVINCIA: string;
    MUNICIPIO: string;
    DESCRIPCION_MUNICIPIO: string;
    PARADA: string;
    DENOMINACION: string;
    DIRECCION?: string;
    LATITUD: string;
    LONGITUD: string;
}

export interface BizkaibusArrival {
    lineId: string;
    route: string;
    destination: string;
    etaMinutes: number;
    etaDisplay: string;
    nextEtaMinutes?: number;
    nextEtaDisplay?: string;
}

export interface BizkaibusStop {
    id: string;
    name: string;
    municipality: string;
    lat: number;
    lon: number;
}

export interface BizkaibusResponse {
    status: 'OK' | 'NOINFO' | 'ERROR';
    stop?: BizkaibusStop;
    arrivals: BizkaibusArrival[];
    error?: string;
}

/**
 * Convert string to Title Case
 */
function toTitleCase(str: string): string {
    if (!str) return '';
    if (str.toUpperCase() === 'UPV/EHU' || str.toUpperCase() === 'EHU/UPV') {
        return str.toUpperCase();
    }
    return str
        .toLowerCase()
        .split(/[\s\-.]+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Calculate arrival time from minutes
 */
function calculateArrivalTime(minutes: number): string {
    const now = new Date();
    const arrivalTime = new Date(now.getTime() + minutes * 60000);
    return arrivalTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Fetch real-time arrivals for a Bizkaibus stop
 * @param stopId - The stop ID (PARADA code)
 */
export async function getBizkaibusArrivals(stopId: string): Promise<BizkaibusResponse> {
    try {
        const url = `https://apli.bizkaia.net/APPS/DANOK/TQWS/TQ.ASMX/GetPasoParadaMobile_JSON?callback=%22%22&strLinea=&strParada=${stopId}`;

        console.log(`[Bizkaibus API] Fetching stop: ${stopId}`);

        const response = await fetch(url, { method: 'GET' });
        const text = await response.text();

        // Clean the JSONP response
        let cleanedText = text.replace('""(', '').replace(');', '').replace(/'/g, '"');
        const jsonData = JSON.parse(cleanedText);

        if (jsonData.STATUS === 'NOINFO') {
            console.log(`[Bizkaibus API] No info for stop ${stopId}`);
            return {
                status: 'NOINFO',
                arrivals: []
            };
        }

        if (jsonData.STATUS !== 'OK') {
            console.error(`[Bizkaibus API] Error status: ${jsonData.STATUS}`);
            return {
                status: 'ERROR',
                arrivals: [],
                error: 'API returned error status'
            };
        }

        // Parse XML response
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(jsonData.Resultado, 'text/xml');

        const pasosParada = xmlDoc.getElementsByTagName('PasoParada');
        const arrivals: BizkaibusArrival[] = Array.from(pasosParada).map((paso) => {
            const linea = paso.getElementsByTagName('linea')[0]?.textContent || 'N/A';
            const ruta = paso.getElementsByTagName('ruta')[0]?.textContent || 'N/A';
            const e1Minutos = parseInt(
                paso.getElementsByTagName('e1')[0]?.getElementsByTagName('minutos')[0]?.textContent || '0',
                10
            );
            const e2Minutos = parseInt(
                paso.getElementsByTagName('e2')[0]?.getElementsByTagName('minutos')[0]?.textContent || '0',
                10
            ) || undefined;

            return {
                lineId: toTitleCase(linea),
                route: toTitleCase(ruta),
                destination: toTitleCase(ruta),
                etaMinutes: e1Minutos,
                etaDisplay: e1Minutos <= 0 ? 'Ya aquí' : `${e1Minutos} min`,
                nextEtaMinutes: e2Minutos,
                nextEtaDisplay: e2Minutos ? `${e2Minutos} min` : undefined
            };
        });

        console.log(`[Bizkaibus API] Got ${arrivals.length} arrivals for stop ${stopId}`);

        return {
            status: 'OK',
            arrivals
        };
    } catch (error) {
        console.error(`[Bizkaibus API] Error fetching stop ${stopId}:`, error);
        return {
            status: 'ERROR',
            arrivals: [],
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Search Bizkaibus stops by name or ID
 */
export async function searchBizkaibusStops(query: string, limit: number = 10): Promise<BizkaibusStop[]> {
    const normalizedQuery = query.toLowerCase().trim();

    if (normalizedQuery.length < 2) return [];

    const stops = (bizkaibusStopsData as BizkaibusStopRaw[])
        .filter(stop => {
            const name = stop.DENOMINACION.toLowerCase();
            const id = stop.PARADA.toLowerCase();
            const municipality = stop.DESCRIPCION_MUNICIPIO.toLowerCase();
            return name.includes(normalizedQuery) || id === normalizedQuery || municipality.includes(normalizedQuery);
        })
        .slice(0, limit)
        .map(stop => ({
            id: stop.PARADA,
            name: stop.DENOMINACION,
            municipality: stop.DESCRIPCION_MUNICIPIO,
            lat: parseFloat(stop.LATITUD),
            lon: parseFloat(stop.LONGITUD)
        }));

    return stops;
}

/**
 * Get all Bizkaibus stops (for map view)
 */
export function getAllBizkaibusStops(): BizkaibusStop[] {
    return (bizkaibusStopsData as BizkaibusStopRaw[]).map(stop => ({
        id: stop.PARADA,
        name: stop.DENOMINACION,
        municipality: stop.DESCRIPCION_MUNICIPIO,
        lat: parseFloat(stop.LATITUD),
        lon: parseFloat(stop.LONGITUD)
    }));
}

/**
 * Get a specific Bizkaibus stop by ID
 */
export function getBizkaibusStopById(stopId: string): BizkaibusStop | null {
    const stop = (bizkaibusStopsData as BizkaibusStopRaw[]).find(s => s.PARADA === stopId);
    if (!stop) return null;

    return {
        id: stop.PARADA,
        name: stop.DENOMINACION,
        municipality: stop.DESCRIPCION_MUNICIPIO,
        lat: parseFloat(stop.LATITUD),
        lon: parseFloat(stop.LONGITUD)
    };
}

/**
 * Get nearby Bizkaibus stops
 */
export function getNearbyBizkaibusStops(lat: number, lon: number, radiusKm: number = 0.5): BizkaibusStop[] {
    const stops = getAllBizkaibusStops();
    return stops.filter(stop => {
        const R = 6371; // Earth radius in km
        const dLat = (stop.lat - lat) * Math.PI / 180;
        const dLon = (stop.lon - lon) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat * Math.PI / 180) * Math.cos(stop.lat * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c;
        return d <= radiusKm;
    }).slice(0, 10);
}
