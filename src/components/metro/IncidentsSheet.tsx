'use client';

import { useState } from 'react';
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

/** Tarjeta de aviso que abre un bottom sheet con el detalle de todas las incidencias. */
export function IncidentsBanner({ service, installation }: { service: MetroIncident[]; installation: MetroIncident[] }) {
    const [open, setOpen] = useState(false);
    const total = service.length + installation.length;
    if (total === 0) return null;
    const first = service[0] ?? installation[0];
    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="bt-press flex w-full items-center gap-2.5 rounded-2xl px-4 py-3 text-left text-sm"
                style={{ background: 'color-mix(in srgb, var(--warn) 16%, var(--surface))', color: 'var(--ink)' }}
            >
                <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: 'var(--warn)' }} aria-hidden />
                <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{first.title}</span>
                    {total > 1 && <span className="block text-xs" style={{ color: 'var(--ink-2)' }}>y {total - 1} aviso{total > 2 ? 's' : ''} más</span>}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0" style={{ color: 'var(--ink-2)' }} aria-hidden />
            </button>
            <BottomSheet open={open} onClose={() => setOpen(false)} title="Avisos de Metro Bilbao">
                {service.length > 0 && (
                    <section className="mb-4">
                        <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--ink-2)' }}>Servicio</h3>
                        <ul className="space-y-2">{service.map((i, k) => <IncidentItem key={k} item={i} />)}</ul>
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
