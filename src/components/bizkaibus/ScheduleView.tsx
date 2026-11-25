'use client';

import { Fragment, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Info } from 'lucide-react';
import { isToday, parseSchedule, type ParsedSchedule, type ScheduleGroup, type ScheduleLine } from '@/lib/bizkaibus/scheduleText';
import type { ScheduleSeason } from '@/lib/bizkaibus/types';
import { SPRING } from '@/components/metro/parts';
import { SegmentedTabs } from '@/components/metro/ui';
import { titleCase } from './ui';

const TIME_ONLY_RE = /^\d{1,2}:\d{2}\*?$/;

/** Minutos desde medianoche en Bilbao. */
function minutesNow(now: number) {
    const [h, m] = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now).split(':');
    return Number(h) * 60 + Number(m);
}
const toMinutes = (t: string) => {
    const [h, m] = t.replace('*', '').split(':');
    return Number(h) * 60 + Number(m);
};

/** Texto libre con las horas resaltadas. */
function Highlighted({ text }: { text: string }) {
    const parts = text.split(/(\d{1,2}:\d{2}\*?)/g);
    return (
        <>
            {parts.map((p, i) =>
                TIME_ONLY_RE.test(p) ? (
                    <strong key={i} className="bt-num font-semibold" style={{ color: 'var(--ink)' }}>{p}</strong>
                ) : (
                    <Fragment key={i}>{p}</Fragment>
                ),
            )}
        </>
    );
}

function Line({ line, upcoming }: { line: ScheduleLine; upcoming: number | null }) {
    if (line.kind === 'ranges') {
        return (
            <ul className="space-y-1.5">
                {line.ranges.map((r, i) => (
                    <li key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="bt-num inline-flex items-center gap-1.5 text-[19px] font-bold tracking-[-0.01em]" style={{ color: 'var(--ink)' }}>
                            {r.from}
                            <ArrowRight className="h-4 w-4" style={{ color: 'var(--ink-2)' }} aria-label="hasta" />
                            {r.to}
                        </span>
                        {r.every && (
                            <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: 'color-mix(in srgb, var(--accent) 16%, var(--surface))', color: 'var(--ink)' }}>
                                {r.every}
                            </span>
                        )}
                    </li>
                ))}
            </ul>
        );
    }
    if (line.kind === 'times') {
        return (
            <ul className="flex flex-wrap gap-1.5" aria-label="Horas de salida">
                {line.times.map((t, i) => {
                    const next = upcoming !== null && toMinutes(t) === upcoming;
                    const past = upcoming !== null && toMinutes(t) < upcoming;
                    return (
                        <li
                            key={`${t}-${i}`}
                            className="bt-num rounded-lg px-2.5 py-1 text-[15px] font-semibold"
                            style={{
                                background: next ? 'var(--accent)' : 'var(--surface-2)',
                                color: next ? '#fff' : past ? 'var(--ink-2)' : 'var(--ink)',
                                opacity: past ? 0.6 : 1,
                            }}
                        >
                            {t}
                        </li>
                    );
                })}
            </ul>
        );
    }
    return (
        <p className="text-sm leading-6" style={{ color: 'var(--ink-2)' }}>
            <Highlighted text={line.text} />
        </p>
    );
}

function Group({ group, today, nowMin }: { group: ScheduleGroup; today: boolean; nowMin: number }) {
    const noService = group.lines.length > 0 && group.lines.every((l) => l.kind === 'text' && /no hay servicio/i.test(l.text));
    // La próxima salida de hoy: la primera hora suelta que aún no ha pasado.
    const upcoming = useMemo(() => {
        if (!today) return null;
        const all = group.lines.flatMap((l) => (l.kind === 'times' ? l.times.map(toMinutes) : []));
        return all.find((m) => m >= nowMin) ?? null;
    }, [group, today, nowMin]);

    return (
        <section
            className="rounded-2xl p-4"
            style={{ background: today ? 'color-mix(in srgb, var(--accent) 8%, var(--surface-2))' : 'var(--surface-2)', boxShadow: today ? 'inset 3px 0 0 var(--accent)' : undefined }}
            aria-label={group.label || 'Horario'}
        >
            {(group.label || today) && (
                <header className="mb-2.5 flex items-center gap-2">
                    {group.label && <h4 className="text-[13px] font-bold uppercase tracking-[0.06em]" style={{ color: 'var(--ink)' }}>{group.label}</h4>}
                    {today && <span className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white" style={{ background: 'var(--accent)' }}>Hoy</span>}
                </header>
            )}
            {noService ? (
                <p className="text-sm" style={{ color: 'var(--ink-2)' }}>Sin servicio</p>
            ) : (
                <div className="space-y-2.5">
                    {group.lines.map((l, i) => <Line key={i} line={l} upcoming={upcoming} />)}
                </div>
            )}
        </section>
    );
}

function Direction({ parsed, nowMin, now }: { parsed: ParsedSchedule; nowMin: number; now: number }) {
    return (
        <div className="space-y-3">
            {parsed.groups.map((g, i) => <Group key={`${g.label}-${i}`} group={g} today={isToday(g.label, new Date(now))} nowMin={nowMin} />)}
            {parsed.notes.length > 0 && (
                <ul className="space-y-1.5 px-1">
                    {parsed.notes.map((n, i) => (
                        <li key={i} className="flex gap-2 text-[13px] leading-5" style={{ color: 'var(--ink-2)' }}>
                            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                            <span><Highlighted text={n} /></span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

/** Una temporada: ida y vuelta como pestañas, tipos de día como tarjetas y "Hoy" resaltado. */
export function SeasonSchedule({ season }: { season: ScheduleSeason }) {
    const [now] = useState(() => Date.now());
    const nowMin = minutesNow(now);
    const sides = useMemo(
        () =>
            [season.outbound, season.inbound]
                .map((text, i) => ({ text, parsed: parseSchedule(text), fallback: i === 0 ? 'Ida' : 'Vuelta' }))
                .filter((s) => s.text.trim()),
        [season],
    );
    const [tab, setTab] = useState(0);
    const current = sides[Math.min(tab, sides.length - 1)];

    if (sides.length === 0) return <p className="text-sm" style={{ color: 'var(--ink-2)' }}>Sin horario en texto para esta temporada.</p>;

    const label = (s: (typeof sides)[number]) => (s.parsed.origin ? `Desde ${titleCase(s.parsed.origin)}`.slice(0, 26) : s.fallback);
    return (
        <div className="space-y-3">
            {sides.length > 1 && (
                <SegmentedTabs label="Sentido del horario" value={String(tab)} onChange={(v) => setTab(Number(v))} options={sides.map((s, i) => ({ id: String(i), label: label(s) }))} />
            )}
            <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={SPRING}>
                {sides.length === 1 && current.parsed.origin && (
                    <h3 className="mb-2 px-1 text-[15px] font-bold" style={{ color: 'var(--ink)' }}>Salidas de {titleCase(current.parsed.origin)}</h3>
                )}
                {current.parsed.groups.length === 0 && current.parsed.notes.length === 0 ? (
                    <p className="whitespace-pre-line text-sm leading-6" style={{ color: 'var(--ink-2)' }}>{current.text}</p>
                ) : (
                    <Direction parsed={current.parsed} nowMin={nowMin} now={now} />
                )}
            </motion.div>
        </div>
    );
}
