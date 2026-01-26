import { BilbobusStop, BilbobusLine, RouteVariant } from './api';
import bilbobusData from '@/data/bilbobus/data.json';

interface BilbobusData {
    lines: Record<string, BilbobusLine>;
    stops: Record<string, BilbobusStop>;
}

const data = bilbobusData as BilbobusData;

/**
 * Busca paradas por nombre (CLIENTE)
 */
export function searchBilbobusStops(query: string, limit: number = 20): BilbobusStop[] {
    const searchTerm = query.toLowerCase().trim();

    if (searchTerm.length < 1) return [];

    const results = Object.values(data.stops)
        .filter(stop =>
            stop.name.toLowerCase().includes(searchTerm) ||
            stop.id.includes(searchTerm)
        )
        .slice(0, limit);

    return results;
}

/**
 * Busca líneas por nombre o número (CLIENTE)
 */
export function searchBilbobusLines(query: string, limit: number = 20): BilbobusLine[] {
    const searchTerm = query.toLowerCase().trim();

    if (searchTerm.length < 1) return [];

    const results = Object.values(data.lines)
        .filter(line =>
            line.id.toLowerCase().includes(searchTerm) ||
            line.name.toLowerCase().includes(searchTerm)
        )
        .slice(0, limit);

    return results;
}

/**
 * Obtiene una parada por ID (CLIENTE)
 */
export function getBilbobusStopById(stopId: string): BilbobusStop | null {
    return data.stops[stopId] || null;
}

/**
 * Obtiene una línea por ID (CLIENTE)
 */
export function getBilbobusLineById(lineId: string): BilbobusLine | null {
    return data.lines[lineId] || null;
}

/**
 * Obtiene todas las paradas de una línea (todas las variantes) (CLIENTE)
 */
export function getBilbobusLineStops(lineId: string): BilbobusStop[] {
    const line = data.lines[lineId];
    if (!line) return [];

    return line.allStops
        .map(stopId => data.stops[stopId])
        .filter(Boolean);
}

/**
 * Obtiene las paradas de una variante específica (CLIENTE)
 */
export function getBilbobusVariantStops(lineId: string, variantId: string): BilbobusStop[] {
    const line = data.lines[lineId];
    if (!line) return [];

    const variant = line.variants.find(v => v.id === variantId);
    if (!variant) return [];

    return variant.stops
        .map(stopId => data.stops[stopId])
        .filter(Boolean);
}

/**
 * Obtiene las variantes de una línea (CLIENTE)
 */
export function getBilbobusLineVariants(lineId: string): RouteVariant[] {
    const line = data.lines[lineId];
    if (!line) return [];
    return line.variants;
}

/**
 * Obtiene variantes filtradas por dirección (CLIENTE)
 */
export function getBilbobusLineVariantsByDirection(lineId: string, direction: 'IDA' | 'VUELTA'): RouteVariant[] {
    const line = data.lines[lineId];
    if (!line) return [];
    return line.variants.filter(v => v.direction === direction);
}

/**
 * Obtiene todas las líneas que pasan por una parada (CLIENTE)
 */
export function searchBilbobusLinesByStop(stopId: string): BilbobusLine[] {
    const stop = data.stops[stopId];
    if (!stop || !stop.lines) return [];

    return stop.lines
        .map(lineId => data.lines[lineId])
        .filter(Boolean);
}

/**
 * Obtiene paradas cercanas por coordenadas (CLIENTE)
 */
export function getNearbyBilbobusStops(
    lat: number,
    lon: number,
    radiusKm: number = 0.5,
    limit: number = 10
): BilbobusStop[] {
    const toRadians = (degrees: number) => degrees * (Math.PI / 180);

    const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371; // Radio de la Tierra en km
        const dLat = toRadians(lat2 - lat1);
        const dLon = toRadians(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadians(lat1)) *
                Math.cos(toRadians(lat2)) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const stopsWithDistance = Object.values(data.stops)
        .map(stop => ({
            stop,
            distance: haversineDistance(lat, lon, stop.lat, stop.lon),
        }))
        .filter(item => item.distance <= radiusKm)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, limit);

    return stopsWithDistance.map(item => item.stop);
}

/**
 * Obtiene todas las líneas de Bilbobus (CLIENTE)
 */
export function getAllBilbobusLines(): BilbobusLine[] {
    return Object.values(data.lines).sort((a, b) => {
        // Sort numerically for numbers, alphabetically for letters
        const aNum = parseInt(a.id);
        const bNum = parseInt(b.id);
        if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
        if (!isNaN(aNum)) return -1;
        if (!isNaN(bNum)) return 1;
        return a.id.localeCompare(b.id);
    });
}

/**
 * Obtiene todas las paradas de Bilbobus (CLIENTE)
 */
export function getAllBilbobusStops(): BilbobusStop[] {
    return Object.values(data.stops).sort((a, b) => 
        a.name.localeCompare(b.name, 'es')
    );
}
