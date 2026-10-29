'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { ArrowLeft, CalendarClock, ChevronRight, CloudOff, Search, X } from 'lucide-react';
import { getStop, normalize } from '@/lib/bizkaibus/catalog';
import { useBizkaibusAlerts, useLineSchedule } from '@/lib/bizkaibus/hooks';
import type { DirectionId, LineDetail, LineStop } from '@/lib/bizkaibus/types';
import { SPRING, StateCard } from '@/components/metro/parts';
import { SegmentedTabs } from '@/components/metro/ui';
import { SeasonSchedule } from './ScheduleView';
import { AlertsBanner, BusChip, titleCase } from './ui';
import { NetworkBadge } from '@/components/shared/brand';

const stripCode = (name: string) => name.replace(/\s*\([^)]*\)\s*$/, '');

function ScheduleBody({ code }: { code: string }) {
    const { data, error } = useLineSchedule(code);
    const [showAll, setShowAll] = useState(false);
    if (error) return <StateCard icon={<CloudOff className="h-6 w-6" style={{ color: 'var(--ink-2)' }} />} title="No se pudo cargar el horario" message="El servicio de horarios de Bizkaibus no responde ahora." />;
    if (!data) {
        return (
            <div className="bt-card space-y-3 p-5" aria-hidden>
                <div className="bt-skeleton h-4 w-40" />
                <div className="bt-skeleton h-28" />
                <div className="bt-skeleton h-28" />
            </div>
        );
    }
    if (data.seasons.length === 0) {
        return <StateCard icon={<CalendarClock className="h-6 w-6" style={{ color: 'var(--ink-2)' }} />} title="Sin horario publicado" message="Bizkaibus no publica horario en texto para esta línea. Mira las paradas y los avisos." />;
    }
    const active = data.seasons.filter((s) => s.active);
    const shown = showAll || active.length === 0 ? data.seasons : active;
    return (
        <div className="space-y-3">
            {shown.map((s) => (
                <motion.article key={`${s.name}-${s.from}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={SPRING} className="bt-card space-y-3 p-4">
                    <header className="flex flex-wrap items-center gap-x-2 gap-y-1 px-1 pt-1">
                        <h3 className="text-[17px] font-bold" style={{ color: 'var(--ink)' }}>{s.name || 'Horario'}</h3>
                        {s.active && <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: 'color-mix(in srgb, var(--live) 18%, var(--surface))', color: 'var(--ink)' }}>Vigente</span>}
                        <span className="bt-num text-xs" style={{ color: 'var(--ink-2)' }}>{s.from} – {s.to}</span>
                    </header>
                    <SeasonSchedule season={s} />
                </motion.article>
            ))}
            {active.length > 0 && data.seasons.length > active.length && (
                <button onClick={() => setShowAll((v) => !v)} className="bt-press mx-auto flex min-h-11 items-center rounded-full px-4 text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>
                    {showAll ? 'Ver solo el vigente' : `Ver otras temporadas (${data.seasons.length - active.length})`}
                </button>
            )}
            <p className="px-1 text-center text-xs" style={{ color: 'var(--ink-2)' }}>Horario programado publicado por la Diputación Foral de Bizkaia. «Hoy» no tiene en cuenta festivos locales.</p>
        </div>
    );
}

interface StopRow {
    stop: LineStop;
    index: number;
    municipality: string;
    /** Otras líneas que paran aquí (transbordos). */
    others: string[];
}

/** Paradas del recorrido agrupadas por municipio (tramos consecutivos), con la línea de tiempo continua. */
function StopsList({ line, dir }: { line: LineDetail; dir: DirectionId }) {
    const [q, setQ] = useState('');
    const stops = useMemo(() => line.directions[dir] ?? [], [line, dir]);
    const rows = useMemo<StopRow[]>(
        () =>
            stops.map((stop, index) => {
                const info = getStop(stop.code);
                return { stop, index, municipality: info?.municipality ?? '', others: (info?.lines ?? []).filter((l) => l !== line.code) };
            }),
        [stops, line.code],
    );
    const municipalities = useMemo(() => new Set(rows.map((r) => r.municipality).filter(Boolean)).size, [rows]);
    const filtering = q.trim() !== '';
    const visible = useMemo(() => {
        const n = normalize(q);
        return filtering ? rows.filter((r) => normalize(`${r.stop.name} ${r.municipality} ${r.stop.code}`).includes(n)) : rows;
    }, [rows, q, filtering]);

    // Tramos consecutivos del mismo municipio: cada tramo lleva su cabecera.
    const sections = useMemo(() => {
        const out: Array<{ municipality: string; rows: StopRow[] }> = [];
        for (const r of visible) {
            const last = out[out.length - 1];
            if (last && last.municipality === r.municipality) last.rows.push(r);
            else out.push({ municipality: r.municipality, rows: [r] });
        }
        return out;
    }, [visible]);

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 px-1">
                <p className="text-[13px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--ink-2)' }}>
                    {stops.length} paradas{municipalities > 1 ? ` · ${municipalities} municipios` : ''}
                </p>
            </div>

            {stops.length > 12 && (
                <div className="flex min-h-12 items-center gap-2 rounded-[14px] px-3.5" style={{ background: 'var(--surface-2)' }}>
                    <Search className="h-4 w-4 shrink-0" style={{ color: 'var(--ink-2)' }} aria-hidden />
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Buscar parada en esta línea"
                        className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-[var(--ink-2)]"
                        style={{ color: 'var(--ink)' }}
                        autoComplete="off"
                        spellCheck={false}
                        aria-label="Buscar parada en esta línea"
                    />
                    {q && (
                        <button onClick={() => setQ('')} aria-label="Borrar" className="bt-press grid h-9 w-9 place-items-center">
                            <X className="h-4 w-4" style={{ color: 'var(--ink-2)' }} />
                        </button>
                    )}
                </div>
            )}

            {sections.length === 0 ? (
                <StateCard icon={<Search className="h-6 w-6" style={{ color: 'var(--ink-2)' }} />} title="Ninguna parada coincide" message="Prueba con otra parte del nombre o con el municipio." />
            ) : (
                <motion.div key={dir} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={SPRING} className="bt-card px-2 py-3" role="list" aria-label="Paradas del recorrido">
                    {sections.map((sec, si) => (
                        <div key={`${sec.municipality}-${si}`} role="listitem">
                            {sec.municipality && (
                                <div className="flex items-center gap-3 px-3 pb-1 pt-3 first:pt-1">
                                    <span className="relative flex w-4 shrink-0 justify-center self-stretch" aria-hidden>
                                        {!filtering && <span className="absolute inset-y-0 w-[3px] rounded-full" style={{ background: 'color-mix(in srgb, var(--accent) 35%, var(--surface))' }} />}
                                    </span>
                                    <h3 className="text-xs font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--accent)' }}>{titleCase(sec.municipality)}</h3>
                                </div>
                            )}
                            <ul>
                                {sec.rows.map((r) => {
                                    const end = r.index === 0 || r.index === stops.length - 1;
                                    const first = r.index === 0;
                                    const last = r.index === stops.length - 1;
                                    return (
                                        <li key={`${r.stop.code}-${r.index}`}>
                                            <Link href={`/bizkaibus/stop/${r.stop.code}`} className="bt-press flex min-h-[60px] items-center gap-3 rounded-xl px-3 hover:bg-[var(--surface-2)]">
                                                <span className="relative flex w-4 shrink-0 justify-center self-stretch" aria-hidden>
                                                    {!filtering && !first && <span className="absolute bottom-1/2 top-0 w-[3px]" style={{ background: 'color-mix(in srgb, var(--accent) 35%, var(--surface))' }} />}
                                                    {!filtering && !last && <span className="absolute bottom-0 top-1/2 w-[3px]" style={{ background: 'color-mix(in srgb, var(--accent) 35%, var(--surface))' }} />}
                                                    <span
                                                        className="relative z-10 my-auto rounded-full"
                                                        style={
                                                            end
                                                                ? { width: 16, height: 16, background: 'var(--accent)', boxShadow: '0 0 0 4px color-mix(in srgb, var(--accent) 25%, var(--surface))' }
                                                                : { width: 11, height: 11, background: 'var(--surface)', border: '3px solid var(--accent)' }
                                                        }
                                                    />
                                                </span>
                                                <span className="min-w-0 flex-1 py-2">
                                                    <span className="block text-[16px] leading-5" style={{ color: 'var(--ink)', fontWeight: end ? 700 : 600 }}>{r.stop.name}</span>
                                                    <span className="bt-num mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-5" style={{ color: 'var(--ink-2)' }}>
                                                        <span>{first ? 'Origen · ' : last ? 'Destino · ' : ''}parada {r.stop.code}</span>
                                                        {r.others.length > 0 && (
                                                            <span className="flex flex-wrap items-center gap-1" aria-label={`Otras líneas: ${r.others.join(', ')}`}>
                                                                {r.others.slice(0, 3).map((l) => <BusChip key={l} line={l} size="sm" />)}
                                                                {r.others.length > 3 && <span className="text-[11px] font-semibold">+{r.others.length - 3}</span>}
                                                            </span>
                                                        )}
                                                    </span>
                                                </span>
                                                <ChevronRight className="h-4 w-4 shrink-0" style={{ color: 'var(--ink-2)' }} aria-hidden />
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </motion.div>
            )}
        </div>
    );
}

export function BizkaibusLineView({ line }: { line: LineDetail }) {
    const router = useRouter();
    const [tab, setTab] = useState<'stops' | 'schedule'>('stops');
    const available = (['I', 'V'] as DirectionId[]).filter((d) => line.directions[d]?.length);
    const [dir, setDir] = useState<DirectionId>(available[0] ?? 'I');
    const { data } = useBizkaibusAlerts();
    const alerts = (data?.alerts ?? []).filter((a) => a.lines.includes(line.code));

    return (
        <div className="min-h-dvh pb-[max(2rem,env(safe-area-inset-bottom))]" style={{ background: 'var(--bg)' }}>
            <header className="bt-glass sticky top-0 z-20 border-b" style={{ borderColor: 'var(--hairline)' }}>
                <div className="mx-auto flex max-w-2xl items-center gap-2 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
                    <button onClick={() => (window.history.length > 1 ? router.back() : router.push('/bizkaibus/lines'))} aria-label="Volver" className="bt-press grid h-11 w-11 place-items-center rounded-full">
                        <ArrowLeft className="h-5 w-5" style={{ color: 'var(--ink)' }} />
                    </button>
                    <BusChip line={line.code} size="lg" />
                    <p className="min-w-0 flex-1 truncate text-[16px] font-bold tracking-[-0.01em]" style={{ color: 'var(--ink)' }}>{line.name}</p>
                    <NetworkBadge network="bizkaibus" />
                </div>
            </header>

            <main className="mx-auto max-w-2xl space-y-3 px-4 pt-4">
                <AlertsBanner alerts={alerts} title={`Avisos de ${line.code}`} />

                <SegmentedTabs
                    label="Vista de la línea"
                    value={tab}
                    onChange={setTab}
                    options={[
                        { id: 'stops', label: 'Paradas' },
                        { id: 'schedule', label: 'Horario' },
                    ]}
                />

                {tab === 'schedule' ? (
                    <ScheduleBody code={line.code} />
                ) : (
                    <>
                        {available.length > 1 && (
                            <SegmentedTabs
                                label="Sentido"
                                value={dir}
                                onChange={setDir}
                                options={available.map((d) => {
                                    const seq = line.directions[d];
                                    return { id: d, label: `Hacia ${titleCase(stripCode(seq[seq.length - 1].name)).slice(0, 22)}` };
                                })}
                            />
                        )}
                        <StopsList line={line} dir={dir} />
                    </>
                )}
            </main>
        </div>
    );
}
