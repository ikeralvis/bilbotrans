'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight, CalendarX, Pencil, Radio, Repeat } from 'lucide-react';
import { getStation } from '@/lib/metro/catalog';
import type { Timetable } from '@/lib/metro/client';
import { TRANSFER_STATION } from '@/lib/metro/transfer';
import { bilbaoClock, flattenTrips, toMinutes, windowIsNow, type TripRow, type TripWindow } from '@/lib/metro/tripTime';
import { useOnline } from '@/lib/metro/hooks';
import { LegalFooter } from '@/components/shared/Legal';
import { ErrorState, StateCard } from './parts';
import { TripEditor } from './TripTimeFields';

const fetcher = async (url: string) => {
    const r = await fetch(url);
    if (!r.ok) throw new Error(String(r.status));
    return r.json() as Promise<Timetable>;
};

function dayLabel(date: string) {
    if (date === bilbaoClock().date) return 'hoy';
    return new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
}

function Row({ row, state, innerRef }: { row: TripRow; state: 'past' | 'next' | 'later'; innerRef?: (el: HTMLLIElement | null) => void }) {
    const next = state === 'next';
    return (
        <li
            ref={innerRef}
            className="flex items-center gap-3 px-4 py-3"
            style={{ opacity: state === 'past' ? 0.5 : 1, background: next ? 'color-mix(in srgb, var(--metro) 10%, transparent)' : undefined, boxShadow: next ? 'inset 3px 0 0 var(--metro)' : undefined }}
        >
            <span className="bt-num flex min-w-0 flex-1 items-center gap-2.5 text-[22px] font-bold leading-none tracking-[-0.02em]" style={{ color: 'var(--ink)' }}>
                {row.dep}
                <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2} style={{ color: 'var(--ink-2)' }} aria-label="llega a las" />
                {row.arr}
            </span>
            <span className="flex shrink-0 flex-col items-end gap-0.5 text-right">
                <span className="bt-num text-[14px] font-semibold" style={{ color: 'var(--ink)' }}>{row.minutes} min</span>
                {row.transfer && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: 'var(--ink-2)' }}>
                        <Repeat className="h-3 w-3" aria-hidden /> con cambio
                    </span>
                )}
            </span>
        </li>
    );
}

