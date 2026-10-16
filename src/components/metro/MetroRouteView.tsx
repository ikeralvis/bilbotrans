'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { motion } from 'motion/react';
import { AlertTriangle, ArrowLeft, ArrowRight, ArrowUpDown, DoorOpen, Leaf, Repeat } from 'lucide-react';
import { getStation } from '@/lib/metro/catalog';
import { refreshMetroLive, useMetroRoute } from '@/lib/metro/hooks';
import type { Timetable } from '@/lib/metro/client';
import { SegmentedTabs } from './ui';
import { Disclosure, ExitBadges, GroupSkeleton, LineChip, LiveBadge, Minutes, SPRING } from './parts';

/** Fecha y hora actuales en Bilbao (el navegador puede estar en otra zona horaria). */
function bilbaoNow(offsetMin = 0) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Madrid',
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date(Date.now() + offsetMin * 60_000));
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
    return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` };
}

function TimetableBody({ from, to }: { from: string; to: string }) {
    const now = bilbaoNow();
    const end = bilbaoNow(90);
    const date = now.date;
    const start = now.time;
    const stop = end.date === now.date ? end.time : '23:59';
    const { data, error } = useSWR<Timetable>(
        `/api/metro/timetable?from=${from}&to=${to}&start=${start}&end=${stop}&date=${date}`,
        async (url: string) => {
            const r = await fetch(url);
            if (!r.ok) throw new Error(String(r.status));
            return r.json();
        },
        { revalidateOnFocus: false },
    );
    if (error) return <p className="text-sm" style={{ color: 'var(--ink-2)' }}>No se pudo cargar el horario programado.</p>;
    if (!data) return <div className="bt-skeleton h-24" aria-hidden />;
    const leg = data.legs[0];
    if (!leg || leg.departures.length === 0) return <p className="text-sm" style={{ color: 'var(--ink-2)' }}>Sin salidas programadas en las próximas 90 minutos.</p>;
    return (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {leg.departures.slice(0, 12).map((d, i) => (
                <li key={i} className="bt-num flex items-center justify-between text-sm" style={{ color: 'var(--ink)' }}>
                    <span className="font-semibold">{d.dep}</span>
                    <span className="flex items-center gap-1" style={{ color: 'var(--ink-2)' }}>
                        <ArrowRight className="h-3 w-3" aria-hidden />
                        {d.arr}
                    </span>
                </li>
            ))}
        </ul>
    );
}

export function MetroRouteView({ from, to }: { from: string; to: string }) {
    const router = useRouter();
    const a = getStation(from);
    const b = getStation(to);
    const [tab, setTab] = useState<'live' | 'timetable'>('live');
    const { data, error, isLoading, isValidating } = useMetroRoute(a?.code ?? null, b?.code ?? null);

    if (!a || !b) {
        return (
            <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center" style={{ background: 'var(--bg)' }}>
                <AlertTriangle className="h-8 w-8" style={{ color: 'var(--warn)' }} aria-hidden />
                <p className="font-semibold" style={{ color: 'var(--ink)' }}>Estaciones no encontradas</p>
                <Link href="/" className="bt-press rounded-full px-5 py-2.5 text-sm font-semibold text-white" style={{ background: 'var(--metro)' }}>
                    Volver al inicio
                </Link>
            </main>
        );
    }

    const [first, ...rest] = data?.trains ?? [];

    return (
        <div className="min-h-dvh pb-[max(2rem,env(safe-area-inset-bottom))]" style={{ background: 'var(--bg)' }}>
            <header className="bt-glass sticky top-0 z-20 border-b" style={{ borderColor: 'var(--hairline)' }}>
                <div className="mx-auto flex max-w-2xl items-center gap-2 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
                    <button onClick={() => (window.history.length > 1 ? router.back() : router.push('/'))} aria-label="Volver" className="bt-press grid h-11 w-11 place-items-center rounded-full">
                        <ArrowLeft className="h-5 w-5" style={{ color: 'var(--ink)' }} />
                    </button>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-[17px] font-bold tracking-[-0.01em]" style={{ color: 'var(--ink)' }}>
                            {a.name} <span style={{ color: 'var(--ink-2)' }}>→</span> {b.name}
                        </p>
                    </div>
                    <button
                        onClick={() => router.replace(`/metro/route?origin=${b.code}&dest=${a.code}`)}
                        aria-label="Invertir trayecto"
                        className="bt-press grid h-11 w-11 place-items-center rounded-full"
                    >
                        <ArrowUpDown className="h-5 w-5" style={{ color: 'var(--ink-2)' }} />
                    </button>
                </div>
            </header>

            <main className="mx-auto max-w-2xl space-y-3 px-4 pt-4">
                <div className="flex flex-wrap items-center gap-2">
                    <LiveBadge fetchedAt={data?.fetchedAt} stale={Boolean(error)} refreshing={isValidating} onRefresh={() => refreshMetroLive()} />
                    {data && (
                        <>
                            <LineChip line={data.line} />
                            <span className="bt-num rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}>
                                {data.duration} min de viaje
                            </span>
                            {data.transfer && (
                                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}>
                                    <Repeat className="h-3 w-3" aria-hidden /> Con transbordo
                                </span>
                            )}
                        </>
                    )}
                </div>

                <SegmentedTabs
                    label="Vista del trayecto"
                    value={tab}
                    onChange={setTab}
                    options={[
                        { id: 'live', label: 'Próximos trenes' },
                        { id: 'timetable', label: 'Horario' },
                    ]}
                />

                {tab === 'timetable' ? (
                    <div className="bt-card p-4">
                        <p className="mb-3 text-[13px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--ink-2)' }}>
                            Salidas desde {a.name} · próximos 90 min
                        </p>
                        <TimetableBody from={a.code} to={b.code} />
                    </div>
                ) : isLoading && !data ? (
                    <GroupSkeleton />
                ) : error && !data ? (
                    <div className="bt-card px-4 py-8 text-center">
                        <p className="font-semibold" style={{ color: 'var(--ink)' }}>No se pudo cargar el trayecto</p>
                        <p className="mt-1 text-sm" style={{ color: 'var(--ink-2)' }}>Reintentando automáticamente…</p>
                    </div>
                ) : (
                    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={SPRING} className="bt-card p-2" aria-label="Próximos trenes">
                        <h2 className="px-3.5 pb-2 pt-3 text-[13px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--ink-2)' }}>
                            Próximos trenes desde {a.name}
                        </h2>
                        {first ? (
                            <>
                                <div className="flex items-center gap-3 rounded-[14px] px-3.5 py-3.5" style={{ background: 'var(--surface-2)' }}>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-lg font-semibold" style={{ color: 'var(--ink)' }}>{first.destination}</p>
                                        <p className="bt-num text-xs" style={{ color: 'var(--ink-2)' }}>{first.clock} · {first.wagons} coches</p>
                                    </div>
                                    <Minutes value={first.minutes} big />
                                </div>
                                {rest.map((t, i) => (
                                    <div key={i} className="flex items-center gap-3 px-3.5 py-2.5">
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-[15px] font-semibold" style={{ color: 'var(--ink)' }}>{t.destination}</p>
                                            <p className="bt-num text-xs" style={{ color: 'var(--ink-2)' }}>{t.clock} · {t.wagons} coches</p>
                                        </div>
                                        <Minutes value={t.minutes} />
                                    </div>
                                ))}
                            </>
                        ) : (
                            <p className="px-4 py-8 text-center text-sm" style={{ color: 'var(--ink-2)' }}>Sin trenes previstos ahora.</p>
                        )}
                    </motion.section>
                )}

                {data && data.messages.length > 0 && (
                    <div className="flex gap-2.5 rounded-2xl px-4 py-3 text-sm" style={{ background: 'color-mix(in srgb, var(--warn) 16%, var(--surface))', color: 'var(--ink)' }} role="status">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--warn)' }} aria-hidden />
                        <p>{data.messages.join(' · ')}</p>
                    </div>
                )}


                {data && (data.originExits.length > 0 || data.destinationExits.length > 0) && (
                    <Disclosure title="Salidas" icon={<DoorOpen className="h-4 w-4" style={{ color: 'var(--ink-2)' }} aria-hidden />}>
                        {[
                            { title: a.name, list: data.originExits },
                            { title: b.name, list: data.destinationExits },
                        ].map((g) => (
                            <div key={g.title} className="mb-3 last:mb-0">
                                <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--ink-2)' }}>{g.title}</p>
                                <ul className="space-y-1.5">
                                    {g.list.map((e) => (
                                        <li key={e.id} className="flex items-center gap-3">
                                            <span className="min-w-0 flex-1 truncate text-sm" style={{ color: 'var(--ink)' }}>{e.name}</span>
                                            <ExitBadges elevator={e.elevator} nocturnal={e.nocturnal} />
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </Disclosure>
                )}

                <div className="flex gap-3">
                    <Link href={`/metro/station/${a.code}?agency=metro`} className="bt-card bt-press flex min-h-12 flex-1 items-center justify-center px-3 text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                        Parada {a.name}
                    </Link>
                    <Link href={`/metro/station/${b.code}?agency=metro`} className="bt-card bt-press flex min-h-12 flex-1 items-center justify-center px-3 text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                        Parada {b.name}
                    </Link>
                </div>

                <p className="flex items-center justify-center gap-1.5 pt-1 text-xs" style={{ color: 'var(--ink-2)' }}>
                    <Leaf className="h-3 w-3" aria-hidden /> Datos oficiales de Metro Bilbao
                </p>
            </main>
        </div>
    );
}
