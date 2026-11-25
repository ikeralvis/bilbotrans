import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/shared/db';
import { stops } from '@/db/schema';
import { ilike, or } from 'drizzle-orm';
import metroStations from '@/data/metro/stations.json';

export const revalidate = 3600; // Cache por 1 hora
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Simple in-memory cache con TTL
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

const getCacheKey = (query: string) => `search:${query.toLowerCase()}`;
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

const setCache = <T>(key: string, data: T) => {
    cache.set(key, {
        data,
        timestamp: Date.now(),
        ttl: CACHE_TTL,
    });
};

// Search in static Metro data
function searchMetroStations(query: string) {
    const queryLower = query.toLowerCase();
    const results: any[] = [];
    
    try {
        const lines = Object.values(metroStations) as any[];
        for (const line of lines) {
            if (line.stations && Array.isArray(line.stations)) {
                for (const station of line.stations) {
                    // Buscar por prefijo (empieza por) en vez de contiene
                    if (station.name.toLowerCase().startsWith(queryLower) || 
                        station.code.toLowerCase().startsWith(queryLower)) {
                        results.push({
                            id: station.code,
                            name: station.name,
                            agency: 'metro',
                            lat: 0,
                            lon: 0,
                            metadata: null
                        });
                    }
                }
            }
        }
    } catch (err) {
        console.error('Error searching metro stations:', err);
    }
    
    // Deduplicate
    const seen = new Set<string>();
    return results.filter(r => {
        const key = `${r.id}_${r.agency}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const query = searchParams.get('q');

        if (!query || query.length < 1) {
            return NextResponse.json([]);
        }

        const cacheKey = getCacheKey(query);
        const cached = getCached(cacheKey);

        if (cached) {
            return NextResponse.json(cached);
        }

        // Primero buscar en datos estáticos de Metro (más rápido)
        const metroResults = searchMetroStations(query);

        // Si tenemos suficientes resultados de metro, devolver inmediatamente
        if (metroResults.length >= 5 && query.length <= 2) {
            setCache(cacheKey, metroResults.slice(0, 15));
            return NextResponse.json(metroResults.slice(0, 15));
        }

        // Search in DB solo si necesitamos más resultados
        const dbResults = await db
            .select()
            .from(stops)
            .where(
                or(
                    ilike(stops.name, `${query}%`),
                    ilike(stops.id, `${query}%`)
                )
            )
            .limit(50);

        // Combine and deduplicate by (stopId + agency)
        const seen = new Set<string>();
        const allResults = [...dbResults, ...metroResults]
            .map(r => ({
                id: r.id,
                name: r.name,
                agency: r.agency,
                lat: r.lat || 0,
                lon: r.lon || 0,
                metadata: r.metadata
            }))
            .filter(r => {
                const key = `${r.id}_${r.agency}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .slice(0, 15);

        setCache(cacheKey, allResults);
        return NextResponse.json(allResults);
    } catch (error) {
        console.error('Error searching stops:', error);
        return NextResponse.json([], { status: 500 });
    }
}
