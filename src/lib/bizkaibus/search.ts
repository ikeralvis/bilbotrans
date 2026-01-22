/**
 * Búsqueda LOCAL de paradas de Bizkaibus (sin BD).
 * Lee directamente del archivo JSON para evitar cargar 30K registros en PostgreSQL.
 */

import bizkaibusStopsData from '@/data/bizkaibus/stops.json';

export interface BizkaibusStopResult {
    id: string;
    name: string;
    agency: 'bizkaibus';
    lat: number;
    lon: number;
    municipio: string;
    direccion: string;
}

/**
 * Busca paradas de Bizkaibus localmente en el JSON
 * @param query - Texto de búsqueda (nombre o código de parada)
 * @param limit - Número máximo de resultados (default: 15)
 * @returns Array de paradas que coinciden con la búsqueda
 */
export function searchBizkaibusStops(query: string, limit = 15): BizkaibusStopResult[] {
    if (!query || query.length < 2) return [];
    
    const q = query.toLowerCase().trim();
    
    // Filtrar paradas que coincidan con el nombre o código
    const results = bizkaibusStopsData
        .filter(stop => 
            stop.DENOMINACION.toLowerCase().includes(q) || 
            stop.PARADA.includes(q) ||
            stop.DESCRIPCION_MUNICIPIO.toLowerCase().includes(q)
        )
        .slice(0, limit)
        .map(stop => ({
            id: stop.PARADA,
            name: stop.DENOMINACION,
            agency: 'bizkaibus' as const,
            lat: parseFloat(stop.LATITUD),
            lon: parseFloat(stop.LONGITUD),
            municipio: stop.DESCRIPCION_MUNICIPIO,
            direccion: stop.DIRECCION
        }));
    
    return results;
}

/**
 * Obtiene paradas cercanas de Bizkaibus por coordenadas
 * @param lat - Latitud
 * @param lon - Longitud  
 * @param radiusKm - Radio de búsqueda en kilómetros (default: 2)
 * @param limit - Número máximo de resultados (default: 10)
 */
export function getNearbyBizkaibusStops(
    lat: number, 
    lon: number, 
    radiusKm = 2, 
    limit = 10
): BizkaibusStopResult[] {
    // Calcular distancia usando fórmula de Haversine simplificada
    const results = bizkaibusStopsData
        .map(stop => {
            const stopLat = parseFloat(stop.LATITUD);
            const stopLon = parseFloat(stop.LONGITUD);
            
            // Fórmula simplificada para distancia aproximada
            const dLat = (stopLat - lat) * 111; // 111 km por grado de latitud
            const dLon = (stopLon - lon) * 111 * Math.cos(lat * Math.PI / 180);
            const distance = Math.sqrt(dLat * dLat + dLon * dLon);
            
            return {
                id: stop.PARADA,
                name: stop.DENOMINACION,
                agency: 'bizkaibus' as const,
                lat: stopLat,
                lon: stopLon,
                municipio: stop.DESCRIPCION_MUNICIPIO,
                direccion: stop.DIRECCION,
                distance
            };
        })
        .filter(stop => stop.distance <= radiusKm)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, limit)
        .map(({ distance, ...stop }) => stop); // Eliminar campo distance del resultado
    
    return results;
}

/**
 * Obtiene una parada específica por ID
 */
export function getBizkaibusStopById(stopId: string): BizkaibusStopResult | null {
    const stop = bizkaibusStopsData.find(s => s.PARADA === stopId);
    
    if (!stop) return null;
    
    return {
        id: stop.PARADA,
        name: stop.DENOMINACION,
        agency: 'bizkaibus',
        lat: parseFloat(stop.LATITUD),
        lon: parseFloat(stop.LONGITUD),
        municipio: stop.DESCRIPCION_MUNICIPIO,
        direccion: stop.DIRECCION
    };
}
