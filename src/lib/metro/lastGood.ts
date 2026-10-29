/** Último dato en vivo bueno por URL, para enseñarlo (marcado como antiguo) si se abre la app sin conexión. */

export const LAST_GOOD_PREFIX = 'bt_last_good:';
/** Pasado esto el dato ya no sirve ni como referencia. */
export const MAX_AGE_MS = 6 * 60 * 60_000;

interface Saved<T> {
    at: number;
    data: T;
}

export function saveLastGood<T>(key: string, data: T) {
    try {
        localStorage.setItem(LAST_GOOD_PREFIX + key, JSON.stringify({ at: Date.now(), data } satisfies Saved<T>));
    } catch {
        /* storage lleno o bloqueado: no pasa nada */
    }
}

export function readLastGood<T>(key: string): Saved<T> | null {
    try {
        const raw = localStorage.getItem(LAST_GOOD_PREFIX + key);
        if (!raw) return null;
        const saved = JSON.parse(raw) as Saved<T>;
        return Date.now() - saved.at <= MAX_AGE_MS ? saved : null;
    } catch {
        return null;
    }
}
