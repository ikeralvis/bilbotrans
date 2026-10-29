'use client';

import { useSyncExternalStore } from 'react';

/** `auto` sigue al sistema; `light` y `dark` lo fijan (atributo `data-theme` en <html>, ver globals.css). */
export type ThemeMode = 'auto' | 'light' | 'dark';

const KEY = 'bt_theme';
const listeners = new Set<() => void>();

export function readTheme(): ThemeMode {
    try {
        const v = localStorage.getItem(KEY);
        return v === 'light' || v === 'dark' ? v : 'auto';
    } catch {
        return 'auto';
    }
}

/**
 * Cambia el tema. Un cambio de tema modifica color, fondo, borde y sombra de casi todos los elementos a la vez: si cada uno
 * tuviera su transición, el cambio se vería como una mancha. Se apagan todas durante un fotograma.
 */
export function applyTheme(mode: ThemeMode) {
    const root = document.documentElement;
    const mute = document.createElement('style');
    mute.textContent = '*,*::before,*::after{transition:none !important;animation-duration:0s !important}';
    document.head.appendChild(mute);

    if (mode === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', mode);
    try {
        if (mode === 'auto') localStorage.removeItem(KEY);
        else localStorage.setItem(KEY, mode);
    } catch {
        /* storage bloqueado: el tema dura hasta recargar */
    }
    void root.offsetHeight; // fuerza el reflujo con las transiciones apagadas
    requestAnimationFrame(() => requestAnimationFrame(() => mute.remove()));
    listeners.forEach((l) => l());
}

const subscribe = (cb: () => void) => {
    listeners.add(cb);
    return () => void listeners.delete(cb);
};

export function useTheme(): ThemeMode {
    return useSyncExternalStore(subscribe, readTheme, () => 'auto');
}

/** Script que va en <head> antes de pintar: evita el parpadeo del tema equivocado en la primera carga. */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${KEY}');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}})();`;
