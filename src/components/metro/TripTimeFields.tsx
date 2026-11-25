'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpDown, Search } from 'lucide-react';
import { getStation, type CatalogStation } from '@/lib/metro/catalog';
import { defaultWindow, scheduleHref, toMinutes, type TripWindow } from '@/lib/metro/tripTime';
import { StationField } from './StationField';
import { BottomSheet, SegmentedTabs } from './ui';

export type TripMode = 'now' | 'time';

/** Franja válida: hora de fin posterior a la de inicio (dentro del mismo día). */
export const windowValid = (w: TripWindow) => toMinutes(w.end) > toMinutes(w.start);

function TimeBox({ label, type, value, onChange, min }: { label: string; type: 'time' | 'date'; value: string; onChange: (v: string) => void; min?: string }) {
    return (
        <label className="flex min-h-14 flex-1 items-center gap-3 rounded-[14px] px-3.5" style={{ background: 'var(--surface-2)' }}>
            <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--ink-2)' }}>{label}</span>
            <input
                type={type}
                value={value}
                min={min}
                required
                onChange={(e) => e.target.value && onChange(e.target.value)}
                className="bt-num min-w-0 flex-1 bg-transparent text-[17px] font-semibold outline-none"
                style={{ color: 'var(--ink)', colorScheme: 'light dark' }}
            />
        </label>
    );
}

/** Selector «Viajar ahora / Elegir hora»; en el segundo modo, fecha y franja de salida. */
export function TimeFields({ mode, onMode, value, onChange }: { mode: TripMode; onMode: (m: TripMode) => void; value: TripWindow; onChange: (w: TripWindow) => void }) {
    const invalid = mode === 'time' && !windowValid(value);
    return (
        <div className="space-y-2">
            <SegmentedTabs
                label="Cuándo viajas"
                value={mode}
                onChange={onMode}
                options={[{ id: 'now', label: 'Viajar ahora' }, { id: 'time', label: 'Elegir hora' }]}
            />
            {mode === 'time' && (
                <div className="space-y-2">
                    <TimeBox label="Fecha" type="date" value={value.date} onChange={(date) => onChange({ ...value, date })} />
                    <div className="flex gap-2">
                        <TimeBox label="Desde" type="time" value={value.start} onChange={(start) => onChange({ ...value, start })} />
                        <TimeBox label="Hasta" type="time" value={value.end} onChange={(end) => onChange({ ...value, end })} />
                    </div>
                    {invalid && <p className="px-1 text-xs" role="alert" style={{ color: 'var(--warn)' }}>La hora «Hasta» tiene que ser posterior a «Desde».</p>}
                </div>
            )}
        </div>
    );
}

/** Hoja para cambiar origen, destino y franja desde el detalle del trayecto. */
export function TripEditor({ open, onClose, from, to, window: win }: { open: boolean; onClose: () => void; from: string; to: string; window: TripWindow | null }) {
    const router = useRouter();
    const [origin, setOrigin] = useState<CatalogStation | null>(() => getStation(from) ?? null);
    const [dest, setDest] = useState<CatalogStation | null>(() => getStation(to) ?? null);
    const [mode, setMode] = useState<TripMode>(win ? 'time' : 'now');
    const [w, setW] = useState<TripWindow>(() => win ?? defaultWindow());

    const ready = Boolean(origin && dest && origin.code !== dest.code && (mode === 'now' || windowValid(w)));
    const apply = () => {
        if (!origin || !dest || !ready) return;
        onClose();
        router.replace(mode === 'time' ? scheduleHref(origin.code, dest.code, w) : `/metro/route?origin=${origin.code}&dest=${dest.code}`);
    };

    return (
        <BottomSheet open={open} onClose={onClose} title="Editar trayecto">
            <div className="space-y-2 pb-2">
                <StationField label="Origen" value={origin} onChange={setOrigin} />
                <div className="relative">
                    <StationField label="Destino" value={dest} onChange={setDest} />
                    {origin && dest && (
                        <button
                            type="button"
                            onClick={() => { setOrigin(dest); setDest(origin); }}
                            aria-label="Invertir"
                            className="bt-press bt-card absolute -top-5 right-3 grid h-9 w-9 place-items-center rounded-full"
                        >
                            <ArrowUpDown className="h-4 w-4" style={{ color: 'var(--ink-2)' }} />
                        </button>
                    )}
                </div>
                <TimeFields mode={mode} onMode={setMode} value={w} onChange={setW} />
                <button
                    type="button"
                    onClick={apply}
                    disabled={!ready}
                    className="bt-press mt-1 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[14px] text-[16px] font-semibold text-white disabled:opacity-40"
                    style={{ background: 'var(--metro)' }}
                >
                    <Search className="h-4 w-4" aria-hidden />
                    {mode === 'time' ? 'Ver horarios' : 'Ver trayecto'}
                </button>
            </div>
        </BottomSheet>
    );
}
