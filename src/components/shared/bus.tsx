'use client';

import { fmtDistance, titleCase } from '@/lib/shared/textGeo';

export { fmtDistance, titleCase };

/* Piezas comunes de las redes de autobús (Bizkaibus, Bilbobus). El color sale de `--accent`, que fija el layout de cada red. */

/** Negro o blanco, el que se lea mejor sobre ese color de fondo (el amarillo de la 40 con texto blanco no se lee). */
export function readableOn(hex: string): string {
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
    if (!m) return '#fff';
    const [r, g, b] = [m[1], m[2], m[3]].map((x) => parseInt(x, 16));
    return (r * 299 + g * 587 + b * 114) / 1000 >= 150 ? '#14141a' : '#fff';
}

/** Chip de línea. Sin `color` usa el de la red (`--accent`); Bilbobus pasa el color oficial de cada línea. */
export function BusChip({ line, size = 'md', color }: { line: string; size?: 'sm' | 'md' | 'lg'; color?: string | null }) {
    const dims = size === 'sm' ? 'h-5 px-1.5 text-[11px]' : size === 'lg' ? 'h-8 px-3 text-[15px]' : 'h-6 px-2 text-xs';
    return (
        <span
            className={`bt-num inline-flex shrink-0 items-center justify-center rounded-md font-bold tracking-tight ${dims}`}
            style={{ background: color ?? 'var(--accent)', color: color ? readableOn(color) : '#fff' }}
            aria-label={`Línea ${line}`}
        >
            {line}
        </span>
    );
}
