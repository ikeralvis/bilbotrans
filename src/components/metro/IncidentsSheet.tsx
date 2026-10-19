'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { getStation } from '@/lib/metro/catalog';
import { plainText, type MetroIncident } from '@/lib/metro/incidents';
import { LineChip } from './parts';
import { BottomSheet } from './ui';

function IncidentItem({ item }: { item: MetroIncident }) {
    const station = item.station.code ? getStation(item.station.code)?.name : null;
    const body = plainText(item.description || item.resume);
    return (
        <li className="rounded-2xl p-4" style={{ background: 'var(--surface-2)' }}>
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                {item.line.map((l) => (
                    <LineChip key={l} line={l} size="sm" />
                ))}
                {station && (
                    <span className="text-xs font-semibold" style={{ color: 'var(--ink-2)' }}>
                        {station}
                        {item.exit ? ` · ${item.exit}` : ''}
                    </span>
                )}
            </div>
            <p className="text-[15px] font-semibold" style={{ color: 'var(--ink)' }}>{item.title}</p>
            {body && <p className="mt-1 whitespace-pre-line text-sm leading-6" style={{ color: 'var(--ink-2)' }}>{body}</p>}
        </li>
    );
}

export interface FlaggedStation { code: string; name: string }

/**
 * Un único banner con todos los avisos (CMS + estaciones marcadas por el estado de línea).
 * Con más de uno se desliza en horizontal; al tocar abre un bottom sheet con el detalle.
 * Las estaciones marcadas solo traen el nombre (la API de línea da un booleano): el detalle
 * real está en el aviso del CMS o en la ficha de la estación.
 */
export function IncidentsBanner({
    service,
    installation,
    flagged = [],
}: {
    service: MetroIncident[];
    installation: MetroIncident[];
    flagged?: FlaggedStation[];
}) {
    const [open, setOpen] = useState(false);
    const [index, setIndex] = useState(0);
    const uncovered = flagged.filter((f) => !installation.some((i) => i.station.code === f.code));
    const cards = [
        ...service.map((i, k) => ({ key: `s-${k}`, title: i.title, sub: plainText(i.resume || i.description) })),
        ...installation.map((i, k) => ({
            key: `i-${k}`,
            title: i.title,
            sub: (i.station.code && getStation(i.station.code)?.name) || plainText(i.resume || i.description),
        })),
        ...uncovered.map((f) => ({ key: `f-${f.code}`, title: `Incidencia en ${f.name}`, sub: 'Toca para ver más detalle' })),
    ];
    if (cards.length === 0) return null;
    return (
        <>
            <div>
                <ul
                    className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    onScroll={(e) => {
                        const el = e.currentTarget;
                        const card = el.firstElementChild as HTMLElement | null;
                        if (card) setIndex(Math.round(el.scrollLeft / (card.offsetWidth + 8)));
                    }}
                    aria-label={`${cards.length} avisos`}
                >
                    {cards.map((c) => (
                        <li key={c.key} className="w-full shrink-0 snap-center">
                            <button
                                onClick={() => setOpen(true)}
                                className="bt-press flex w-full items-center gap-2.5 rounded-2xl px-4 py-3 text-left text-sm"
                                style={{ background: 'color-mix(in srgb, var(--warn) 16%, var(--surface))', color: 'var(--ink)' }}
                            >
                                <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: 'var(--warn)' }} aria-hidden />
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate font-semibold">{c.title}</span>
                                    {c.sub && <span className="block truncate text-xs" style={{ color: 'var(--ink-2)' }}>{c.sub}</span>}
                                </span>
                                <ChevronRight className="h-4 w-4 shrink-0" style={{ color: 'var(--ink-2)' }} aria-hidden />
                            </button>
                        </li>
                    ))}
                </ul>
                {cards.length > 1 && (
                    <div className="mt-2 flex items-center justify-center gap-1.5" aria-hidden>
                        {cards.map((c, k) => (
                            <span
                                key={c.key}
                                className="h-1.5 rounded-full transition-all"
                                style={{ width: k === index ? 16 : 6, background: k === index ? 'var(--warn)' : 'var(--ink-2)', opacity: k === index ? 1 : 0.35 }}
                            />
                        ))}
                    </div>
                )}
            </div>
            <BottomSheet open={open} onClose={() => setOpen(false)} title={`Avisos de Metro Bilbao (${cards.length})`}>
                {service.length > 0 && (
                    <section className="mb-4">
                        <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--ink-2)' }}>Servicio</h3>
                        <ul className="space-y-2">{service.map((i, k) => <IncidentItem key={k} item={i} />)}</ul>
                    </section>
                )}
                {uncovered.length > 0 && (
                    <section className="mb-4">
                        <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--ink-2)' }}>Estaciones con incidencia</h3>
                        <ul className="space-y-2">
                            {uncovered.map((f) => (
                                <li key={f.code}>
                                    <Link href={`/metro/station/${f.code}?agency=metro`} className="bt-press flex min-h-12 items-center justify-between rounded-2xl p-4" style={{ background: 'var(--surface-2)' }}>
                                        <span className="text-[15px] font-semibold" style={{ color: 'var(--ink)' }}>{f.name}</span>
                                        <ChevronRight className="h-4 w-4" style={{ color: 'var(--ink-2)' }} aria-hidden />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
                {installation.length > 0 && (
                    <section>
                        <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--ink-2)' }}>Instalaciones</h3>
                        <ul className="space-y-2">{installation.map((i, k) => <IncidentItem key={k} item={i} />)}</ul>
                    </section>
                )}
            </BottomSheet>
        </>
    );
}
