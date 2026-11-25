import renfeStopsData from '@/data/renfe/stops.json';

export interface RenfeStop {
    id: string;
    name: string;
    lat: number;
    lon: number;
    lines: string[];
}

export interface RenfeTrip {
    trainType: string;
    departure: string;
    arrival: string;
    duration: string;
    line: string;
}

/**
 * Search Renfe stops
 */
export async function searchRenfeStops(query: string, limit: number = 10): Promise<RenfeStop[]> {
    const normalizedQuery = query.toLowerCase().trim();
    if (normalizedQuery.length < 2) return [];

    return (renfeStopsData as any[])
        .filter(stop => {
            const name = stop.name.toLowerCase();
            return name.includes(normalizedQuery);
        })
        .slice(0, limit)
        .map(stop => ({
            id: stop.id,
            name: stop.name,
            lat: stop.latitude,
            lon: stop.longitude,
            lines: stop.Lines
        }));
}

/**
 * Get all Renfe stops
 */
export function getAllRenfeStops(): RenfeStop[] {
    return (renfeStopsData as any[]).map(stop => ({
        id: stop.id,
        name: stop.name,
        lat: stop.latitude,
        lon: stop.longitude,
        lines: stop.Lines
    }));
}

/**
 * Get Renfe stop by ID
 */
export function getRenfeStopById(id: string): RenfeStop | null {
    const stop = (renfeStopsData as any[]).find(s => s.id === id);
    if (!stop) return null;
    return {
        id: stop.id,
        name: stop.name,
        lat: stop.latitude,
        lon: stop.longitude,
        lines: stop.Lines
    };
}

/**
 * Get nearby Renfe stops
 */
export function getNearbyRenfeStops(lat: number, lon: number, radiusKm: number = 1.0): RenfeStop[] {
    const stops = getAllRenfeStops();
    return stops.filter(stop => {
        const R = 6371;
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
