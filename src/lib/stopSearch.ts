/**
 * Cliente para búsqueda de paradas (sin Server Actions).
 * Hace fetch al API route /api/stops/search.
 * NEXT_PUBLIC_API_URL debería ser "" (vacío) para usar misma URL.
 */

export interface SearchResult {
    id: string;
    name: string;
    agency: string;
    lat?: number;
    lon?: number;
    metadata?: any;
}

const clientCache = new Map<string, { data: SearchResult[]; time: number }>();
const CACHE_TTL = 60 * 1000; // 1 minuto de caché en cliente

export async function searchStops(query: string): Promise<SearchResult[]> {
    if (!query || query.length < 2) return [];

    const key = query.toLowerCase();
    const now = Date.now();
    const cached = clientCache.get(key);

    // Retornar caché si es válido
    if (cached && now - cached.time < CACHE_TTL) {
        return cached.data;
    }

    try {
        // NEXT_PUBLIC_API_URL vacío = misma URL (ej: bilbotrans.vercel.app)
        const base = (typeof globalThis !== 'undefined' && globalThis.window?.location.origin) || '';
        const url = `${base}/api/stops/search?q=${encodeURIComponent(query)}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
            console.error('[searchStops] Error:', response.status);
            return [];
        }

        const data = await response.json();
        clientCache.set(key, { data, time: now });
        return data;
    } catch (error) {
        console.error('[searchStops] Fetch error:', error);
        return [];
    }
}
