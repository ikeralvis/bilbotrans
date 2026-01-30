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

export async function searchStops(query: string): Promise<SearchResult[]> {
    if (!query || query.length < 1) return [];

    try {
        // NEXT_PUBLIC_API_URL vacío = misma URL (ej: bilbotrans.vercel.app)
        const base = (typeof globalThis !== 'undefined' && globalThis.window?.location.origin) || '';
        const url = `${base}/api/stops/search?q=${encodeURIComponent(query)}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store', // Siempre obtener datos frescos
        });

        if (!response.ok) {
            console.error('[searchStops] Error:', response.status);
            return [];
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('[searchStops] Fetch error:', error);
        return [];
    }
}