/** Horario programado de un trayecto en una franja: lista «hora de salida → hora de llegada». Origen, destino y franja se editan desde la cabecera. */
export function MetroScheduleView({ from, to, window: win }: { from: string; to: string; window: TripWindow }) {
    const reduce = useReducedMotion();
    const online = useOnline();
    const a = getStation(from);
    const b = getStation(to);
    const [editing, setEditing] = useState(false);
    const { data, error, isLoading, mutate } = useSWR(`/api/metro/timetable?from=${from}&to=${to}&start=${win.start}&end=${win.end}&date=${win.date}`, fetcher, { revalidateOnFocus: false });
    const rows = useMemo(() => (data ? flattenTrips(data) : []), [data]);

    const isToday = win.date === bilbaoClock().date;
    const nowMin = toMinutes(bilbaoClock().time);
    const nextIndex = isToday ? rows.findIndex((r) => toMinutes(r.dep) >= nowMin) : -1;
    const nextRef = useRef<HTMLLIElement | null>(null);
    useEffect(() => {
        if (nextIndex > 3) nextRef.current?.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
    }, [nextIndex, reduce]);

    const live = windowIsNow(win);
    const changeName = getStation(TRANSFER_STATION)?.name ?? 'San Ignazio';

    return (
        <div className="min-h-dvh pb-[max(6rem,env(safe-area-inset-bottom))]" style={{ background: 'var(--bg)' }}>
            <header className="bt-glass sticky top-0 z-20 border-b" style={{ borderColor: 'var(--hairline)' }}>
                <div className="mx-auto flex max-w-2xl items-center gap-1 px-2 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))]">
                    <Link href="/metro" aria-label="Volver" className="bt-press grid h-11 w-11 shrink-0 place-items-center rounded-full">
                        <ArrowLeft className="h-5 w-5" style={{ color: 'var(--ink)' }} />
                    </Link>
                    <button type="button" onClick={() => setEditing(true)} aria-label="Editar trayecto, horas y fecha" className="bt-press flex min-h-12 min-w-0 flex-1 items-center gap-3 rounded-2xl px-3 text-left" style={{ background: 'var(--surface-2)' }}>
                        <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5 truncate text-[16px] font-bold leading-5 tracking-[-0.01em]" style={{ color: 'var(--ink)' }}>
                                <span className="truncate">{a?.name ?? from}</span>
                                <ArrowRight className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
                                <span className="truncate">{b?.name ?? to}</span>
                            </span>
                            <span className="bt-num block truncate text-[13px] leading-[18px]" style={{ color: 'var(--ink-2)' }}>
                                {win.start} – {win.end} · {dayLabel(win.date)}
                            </span>
                        </span>
                        <Pencil className="h-4 w-4 shrink-0" strokeWidth={1.75} style={{ color: 'var(--ink-2)' }} aria-hidden />
                    </button>
                </div>
            </header>

            <main className="mx-auto max-w-2xl space-y-4 px-4 pt-4">
                {live && (
                    <Link href={`/metro/route?origin=${from}&dest=${to}`} className="bt-press flex min-h-12 items-center gap-3 rounded-2xl px-4 text-[15px] font-semibold" style={{ background: 'color-mix(in srgb, var(--live) 14%, var(--surface))', color: 'var(--ink)' }}>
                        <Radio className="h-4 w-4" style={{ color: 'var(--live)' }} aria-hidden />
                        <span className="flex-1">Estás dentro de esta franja: ver trenes en directo</span>
                        <ArrowRight className="h-4 w-4" style={{ color: 'var(--ink-2)' }} aria-hidden />
                    </Link>
                )}

                {error ? (
                    <ErrorState offline={!online} onRetry={() => void mutate()} service="Metro Bilbao" live="el horario" />
                ) : isLoading || !data ? (
                    <div className="space-y-2" aria-hidden>
                        {Array.from({ length: 6 }, (_, i) => <div key={i} className="bt-skeleton h-14" />)}
                    </div>
                ) : rows.length === 0 ? (
                    <StateCard icon={<CalendarX className="h-6 w-6" style={{ color: 'var(--ink-2)' }} />} title="Sin salidas en esa franja" message="Prueba a ampliar las horas o a cambiar de día: el Metro no circula de madrugada." />
                ) : (
                    <motion.section initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', duration: 0.4, bounce: 0 }} aria-label="Salidas">
                        <p className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--ink-2)' }}>
                            {rows.length} {rows.length === 1 ? 'salida' : 'salidas'} · salida → llegada
                        </p>
                        <ul className="bt-card divide-y overflow-hidden" style={{ borderColor: 'var(--hairline)' }}>
                            {rows.map((r, i) => (
                                <Row key={`${r.dep}-${r.arr}`} row={r} state={!isToday ? 'later' : nextIndex === -1 || i < nextIndex ? 'past' : i === nextIndex ? 'next' : 'later'} innerRef={i === nextIndex ? (el) => { nextRef.current = el; } : undefined} />
                            ))}
                        </ul>
                        {data.transfer && (
                            <p className="mt-2 flex items-start gap-2 px-1 text-xs leading-5" style={{ color: 'var(--ink-2)' }}>
                                <Repeat className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                                Este trayecto requiere cambiar de línea en {changeName}. La hora de llegada ya incluye el cambio.
                            </p>
                        )}
                    </motion.section>
                )}

                <p className="px-1 text-xs leading-5" style={{ color: 'var(--ink-2)' }}>
                    Horario programado por Metro Bilbao: los trenes reales pueden variar. Para ver el próximo tren en directo, elige «Viajar ahora».
                </p>
                <LegalFooter network="metro" />
            </main>

            {/* key: al cambiar la franja desde la URL, el formulario vuelve a leer los valores nuevos */}
            <TripEditor key={`${from}-${to}-${win.start}-${win.end}-${win.date}`} open={editing} onClose={() => setEditing(false)} from={from} to={to} window={win} />
        </div>
    );
}
