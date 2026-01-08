
'use server';

import { db } from '@/lib/db';
import { stops } from '@/db/schema';
import { ilike, or, eq, and, gte, lte } from 'drizzle-orm';

export interface SearchResult {
    id: string;
    name: string;
    agency: string;
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
            agency: r.agency,
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

        const mapped = results.map(r => ({
            id: r.id,
            name: r.name,
            agency: r.agency,
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
            .where(eq(stops.agency, 'metro'))
            .limit(100);

        const mapped = results.map(r => ({
            id: r.id,
            name: r.name,
            agency: r.agency as 'metro' | 'bilbobus',
            lat: r.lat || 0,
            lon: r.lon || 0,
            metadata: r.metadata
        }));

        setCache(cacheKey, mapped, 30 * 60 * 1000); // 30 minutos
        return mapped;
    } catch (error) {
        console.error('Error getting all stops:', error);
        return [];
    }
}

export async function fetchRenfeSchedule(origin: string, destination: string, dateStr: string) {
    const RENFE_URL = 'https://horarios.renfe.com/cer/HorariosServlet';

    // Calculate current hour for "HoraViajeOrigen"
    const now = new Date();
    const currentHour = String(now.getHours()).padStart(2, '0');

    // Body params
    const body = {
        nucleo: "60", // Bilbao
        origen: origin,
        destino: destination,
        fchaViaje: dateStr,
        validaReglaNegocio: true,
        tiempoReal: true,
        servicioHorarios: "VTI",
        horaViajeOrigen: currentHour,
        horaViajeLlegada: "26", // End of service
        accesibilidadTrenes: false,
    };

    try {
        console.log('Fetching Renfe schedule:', body);
        const response = await fetch(RENFE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json;charset=UTF-8',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`Renfe API error: ${response.status}`);
        }

        const data = await response.json();
        return { ok: true, data };
    } catch (error) {
        console.error('Renfe fetch error:', error);
        return { ok: false, error: 'Failed to fetch schedule' };
    }
}
