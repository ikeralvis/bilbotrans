'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { ChevronDown, CloudOff } from 'lucide-react';
import { BottomSheet } from '@/components/metro/ui';
import { StateCard } from '@/components/metro/parts';
import type { StationLineTimes } from '@/lib/euskotren/times';
import { titleCase } from '@/components/shared/bus';
import { EtChip } from './EtUi';

const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    return res.json() as Promise<{ directions: StationLineTimes[] }>;
};

/** Minutos desde medianoche de "HH:mm". */
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
/** Hora actual en Bilbao, en minutos. */
function nowMinutes() {
    const [h, m] = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date()).split(':');
    return Number(h) * 60 + Number(m);
}

function Group({ group, next, defaultOpen }: { group: StationLineTimes['groups'][number]; next: string | null; defaultOpen: boolean }) {
    const [open, setOpen] = useState(defaultOpen);
    const [now] = useState(nowMinutes);
    return (
        <section className="rounded-2xl" style={{ background: group.today ? 'color-mix(in srgb, var(--accent) 9%, var(--surface-2))' : 'var(--surface-2)', boxShadow: group.today ? 'inset 3px 0 0 var(--accent)' : undefined }}>
            <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="bt-press flex min-h-12 w-full items-center gap-2 px-4 text-left">
                <h4 className="flex-1 text-[13px] font-bold uppercase tracking-[0.06em]" style={{ color: 'var(--ink)' }}>{group.label}</h4>
                <span className="bt-num text-xs" style={{ color: 'var(--ink-2)' }}>{group.times.length}</span>
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} style={{ color: 'var(--ink-2)' }} aria-hidden />
            </button>
            {open && (
                <ul className="flex flex-wrap gap-1.5 px-4 pb-4" aria-label={`Horas de salida: ${group.label}`}>
                    {group.times.map((t, i) => {
                        const isNext = group.today && t === next;
                        const past = group.today && !isNext && toMin(t) < now && next !== null;
                        return (
                            <li key={`${t}-${i}`} className="bt-num rounded-lg px-2.5 py-1 text-[15px] font-semibold" style={{ background: isNext ? 'var(--accent)' : 'var(--surface)', color: isNext ? '#fff' : past ? 'var(--ink-2)' : 'var(--ink)', opacity: past ? 0.55 : 1 }}>
                                {t}
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}

/** Horas de salida programadas de una línea en una estación, por tipo de día. Hoy va primero y resalta la próxima. */
export function DepartureTimesSheet({ open, onClose, station, line, stationName }: { open: boolean; onClose: () => void; station: string; line: string | null; stationName: string }) {
    const { data, error } = useSWR(open && line ? `/api/euskotren/times/${station}?line=${line}` : null, fetcher, { revalidateOnFocus: false });
    return (
        <BottomSheet open={open} onClose={onClose} title={line ? `${line} · horario` : 'Horario'}>
            <div className="space-y-4 pb-2">
                <p className="flex items-center gap-2 text-sm" style={{ color: 'var(--ink-2)' }}>
                    {line && <EtChip line={line} size="sm" />}
                    <span className="min-w-0 truncate">salidas de {stationName}</span>
                </p>
                {error ? (
                    <StateCard icon={<CloudOff className="h-6 w-6" style={{ color: 'var(--ink-2)' }} />} title="No se pudo cargar el horario" />
                ) : !data ? (
                    <div className="space-y-2" aria-hidden>
                        <div className="bt-skeleton h-12" />
                        <div className="bt-skeleton h-12" />
                    </div>
                ) : data.directions.length === 0 ? (
                    <p className="text-sm" style={{ color: 'var(--ink-2)' }}>Esta línea no tiene salidas programadas en esta estación.</p>
                ) : (
                    data.directions.map((d) => (
                        <div key={d.direction} className="space-y-2">
                            <h3 className="px-1 text-[15px] font-bold" style={{ color: 'var(--ink)' }}>Hacia {titleCase(d.towards)}</h3>
                            {d.groups.map((g, i) => <Group key={g.label} group={g} next={d.next} defaultOpen={g.today || (i === 0 && !d.groups.some((x) => x.today))} />)}
                        </div>
                    ))
                )}
                <p className="px-1 text-xs leading-5" style={{ color: 'var(--ink-2)' }}>
                    Horario programado de Euskotren (GTFS). Las salidas del último tren hacia un destino pueden variar por obras o avisos; en la estación ves el tiempo real.
                </p>
            </div>
        </BottomSheet>
    );
}
