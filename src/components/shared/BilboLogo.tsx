'use client';

import { motion, useReducedMotion } from 'motion/react';

/* Marca de BilboTrans: una «B» trazada como línea de transporte, con una parada en cada extremo
 * (naranja del Metro, rojo de Bilbobus y lima de Bizkaibus). Mismo dibujo que public/icons/icon.svg. */

const B_PATH = 'M38 28V92M38 28H62A16 16 0 0 1 62 60H38M38 60H66A16 16 0 0 1 66 92H38';
const STOPS = [
    { cx: 38, cy: 28, c: '#d93e14' },
    { cx: 38, cy: 60, c: '#c22629' },
    { cx: 38, cy: 92, c: '#a5ca71' },
];

/** Sello de la app. `animated` dibuja la línea y hace aparecer las paradas (se repite en bucle). */
export function BilboMark({ size = 64, animated = false, tile = true, className = '' }: { size?: number; animated?: boolean; tile?: boolean; className?: string }) {
    const reduce = useReducedMotion();
    const run = animated && !reduce;
    return (
        <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label="BilboTrans" className={className} style={{ display: 'block', flexShrink: 0 }}>
            {tile && <rect width="120" height="120" rx="28" fill="#17181d" />}
            <motion.path
                d={B_PATH}
                fill="none"
                stroke={tile ? '#ffffff' : 'currentColor'}
                strokeWidth={9}
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={run ? { pathLength: 0 } : false}
                animate={run ? { pathLength: [0, 1, 1, 0] } : undefined}
                transition={run ? { duration: 1.1, repeat: Infinity, times: [0, 0.6, 0.85, 1], ease: 'easeInOut' } : undefined}
            />
            {STOPS.map((s, i) => (
                <motion.circle
                    key={i}
                    cx={s.cx}
                    cy={s.cy}
                    r={7.5}
                    fill={s.c}
                    stroke={tile ? '#17181d' : 'var(--bg)'}
                    strokeWidth={3}
                    animate={run ? { scale: [1, 1.25, 1] } : undefined}
                    transition={run ? { duration: 0.4, repeat: Infinity, repeatDelay: 0.7, delay: i * 0.12, ease: 'easeOut' } : undefined}
                    style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                />
            ))}
        </svg>
    );
}

/** Pantalla/zona de carga con la marca animada. `label` es para lectores de pantalla. */
export function LogoLoader({ label = 'Cargando', size = 56, className = '' }: { label?: string; size?: number; className?: string }) {
    return (
        <div role="status" aria-live="polite" className={`grid place-items-center ${className}`}>
            <BilboMark size={size} animated />
            <span className="sr-only">{label}</span>
        </div>
    );
}
