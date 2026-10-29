/** Minúsculas sin tildes ni signos, para comparar texto escrito a mano. */
export function normalize(s: string): string {
    return s
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9ñ ]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/** Distancia en metros entre dos coordenadas (haversine). */
export function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6_371_000;
    const rad = (d: number) => (d * Math.PI) / 180;
    const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
}

/** "MUNGIA (Aut.)" → "Mungia (Aut.)": las APIs dan los nombres en mayúsculas. */
export function titleCase(s: string): string {
    return s
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/(^|[\s/(-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

/** 80 → "80 m"; 1 340 → "1,3 km". */
export function fmtDistance(m: number): string {
    return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`;
}
