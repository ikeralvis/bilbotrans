import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/shared/db';
import { stops } from '@/db/schema';
import { ilike, or } from 'drizzle-orm';

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

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const query = searchParams.get('q');

        if (!query || query.length < 2) {
            return NextResponse.json([]);
        }

        const cacheKey = getCacheKey(query);
        const cached = getCached(cacheKey);

        if (cached) {
            return NextResponse.json(cached);
        }

        const results = await db
            .select()
            .from(stops)
            .where(
                or(
                    ilike(stops.name, `%${query}%`),
                    ilike(stops.id, `%${query}%`)
                )
            )
            .limit(50);

        // Deduplicar por (stopId + agency)
        const seen = new Set<string>();
        const mapped = results
            .map(r => ({
                id: r.id, // Retornar ID tal cual (es el código de estación)
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

        setCache(cacheKey, mapped);
        return NextResponse.json(mapped);
    } catch (error) {
        console.error('Error searching stops:', error);
        return NextResponse.json([], { status: 500 });
    }
}
