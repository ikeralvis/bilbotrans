'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ChevronDown, Map as MapIcon } from 'lucide-react';
import type { MapStop } from './LineMapContent';

export type { MapStop };

const LineMapContent = dynamic(() => import('./LineMapContent'), {
    ssr: false,
    loading: () => <div className="bt-skeleton h-full w-full" aria-hidden />,
});

/**
 * Tarjeta plegable con el recorrido de la línea en el mapa. Leaflet y las teselas solo se descargan
 * al abrirla, para no penalizar la lista de paradas, que es lo que se usa a diario.
 */
export function LineMapCard({ stops, color, label }: { stops: MapStop[]; color: string; label: string }) {
    const reduce = useReducedMotion();
    const [open, setOpen] = useState(false);
    if (stops.length < 2) return null;
    return (
        <section className="bt-card overflow-hidden">
            <button
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                className="bt-press flex min-h-14 w-full items-center gap-3 px-4 text-left"
            >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ background: 'color-mix(in srgb, var(--accent) 14%, var(--surface))' }}>
                    <MapIcon className="h-[18px] w-[18px]" style={{ color: 'var(--accent-text)' }} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold" style={{ color: 'var(--ink)' }}>Ver recorrido en el mapa</span>
                    <span className="block truncate text-[12px]" style={{ color: 'var(--ink-2)' }}>{label}</span>
                </span>
                <motion.span animate={{ rotate: open ? 180 : 0 }} transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 30 }}>
                    <ChevronDown className="h-5 w-5" style={{ color: 'var(--ink-2)' }} aria-hidden />
                </motion.span>
            </button>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        key="map"
                        initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                        animate={reduce ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
                        exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0, transition: { duration: 0.18 } }}
                        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
                        className="overflow-hidden"
                    >
                        {/* Alto fijo: Leaflet mide el contenedor al crearse y no debe ver la altura animada. */}
                        <div className="h-[300px] border-t" style={{ borderColor: 'var(--hairline)' }}>
                            <LineMapContent stops={stops} color={color} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
}
