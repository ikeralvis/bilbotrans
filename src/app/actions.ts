
'use server';

import { db } from '@/lib/shared/db';
import { stops } from '@/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import * as bilbobus from '@/lib/bilbobus/api';

export interface SearchResult {
    id: string;
    name: string;
    agency: 'metro' | 'bilbobus' | 'bizkaibus' | 'renfe';
    lat?: number;
    lon?: number;
    metadata: any;
}

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
}

// Simple in-memory cache con TTL
const cache = new Map<string, CacheEntry<any>>();

const getCacheKey = (prefix: string, query: string) => `${prefix}:${query}`;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

const getCached = <T>(key: string): T | null => {
    const entry = cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
        cache.delete(key);
        return null;
    }

    return entry.data as T;
};

const setCache = <T>(key: string, data: T, ttl: number = CACHE_TTL) => {
    cache.set(key, {
        data,
        timestamp: Date.now(),
        ttl,
    });
};

export async function getStopDetails(stopId: string, agency: string): Promise<SearchResult | null> {
    const cacheKey = getCacheKey('stop_details', `${stopId}_${agency}`);
    const cached = getCached<SearchResult>(cacheKey);

    if (cached) {
        return cached;
    }

    try {
        const result = await db.select()
            .from(stops)
            .where(
                and(
                    eq(stops.id, stopId),
                    eq(stops.agency, agency)
                )
            )
            .limit(1);

        if (result.length === 0) return null;

        const r = result[0];
        const mapped: SearchResult = {
            id: r.id,
            name: r.name,
            agency: r.agency as any,
            lat: r.lat || undefined,
            lon: r.lon || undefined,
            metadata: r.metadata
        };

        setCache(cacheKey, mapped, 15 * 60 * 1000); // 15 minutos para detalles
        return mapped;
    } catch (error) {
        console.error('Error getting stop details:', error);
        return null;
    }
}

export async function getNearbyStops(
    lat: number,
    lon: number,
    radiusKm: number = 1
): Promise<SearchResult[]> {
    const cacheKey = getCacheKey('nearby_stops', `${lat}_${lon}_${radiusKm}`);
    const cached = getCached<SearchResult[]>(cacheKey);

    if (cached) {
        return cached;
    }

    try {
        // Aproximación simple: usar BETWEEN para lat/lon
        // En producción, usar PostGIS para distancia real
        const latDelta = radiusKm / 111; // ~111 km por grado de latitud
        const lonDelta = radiusKm / (111 * Math.cos(lat * Math.PI / 180));

        const results = await db.select()
            .from(stops)
            .where(
                and(
                    gte(stops.lat, lat - latDelta),
                    lte(stops.lat, lat + latDelta),
                    gte(stops.lon, lon - lonDelta),
                    lte(stops.lon, lon + lonDelta)
                )
            )
            .limit(20);

        const mapped: SearchResult[] = results.map(r => ({
            id: r.id,
            name: r.name,
            agency: r.agency as any,
            lat: r.lat || 0,
            lon: r.lon || 0,
            metadata: r.metadata
        }));

        setCache(cacheKey, mapped, 10 * 60 * 1000); // 10 minutos
        return mapped;
    } catch (error) {
        console.error('Error getting nearby stops:', error);
        return [];
    }
}

export async function getAllStops(): Promise<SearchResult[]> {
    const cacheKey = getCacheKey('all_stops', 'metro');
    const cached = getCached<SearchResult[]>(cacheKey);

    if (cached) {
        return cached;
    }

    try {
        const results = await db.select()
            .from(stops)
            .limit(300); // Fetch more stops

        const mapped: SearchResult[] = results.map(r => ({
            id: r.id,
            name: r.name,
            agency: r.agency as any,
            lat: r.lat || 0,
            lon: r.lon || 0,
            metadata: r.metadata
        }));

        setCache(cacheKey, mapped, 30 * 60 * 1000);
        return mapped;
    } catch (error) {
        console.error('Error getting all stops:', error);
        return [];
    }
}

