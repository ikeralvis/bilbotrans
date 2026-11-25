'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { ArrowLeft, ChevronRight, CloudOff, ExternalLink, Search, X } from 'lucide-react';
import { getBbStop } from '@/lib/bilbobus/catalog';
import { normalize } from '@/lib/shared/textGeo';
import { refreshBilbobusLive, useBbLine } from '@/lib/bilbobus/hooks';
import type { BbDirection, BbLine, BbLineDetail } from '@/lib/bilbobus/types';
import { LiveBadge, Minutes, SPRING, StateCard } from '@/components/metro/parts';
import { SegmentedTabs } from '@/components/metro/ui';
import { BbChip, RefreshNote, titleCase } from './BbUi';
import { NetworkBadge } from '@/components/shared/brand';

const officialUrl = (code: string) => `https://www.bilbao.eus/cs/Satellite/bilbobus/es/linea?codLinea=${encodeURIComponent(code)}`;

/** Minutos en una parada de la línea: el servicio solo da un valor por parada. */
function StopWait({ minutes, loading }: { minutes: number | null | undefined; loading: boolean }) {
    if (loading) return <span className="bt-skeleton h-6 w-10" aria-hidden />;
    if (minutes === undefined || minutes === null) return <span className="text-sm" style={{ color: 'var(--ink-2)' }} aria-label="Sin información">—</span>;
    return <Minutes value={minutes} />;
}

/** "IGNACIO ELLACURÍA / ELORRIETA" → "Ignacio Ellacuría"; "GRAN VÍA  2" → "Gran Vía". Las pestañas son estrechas. */
const directionLabel = (name: string) => titleCase(name.split('/')[0]).replace(/\s+(\d+|fte\.?.*)$/i, '').trim().slice(0, 20);

interface Row {
    code: string;
    name: string;
}

/** Otras líneas que paran en esta parada (correspondencias), sin la propia. */
const transfers = (stopCode: string, own: BbLine) => (getBbStop(stopCode)?.lines ?? []).filter((l) => l !== own.code);

function StopsList({ rows, line, minutes, loading, filtering }: { rows: Row[]; line: BbLine; minutes: Record<string, number | null> | undefined; loading: boolean; filtering: boolean }) {
    return (
        <motion.ol initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={SPRING} className="bt-card px-2 py-3" aria-label="Paradas del recorrido">
            {rows.map((r, i) => {
                const first = i === 0;
                const last = i === rows.length - 1;
                const end = first || last;
                const m = minutes?.[r.code];
                const soon = typeof m === 'number' && m <= 1;
                return (
                    <li key={`${r.code}-${i}`}>
                        <Link href={`/bilbobus/stop/${r.code}`} className="bt-press flex min-h-[60px] items-center gap-3 rounded-xl px-3 hover:bg-[var(--surface-2)]">
                            <span className="relative flex w-4 shrink-0 justify-center self-stretch" aria-hidden>
                                {!filtering && !first && <span className="absolute bottom-1/2 top-0 w-[3px]" style={{ background: 'color-mix(in srgb, var(--accent) 35%, var(--surface))' }} />}
                                {!filtering && !last && <span className="absolute bottom-0 top-1/2 w-[3px]" style={{ background: 'color-mix(in srgb, var(--accent) 35%, var(--surface))' }} />}
                                <span
                                    className="relative z-10 my-auto rounded-full"
                                    style={
                                        end
                                            ? { width: 16, height: 16, background: 'var(--accent)', boxShadow: '0 0 0 4px color-mix(in srgb, var(--accent) 25%, var(--surface))' }
                                            : soon
                                              ? { width: 13, height: 13, background: 'var(--accent)' }
                                              : { width: 11, height: 11, background: 'var(--surface)', border: '3px solid var(--accent)' }
                                    }
                                />
                            </span>
                            <span className="min-w-0 flex-1 py-2">
                                <span className="block text-[16px] leading-5" style={{ color: 'var(--ink)', fontWeight: end ? 700 : 600 }}>{titleCase(r.name)}</span>
                                <span className="bt-num mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-5" style={{ color: 'var(--ink-2)' }}>
                                    <span>{first ? 'Origen · ' : last ? 'Destino · ' : ''}parada {r.code}</span>
                                    {transfers(r.code, line).length > 0 && (
                                        <span className="flex flex-wrap items-center gap-1" aria-label={`Correspondencia con: ${transfers(r.code, line).join(', ')}`}>
                                            {transfers(r.code, line).slice(0, 4).map((l) => <BbChip key={l} line={l} size="sm" />)}
                                            {transfers(r.code, line).length > 4 && <span className="text-[11px] font-semibold">+{transfers(r.code, line).length - 4}</span>}
                                        </span>
                                    )}
                                </span>
                            </span>
                            <StopWait minutes={m} loading={loading} />
                            <ChevronRight className="h-4 w-4 shrink-0" style={{ color: 'var(--ink-2)' }} aria-hidden />
                        </Link>
                    </li>
                );
            })}
        </motion.ol>
    );
}

