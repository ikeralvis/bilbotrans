'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { motion } from 'motion/react';
import { AlertTriangle, ArrowLeft, ArrowRight, ArrowUpDown, DoorOpen, Heart, Leaf, Repeat } from 'lucide-react';
import { getStation } from '@/lib/metro/catalog';
import { refreshMetroLive, useLastGood, useMetroIncidents, useMetroRoute, useOnline } from '@/lib/metro/hooks';
import type { RouteLive } from '@/lib/metro/client';
import { useMetroRoutes } from '@/lib/metro/routes';
import { matchDelays } from '@/lib/metro/delay';
import { TRANSFER_STATION, waitMinutes } from '@/lib/metro/transfer';
import type { Timetable } from '@/lib/metro/client';
import { SegmentedTabs } from './ui';
import { IncidentsBanner } from './IncidentsSheet';
import { Countdown, DelayBadge, Disclosure, ExitBadges, ErrorState, HeroSkeleton, LineChip, NoTrainsState, OfflineBanner, SavedTrains, LiveBadge, Minutes, SPRING } from './parts';

/** Fecha y hora actuales en Bilbao (el navegador puede estar en otra zona horaria). */
function bilbaoNow(offsetMin = 0) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Madrid',
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date(Date.now() + offsetMin * 60_000));
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
    return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` };
}

/**
 * Salidas programadas desde 10 min antes de ahora (para emparejar el tren que acaba de llegar) hasta 90 min después.
 * Se comparte entre el horario y el cálculo de retraso: SWR deduplica por URL.
 */
function useRouteTimetable(from: string | null, to: string | null) {
    const now = bilbaoNow();
    const back = bilbaoNow(-10);
    const end = bilbaoNow(90);
    const start = back.date === now.date ? back.time : '00:00';
    const stop = end.date === now.date ? end.time : '23:59';
    return useSWR<Timetable>(
        from && to ? `/api/metro/timetable?from=${from}&to=${to}&start=${start}&end=${stop}&date=${now.date}` : null,
        async (url: string) => {
            const r = await fetch(url);
            if (!r.ok) throw new Error(String(r.status));
            return r.json();
        },
        { revalidateOnFocus: false },
    );
}

function TimetableBody({ from, to }: { from: string; to: string }) {
    const nowClock = bilbaoNow().time;
    const { data, error } = useRouteTimetable(from, to);
    if (error) return <p className="text-sm" style={{ color: 'var(--ink-2)' }}>No se pudo cargar el horario programado.</p>;
    if (!data) return <div className="bt-skeleton h-24" aria-hidden />;
    const leg = data.legs[0] && { ...data.legs[0], departures: data.legs[0].departures.filter((d) => d.dep >= nowClock) };
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

/** Etapas con cambio en San Ignazio. Origen y cambio salen del horario programado; el primer tren es el de tiempo real. */
function TransferSteps({
    from,
    to,
    departs,
    arrivesAtTransfer,
    departsFromTransfer,
    arrives,
    firstDestination,
}: {
    from: string;
    to: string;
    departs: string;
    arrivesAtTransfer: string | null;
    departsFromTransfer: string | null;
    arrives: string | null;
    firstDestination: string;
}) {
    const changeName = getStation(TRANSFER_STATION)?.name ?? 'San Ignazio';
    const wait = arrivesAtTransfer && departsFromTransfer ? waitMinutes(arrivesAtTransfer, departsFromTransfer) : null;
    const steps = [
        { label: from, time: departs, note: `Sales en el tren hacia ${firstDestination}` },
        {
            label: `Cambio en ${changeName}`,
            time: arrivesAtTransfer ? `${arrivesAtTransfer.slice(0, 5)} → ${departsFromTransfer?.slice(0, 5) ?? '—'}` : (departsFromTransfer?.slice(0, 5) ?? null),
            note: wait === null ? 'Cambias de línea' : wait === 0 ? 'Cambias de línea sin esperar' : `Cambias de línea · esperas unos ${wait} min`,
        },
        { label: to, time: arrives, note: 'Llegada' },
    ];
    return (
        <motion.ol
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.08 } } }}
            className="mt-5 border-t pt-4"
            style={{ borderColor: 'var(--hairline)' }}
            aria-label="Etapas del trayecto con transbordo"
        >
            {steps.map((st, i) => (
                <motion.li
                    key={st.label}
                    variants={{ hidden: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0, transition: SPRING } }}
                    className="relative flex gap-3 pb-4 last:pb-0"
                >
                    <span className="relative flex w-3 shrink-0 flex-col items-center" aria-hidden>
                        <span className="mt-1.5 h-3 w-3 rounded-full" style={{ background: i === 1 ? 'var(--warn)' : 'var(--metro)' }} />
                        {i < steps.length - 1 && <span className="absolute -bottom-1 top-5 w-px" style={{ background: 'var(--hairline)' }} />}
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold" style={{ color: 'var(--ink)' }}>{st.label}</span>
                        <span className="block text-xs" style={{ color: 'var(--ink-2)' }}>{st.note}</span>
                    </span>
                    <span className="bt-num text-[15px] font-semibold" style={{ color: 'var(--ink)' }}>{st.time ?? '—'}</span>
                </motion.li>
            ))}
        </motion.ol>
    );
}

/** Códigos con forma de estación (para decidir si hay algo que guardar o leer). */
const valid0 = (from: string, to: string) => /^[A-Z]{3}$/.test(from) && /^[A-Z]{3}$/.test(to);

export function MetroRouteView({ from, to }: { from: string; to: string }) {
    const router = useRouter();
    const a = getStation(from);
    const b = getStation(to);
    const [tab, setTab] = useState<'live' | 'timetable'>('live');
    const { data, error, isLoading, isValidating } = useMetroRoute(a?.code ?? null, b?.code ?? null);
    const { data: timetable } = useRouteTimetable(from, to);
    const { data: firstLeg } = useRouteTimetable(from, data?.transfer ? TRANSFER_STATION : null);
    const { data: secondLeg } = useRouteTimetable(data?.transfer ? TRANSFER_STATION : null, to);
    const delays = useMemo(
        () => matchDelays((data?.trains ?? []).map((t) => t.time), timetable?.legs[0]?.departures.map((d) => d.exact) ?? []),
        [data, timetable],
    );
    const { isFavorite, toggleFavorite, recordVisit } = useMetroRoutes();
    const { data: incidents } = useMetroIncidents();
    const online = useOnline();
    const saved = useLastGood<RouteLive>(valid0(from, to) ? `/api/metro/route?from=${from}&to=${to}` : null);
    const valid = Boolean(a && b);
    const fav = isFavorite({ from, to });

    /* Cuenta como visita cuando el trayecto cargó bien (no al abrir un enlace roto). */
    useEffect(() => {
        if (valid && data) recordVisit({ from, to });
    }, [valid, data, from, to, recordVisit]);

    /* Solo avisos de accesos/ascensores que nombran estas estaciones. */
    const routeNotices = useMemo(
        () => (incidents?.installationIssues ?? []).filter((i) => i.station.code === from || i.station.code === to),
        [incidents, from, to],
    );
    const matchedDeparture = useMemo(() => {
        const sched = delays[0]?.scheduled;
        return sched ? timetable?.legs[0]?.departures.find((d) => d.exact.startsWith(sched)) : undefined;
    }, [delays, timetable]);
    /* El "cambio" de la API es el siguiente tren de la otra línea, aunque no llegue al destino (p. ej. se queda en Larrabasterra).
       El tren que de verdad te lleva es el del tramo San Ignazio→destino que llega a la hora final del trayecto. */
    const boardsAt =
        (matchedDeparture?.finalExact && secondLeg?.legs[0]?.departures.find((d) => d.arrExact.slice(0, 8) === matchedDeparture.finalExact)?.exact) ||
        matchedDeparture?.transferExact ||
        null;
    const arrivesAtTransfer = matchedDeparture ? firstLeg?.legs[0]?.departures.find((d) => d.exact === matchedDeparture.exact)?.arrExact ?? null : null;

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
                        onClick={() => toggleFavorite({ from: a.code, to: b.code })}
                        aria-label={fav ? 'Quitar trayecto de favoritos' : 'Guardar trayecto en favoritos'}
                        aria-pressed={fav}
                        className="bt-press grid h-11 w-11 place-items-center rounded-full"
                    >
                        <motion.span key={String(fav)} initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={SPRING} className="grid place-items-center">
                            <Heart className="h-5 w-5" style={{ color: fav ? 'var(--danger)' : 'var(--ink-2)', fill: fav ? 'var(--danger)' : 'none' }} />
                        </motion.span>
                    </button>
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

                <IncidentsBanner service={[]} installation={routeNotices} />

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
                    <HeroSkeleton />
                ) : error && !data ? (
                    <>
                        <OfflineBanner offline={!online} lastAt={saved?.at} />
                        {saved ? (
                            <SavedTrains groups={[{ label: `Desde ${a.name}`, trains: saved.data.trains.map((t) => ({ line: saved.data.line, destination: t.destination, time: t.time })) }]} />
                        ) : (
                            <ErrorState offline={!online} onRetry={() => refreshMetroLive()} retrying={isValidating} />
                        )}
                    </>
                ) : (
                    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={SPRING} className="space-y-3" aria-label="Próximos trenes">
                        {first ? (
                            <>
                                <div className="bt-card p-5">
                                    <p className="text-[13px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--ink-2)' }}>
                                        Próximo tren desde {a.name}
                                    </p>
                                    <div className="mt-3 flex items-end justify-between gap-4">
                                        <div className="min-w-0 flex-1 pb-1">
                                            <div className="flex items-center gap-2">
                                                <LineChip line={data?.line ?? 'L1'} />
                                                <p className="truncate text-2xl font-bold tracking-[-0.02em]" style={{ color: 'var(--ink)' }}>{first.destination}</p>
                                            </div>
                                            <p className="bt-num mt-1.5 text-sm" style={{ color: 'var(--ink-2)' }}>
                                                Sale a las {first.clock} · {first.wagons} coches
                                            </p>
                                        </div>
                                        <Countdown time={first.time} fallbackMinutes={first.minutes} />
                                    </div>
                                    <div className="mt-4 min-h-7">
                                        <DelayBadge delay={delays[0]} />
                                    </div>
                                    {data?.transfer && (
                                        <TransferSteps
                                            from={a.name}
                                            to={b.name}
                                            departs={first.clock}
                                            arrivesAtTransfer={arrivesAtTransfer}
                                            departsFromTransfer={boardsAt}
                                            arrives={matchedDeparture?.arr ?? null}
                                            firstDestination={first.destination}
                                        />
                                    )}
                                </div>
                                {rest.length > 0 && (
                                    <div className="bt-card p-1.5">
                                        <h2 className="px-3.5 pb-1 pt-2.5 text-[13px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--ink-2)' }}>Siguientes</h2>
                                        {rest.map((t, i) => (
                                            <div key={i} className="flex items-center gap-3 px-3.5 py-2.5">
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-[15px] font-semibold" style={{ color: 'var(--ink)' }}>{t.destination}</p>
                                                    <p className="bt-num flex flex-wrap items-center gap-x-2 text-xs" style={{ color: 'var(--ink-2)' }}>
                                                        {t.clock} · {t.wagons} coches
                                                        {delays[i + 1] && delays[i + 1]!.state !== 'on-time' && (
                                                            <span style={{ color: delays[i + 1]!.state === 'late' ? 'var(--warn)' : 'var(--ink-2)' }}>
                                                                {delays[i + 1]!.state === 'late' ? `+${delays[i + 1]!.minutes} min` : `${delays[i + 1]!.minutes} min antes`}
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                                <Minutes value={t.minutes} />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <NoTrainsState onTimetable={() => setTab('timetable')} />
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