export async function fetchRenfeSchedule(origin: string, destination: string, dateStr: string) {
    const RENFE_URL = 'https://horarios.renfe.com/cer/HorariosServlet';

    const now = new Date();
    const currentHour = String(now.getHours()).padStart(2, '0');
    const finalHourCandidate = now.getHours() + 12;
    let allResults: any[] = [];

    // Convert dateStr from DD-MM-YYYY to YYYYMMDD format that Renfe expects
    const dateForRenfe = dateStr.split('-').reverse().join('');

    try {
        console.log(`[Renfe] Fetching schedules from ${origin} to ${destination} on ${dateForRenfe}`);
        
        // First request: current hour to end of day or +12 hours
        if (finalHourCandidate <= 26) {
            const body = {
                nucleo: "60",
                origen: origin,
                destino: destination,
                fchaViaje: dateForRenfe,
                validaReglaNegocio: true,
                tiempoReal: true,
                servicioHorarios: "VTI",
                horaViajeOrigen: currentHour,
                horaViajeLlegada: String(finalHourCandidate).padStart(2, '0'),
                accesibilidadTrenes: false,
            };

            console.log('[Renfe] First request body:', body);

            const response = await fetch(RENFE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json;charset=UTF-8',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36'
                },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                const data = await response.json();
                console.log('[Renfe] First fetch response:', { status: response.status, hasHorario: !!data?.horario, count: data?.horario?.length });
                allResults = data?.horario || [];
            } else {
                console.warn('[Renfe] First fetch failed:', response.status);
            }
        } else {
            // If we cross midnight, split into two requests
            const body1 = {
                nucleo: "60",
                origen: origin,
                destino: destination,
                fchaViaje: dateForRenfe,
                validaReglaNegocio: true,
                tiempoReal: true,
                servicioHorarios: "VTI",
                horaViajeOrigen: currentHour,
                horaViajeLlegada: "26",
                accesibilidadTrenes: false,
            };

            const response1 = await fetch(RENFE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json;charset=UTF-8',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36'
                },
                body: JSON.stringify(body1)
            });

            if (response1.ok) {
                const data1 = await response1.json();
                allResults = data1?.horario || [];
            }

            // Next day request
            const nextDate = new Date(now);
            nextDate.setDate(nextDate.getDate() + 1);
            const nextDateForRenfe = nextDate.toLocaleDateString('es-ES').split('/').map(v => v.padStart(2, '0')).join('');
            const extraHours = finalHourCandidate - 26;

            const body2 = {
                nucleo: "60",
                origen: origin,
                destino: destination,
                fchaViaje: nextDateForRenfe,
                validaReglaNegocio: true,
                tiempoReal: true,
                servicioHorarios: "VTI",
                horaViajeOrigen: "00",
                horaViajeLlegada: String(extraHours).padStart(2, '0'),
                accesibilidadTrenes: false,
            };

            const response2 = await fetch(RENFE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json;charset=UTF-8',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36'
                },
                body: JSON.stringify(body2)
            });

            if (response2.ok) {
                const data2 = await response2.json();
                allResults = [...allResults, ...(data2?.horario || [])];
            }
        }

        console.log('[Renfe] Total results:', allResults.length);
        return { ok: true, data: { horario: allResults } };
    } catch (error) {
        console.error('[Renfe] Fetch error:', error);
        return { ok: false, error: 'Failed to fetch schedule' };
    }
}

// Bilbobus Actions
export async function getBilbobusArrivals(lineId: string) {
    return await bilbobus.getBilbobusArrivals(lineId);
}

export async function getBilbobusArrivalsByStop(stopId: string) {
    return await bilbobus.getBilbobusArrivalsByStop(stopId);
}

export async function getAllBilbobusLines() {
    return bilbobus.getAllBilbobusLines();
}

export async function getBilbobusLineDetails(lineId: string) {
    return bilbobus.getBilbobusLineDetails(lineId);
}

export async function searchBilbobusStops(query: string) {
    return bilbobus.searchBilbobusStops(query);
}

export async function getBilbobusStop(stopId: string) {
    return bilbobus.getBilbobusStop(stopId);
}

export async function getBilbobusStops(stopIds: string[]) {
    return stopIds.map(id => bilbobus.getBilbobusStop(id)).filter(Boolean) as bilbobus.BilbobusStop[];
}