export function BbLineView({ line, detail }: { line: BbLine; detail: BbLineDetail | null }) {
    const router = useRouter();
    const dirs = (['0', '1'] as BbDirection[]).filter((d) => detail?.directions[d]?.length);
    const [dir, setDir] = useState<BbDirection>(dirs[0] ?? '0');
    const [q, setQ] = useState('');
    const { data, error, isLoading, isValidating } = useBbLine(line.code);

    const rows: Row[] = useMemo(() => detail?.directions[dir] ?? [], [detail, dir]);
    const filtering = q.trim() !== '';
    const visible = useMemo(() => {
        const n = normalize(q);
        return filtering ? rows.filter((r) => normalize(`${r.name} ${r.code}`).includes(n)) : rows;
    }, [rows, q, filtering]);

    // Paradas que el servicio de tiempos conoce pero el recorrido más habitual no incluye (variantes de la línea).
    const extras = useMemo(() => {
        if (!data || !detail) return [];
        const known = new Set(Object.values(detail.directions).flatMap((s) => (s ?? []).map((x) => x.code)));
        return Object.keys(data.minutes)
            .filter((c) => !known.has(c))
            .map((c) => ({ code: c, name: getBbStop(c)?.name ?? c }));
    }, [data, detail]);

    const active = data ? Object.keys(data.minutes).length > 0 : null;
    const nearest = data
        ? Object.values(data.minutes).filter((m): m is number => m !== null).sort((a, b) => a - b)[0]
        : undefined;

    return (
        <div className="min-h-dvh pb-[max(2rem,env(safe-area-inset-bottom))]" style={{ background: 'var(--bg)', ...(line.color ? ({ '--accent': line.color } as React.CSSProperties) : {}) }}>
            <header className="bt-glass sticky top-0 z-20 border-b" style={{ borderColor: 'var(--hairline)' }}>
                <div className="mx-auto flex max-w-2xl items-center gap-2 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
                    <button onClick={() => (window.history.length > 1 ? router.back() : router.push('/bilbobus/lines'))} aria-label="Volver" className="bt-press grid h-11 w-11 place-items-center rounded-full">
                        <ArrowLeft className="h-5 w-5" style={{ color: 'var(--ink)' }} />
                    </button>
                    <BbChip line={line.code} size="lg" />
                    <p className="min-w-0 flex-1 truncate text-[16px] font-bold tracking-[-0.01em]" style={{ color: 'var(--ink)' }}>{titleCase(line.name)}</p>
                    <NetworkBadge network="bilbobus" />
                </div>
            </header>

            <main className="mx-auto max-w-2xl space-y-3 px-4 pt-4">
                <div className="flex flex-wrap items-center gap-2">
                    <LiveBadge fetchedAt={data?.fetchedAt} stale={Boolean(error)} refreshing={isValidating} onRefresh={() => refreshBilbobusLive()} />
                    {/* Reserva el sitio mientras carga: si la fila crece después, el indicador animado de las pestañas se queda desplazado. */}
                    {!data && !error && <span className="bt-skeleton h-7 w-52 rounded-full" aria-hidden />}
                    {active === false && (
                        <span className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: 'color-mix(in srgb, var(--warn) 18%, var(--surface))', color: 'var(--ink)' }}>Sin servicio ahora</span>
                    )}
                    {active && nearest !== undefined && (
                        <span className="bt-num rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}>
                            Bus más cercano a una parada: {nearest === 0 ? 'llegando' : `${nearest} min`}
                        </span>
                    )}
                </div>

                {!detail ? (
                    <StateCard
                        icon={<Search className="h-6 w-6" style={{ color: 'var(--ink-2)' }} />}
                        title="Sin recorrido publicado"
                        message="Esta línea especial (refuerzo, nocturno o turístico) no trae recorrido en los datos abiertos. Consulta su ficha oficial."
                    />
                ) : (
                    <>
                        {dirs.length > 1 && (
                            <SegmentedTabs
                                label="Sentido"
                                value={dir}
                                onChange={setDir}
                                options={dirs.map((d) => {
                                    const seq = detail.directions[d]!;
                                    return { id: d, label: `→ ${directionLabel(detail.terminals?.[d] ?? seq[seq.length - 1].name)}` };
                                })}
                            />
                        )}

                        {error && !data && (
                            <div className="flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm" style={{ background: 'color-mix(in srgb, var(--warn) 16%, var(--surface))', color: 'var(--ink)' }} role="status">
                                <CloudOff className="h-4 w-4 shrink-0" style={{ color: 'var(--warn)' }} aria-hidden />
                                <p>No se pudieron cargar los tiempos de espera. Se muestra el recorrido.</p>
                            </div>
                        )}

                        {rows.length > 12 && (
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

                        <p className="px-1 text-[13px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--ink-2)' }}>
                            {rows.length} paradas · minutos hasta el próximo bus
                        </p>

                        {visible.length === 0 ? (
                            <StateCard icon={<Search className="h-6 w-6" style={{ color: 'var(--ink-2)' }} />} title="Ninguna parada coincide" message="Prueba con otra parte del nombre." />
                        ) : (
                            <StopsList key={dir} rows={visible} line={line} minutes={data?.minutes} loading={isLoading && !data} filtering={filtering} />
                        )}

                        {extras.length > 0 && !filtering && (
                            <section className="space-y-2" aria-label="Paradas de variantes">
                                <h2 className="px-1 text-[13px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--ink-2)' }}>Paradas de variantes del recorrido</h2>
                                <StopsList rows={extras} line={line} minutes={data?.minutes} loading={false} filtering />
                            </section>
                        )}
                    </>
                )}

                <a href={officialUrl(line.code)} target="_blank" rel="noopener noreferrer" className="bt-card bt-press flex min-h-12 items-center gap-3 px-4 py-3 text-[15px] font-semibold" style={{ color: 'var(--ink)' }}>
                    <ExternalLink className="h-4 w-4" style={{ color: 'var(--accent)' }} aria-hidden />
                    Ficha oficial y horarios en bilbao.eus
                </a>
                <RefreshNote />
            </main>
        </div>
    );
}
