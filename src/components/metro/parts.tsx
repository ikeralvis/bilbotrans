'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ChevronDown, CloudOff, Moon, Accessibility, RefreshCw, WifiOff } from 'lucide-react';
import type { DirectionGroup, Train } from '@/lib/metro/direction';
import type { TrainDelay } from '@/lib/metro/delay';
import { countdownParts, secondsUntil, wallToEpoch } from '@/lib/metro/time';

export const SPRING = { type: 'spring', stiffness: 380, damping: 32, mass: 0.8 } as const;
const EASE = [0.22, 1, 0.36, 1] as const;

/* ───────── Línea ───────── */
export function LineChip({ line, size = 'md' }: { line: string; size?: 'sm' | 'md' }) {
    const key = line === 'L1' ? 'l1' : line === 'L3' ? 'l3' : 'l2';
    const dims = size === 'sm' ? 'h-5 min-w-5 px-1.5 text-[11px]' : 'h-6 min-w-6 px-2 text-xs';
    return (
        <span
            className={`inline-flex items-center justify-center rounded-full font-bold tracking-tight ${dims}`}
            style={{ background: `var(--${key})`, color: `var(--${key}-ink)` }}
            aria-label={`Línea ${line.replace('L', '')}`}
        >
            {line}
        </span>
    );
}

/* ───────── En vivo ───────── */
function useNow(intervalMs = 1000) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), intervalMs);
        return () => clearInterval(id);
    }, [intervalMs]);
    return now;
}

const STALE_AFTER_S = 60;

export function ageLabel(secs: number) {
    if (secs < 5) return 'ahora';
    if (secs < 60) return `hace ${secs} s`;
    return `hace ${Math.floor(secs / 60)} min`;
}

/** Estado del dato + botón de actualizar. Pasa a ámbar si tiene más de 60 s o falla la red. */
export function LiveBadge({ fetchedAt, stale, refreshing, onRefresh }: { fetchedAt?: number; stale?: boolean; refreshing?: boolean; onRefresh?: () => void }) {
    const now = useNow();
    const secs = fetchedAt ? Math.max(0, Math.round((now - fetchedAt) / 1000)) : null;
    const old = Boolean(stale) || (secs !== null && secs > STALE_AFTER_S);
    const label = stale ? 'Sin conexión' : old ? 'Desactualizado' : 'Actualizado';
    return (
        <button
            type="button"
            onClick={onRefresh}
            disabled={!onRefresh || refreshing}
            aria-label="Actualizar datos"
            className="bt-press inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium"
            style={{ background: old ? 'color-mix(in srgb, var(--warn) 18%, var(--surface))' : 'var(--surface-2)', color: old ? 'var(--ink)' : 'var(--ink-2)' }}
        >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} style={{ color: old ? 'var(--warn)' : 'var(--ink-2)' }} aria-hidden />
            {label}
            {secs !== null && <span className="bt-num opacity-70">· {ageLabel(secs)}</span>}
        </button>
    );
}

/* ───────── Llegando (a 0 min): «Ya» con el tamaño del número ───────── */
function Arriving() {
    return (
        <span aria-label="Llegando ya">
            Ya
        </span>
    );
}

/* ───────── Minutos ───────── */
export function Minutes({ value, big = false, huge = false, large = false, compact = false, unit = 'min', live }: { value: number; big?: boolean; huge?: boolean; large?: boolean; compact?: boolean; unit?: 'min' | 's'; live?: boolean }) {
    const reduce = useReducedMotion();
    const now = value <= 0;
    return (
        <span className="relative inline-flex items-baseline justify-end overflow-hidden" aria-live={(live ?? (big || huge || large)) ? 'polite' : undefined}>
            <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                    key={unit === 's' ? 'seconds' : value}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
                    transition={{ duration: 0.18, ease: EASE }}
                    className={`bt-num font-bold ${huge ? 'text-[84px] leading-[0.9] tracking-[-0.03em]' : large ? 'text-[56px] leading-[0.9] tracking-[-0.03em]' : big ? 'text-[44px] leading-none' : compact ? 'text-[15px] leading-5' : 'text-xl leading-6'}`}
                    style={{ color: now ? 'var(--accent)' : 'var(--ink)' }}
                >
                    {now ? <Arriving /> : value}
                </motion.span>
            </AnimatePresence>
            {!now && (
                <span className={`ml-1 font-medium ${huge ? 'text-xl' : large ? 'text-lg' : big ? 'text-base' : 'text-xs'}`} style={{ color: 'var(--ink-2)' }}>
                    {unit}
                </span>
            )}
        </span>
    );
}

/* ───────── Cuenta atrás en segundos (sin pedir datos: usa la hora prevista del tren) ───────── */
export function Countdown({ time, fallbackMinutes, size = 'huge' }: { time: string; fallbackMinutes: number; size?: 'huge' | 'lg' }) {
    const now = useNow(1000);
    const secs = Number.isNaN(wallToEpoch(time)) ? fallbackMinutes * 60 : secondsUntil(time, now);
    const { minutes, seconds, arriving } = countdownParts(secs);
    const big = { huge: size === 'huge', large: size === 'lg' };
    if (arriving) return <Minutes value={0} {...big} />;
    // Los segundos solo aparecen cuando falta menos de un minuto: antes serían ruido.
    if (minutes === 0) return <Minutes value={seconds} unit="s" live={false} {...big} />;
    return <Minutes value={minutes} {...big} />;
}

/* ───────── Fila de tren ───────── */
export function TrainRow({ train, featured }: { train: Train; featured?: boolean }) {
    const clock = train.time.slice(11, 16);
    return (
        <div
            className={`flex items-center gap-3 ${featured ? 'rounded-[16px] px-3.5 py-3' : 'px-3.5 py-2.5'}`}
            style={featured ? { background: 'var(--surface-2)' } : undefined}
        >
            <LineChip line={train.line} />
            <div className="min-w-0 flex-1">
                <p className={`truncate font-semibold ${featured ? 'text-xl font-bold tracking-[-0.02em]' : 'text-[15px]'}`} style={{ color: 'var(--ink)' }}>
                    {train.destination}
                </p>
                <p className="bt-num text-xs" style={{ color: 'var(--ink-2)' }}>
                    {clock} · {train.wagons} coches
                </p>
            </div>
            {featured ? <Countdown time={train.time} fallbackMinutes={train.minutes} size="lg" /> : <Minutes value={train.minutes} />}
        </div>
    );
}

/* ───────── Grupo por sentido ───────── */
/** Trenes visibles por andén antes de "Ver más". */
const VISIBLE_PER_PLATFORM = 3;

export function DirectionSection({ group, index = 0, empty }: { group: DirectionGroup; index?: number; empty?: string }) {
    const [first, ...rest] = group.trains;
    const [expanded, setExpanded] = useState(false);
    const visible = expanded ? rest : rest.slice(0, VISIBLE_PER_PLATFORM - 1);
    const hidden = rest.length - visible.length;
    return (
        <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING, delay: index * 0.05 }}
            className="bt-card p-2"
            aria-label={group.label}
        >
            <header className="flex items-center justify-between px-3.5 pb-2 pt-3">
                <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--ink-2)' }}>
                    <span style={{ color: 'var(--ink)' }}>{group.label}</span>
                </h2>
            </header>
            {first ? (
                <div className="flex flex-col">
                    <TrainRow train={first} featured />
                    <AnimatePresence initial={false}>
                        {visible.map((t, i) => (
                            <motion.div
                                key={`${t.line}-${t.destination}-${t.time}`}
                                layout="position"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.18, delay: i * 0.03 }}
                            >
                                <TrainRow train={t} />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    {(hidden > 0 || expanded) && rest.length > VISIBLE_PER_PLATFORM - 1 && (
                        <button
                            type="button"
                            onClick={() => setExpanded((e) => !e)}
                            aria-expanded={expanded}
                            className="bt-press mx-auto mt-1 flex min-h-11 items-center gap-1 rounded-full px-4 text-sm font-semibold"
                            style={{ color: 'var(--ink-2)' }}
                        >
                            {expanded ? 'Ver menos' : `Ver ${hidden} más`}
                            <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden />
                        </button>
                    )}
                </div>
            ) : (
                <div className="flex flex-col items-center gap-1 px-4 py-8 text-center">
                    <Moon className="h-6 w-6" style={{ color: 'var(--ink-2)' }} aria-hidden />
                    <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                        Sin trenes ahora
                    </p>
                    <p className="text-xs" style={{ color: 'var(--ink-2)' }}>
                        {empty ?? 'No hay próximas llegadas en este sentido.'}
                    </p>
                </div>
            )}
        </motion.section>
    );
}

/* ───────── Estados vacíos y de error ───────── */

/** Hora actual de Bilbao (0-23). */
function madridHour() {
    return Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', hour: '2-digit', hourCycle: 'h23' }).format(new Date()));
}

/** De madrugada es normal que no haya trenes (entre semana el metro cierra por la noche). */
export function isOvernight() {
    return madridHour() < 6;
}

export function StateCard({
    icon,
    title,
    message,
    onRetry,
    retrying,
    actionLabel = 'Reintentar',
}: {
    icon: ReactNode;
    title: string;
    message?: string;
    onRetry?: () => void;
    retrying?: boolean;
    actionLabel?: string;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={SPRING}
            className="bt-card flex flex-col items-center gap-2 px-6 py-9 text-center"
            role="status"
        >
            <span className="mb-1 grid h-12 w-12 place-items-center rounded-full" style={{ background: 'var(--surface-2)' }} aria-hidden>
                {icon}
            </span>
            <p className="text-[17px] font-semibold" style={{ color: 'var(--ink)' }}>{title}</p>
            {message && <p className="max-w-xs text-sm leading-5" style={{ color: 'var(--ink-2)' }}>{message}</p>}
            {onRetry && (
                <button
                    type="button"
                    onClick={onRetry}
                    disabled={retrying}
                    className="bt-press mt-2 inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold text-white"
                    style={{ background: 'var(--accent)' }}
                >
                    <RefreshCw className={`h-4 w-4 ${retrying ? 'animate-spin' : ''}`} aria-hidden />
                    {actionLabel}
                </button>
            )}
        </motion.div>
    );
}

/** Sin datos y sin red (o el servicio de Metro no responde). */
export function ErrorState({ offline, onRetry, retrying, service = 'Metro Bilbao', live = 'los trenes' }: { offline: boolean; onRetry?: () => void; retrying?: boolean; service?: string; live?: string }) {
    return (
        <StateCard
            icon={offline ? <WifiOff className="h-6 w-6" style={{ color: 'var(--ink-2)' }} /> : <CloudOff className="h-6 w-6" style={{ color: 'var(--ink-2)' }} />}
            title={offline ? 'Sin conexión' : 'No se pudo cargar'}
            message={offline ? `Conéctate para ver ${live} en directo.` : `El servicio de ${service} no responde ahora. Lo seguimos intentando.`}
            onRetry={onRetry}
            retrying={retrying}
        />
    );
}

/** Ningún tren previsto: de madrugada se explica, de día se invita a mirar el horario. */
export function NoTrainsState({ onTimetable }: { onTimetable?: () => void }) {
    const night = isOvernight();
    return (
        <StateCard
            icon={<Moon className="h-6 w-6" style={{ color: 'var(--ink-2)' }} />}
            title={night ? 'Metro cerrado por la noche' : 'Sin trenes previstos ahora'}
            message={night ? 'Entre semana el servicio cierra de madrugada. Mira el horario del primer tren.' : 'No hay próximas llegadas. Puede ser un corte puntual: revisa los avisos o el horario.'}
            onRetry={onTimetable}
            actionLabel="Ver horario"
        />
    );
}

/** Aviso fijo cuando el dispositivo no tiene red o el dato es antiguo. */
export function OfflineBanner({ offline, lastAt }: { offline: boolean; lastAt?: number }) {
    const [now] = useState(() => Date.now());
    if (!offline && !lastAt) return null;
    const mins = lastAt ? Math.max(1, Math.round((now - lastAt) / 60_000)) : null;
    return (
        <div className="flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm" style={{ background: 'color-mix(in srgb, var(--warn) 16%, var(--surface))', color: 'var(--ink)' }} role="status">
            <WifiOff className="h-4 w-4 shrink-0" style={{ color: 'var(--warn)' }} aria-hidden />
            <p>
                {offline ? 'Sin conexión. ' : ''}
                {mins ? `Último dato guardado hace ${mins} min: las horas pueden haber cambiado.` : 'Los datos pueden estar desactualizados.'}
            </p>
        </div>
    );
}

/** Trenes del último dato guardado: solo horas, sin cuenta atrás (ya no serían correctas). */
export function SavedTrains({ groups }: { groups: Array<{ label: string; trains: Array<{ line: string; destination: string; time: string }> }> }) {
    return (
        <div className="space-y-3">
            {groups
                .filter((g) => g.trains.length > 0)
                .map((g) => (
                    <section key={g.label} className="bt-card p-2" aria-label={g.label}>
                        <h2 className="px-3.5 pb-1 pt-3 text-[13px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--ink)' }}>{g.label}</h2>
                        {g.trains.slice(0, 4).map((t, i) => (
                            <div key={i} className="flex items-center gap-3 px-3.5 py-2.5">
                                <LineChip line={t.line} />
                                <p className="min-w-0 flex-1 truncate text-[15px] font-semibold" style={{ color: 'var(--ink)' }}>{t.destination}</p>
                                <span className="bt-num text-[17px] font-semibold" style={{ color: 'var(--ink-2)' }}>{t.time.slice(11, 16)}</span>
                            </div>
                        ))}
                    </section>
                ))}
        </div>
    );
}

/* ───────── Skeleton ───────── */
export function GroupSkeleton() {
    return (
        <div className="bt-card space-y-2 p-2" aria-hidden>
            <div className="bt-skeleton mx-3.5 mt-3 h-3 w-40" />
            <div className="bt-skeleton h-[76px]" />
            <div className="bt-skeleton h-12" />
            <div className="bt-skeleton h-12" />
        </div>
    );
}

/* ───────── Skeleton del tren destacado + siguientes ───────── */
export function HeroSkeleton() {
    return (
        <div className="space-y-3" aria-hidden>
            <div className="bt-card p-5">
                <div className="bt-skeleton h-3 w-44" />
                <div className="mt-4 flex items-end justify-between gap-4">
                    <div className="flex-1 space-y-2.5">
                        <div className="bt-skeleton h-7 w-3/4" />
                        <div className="bt-skeleton h-3.5 w-1/2" />
                    </div>
                    <div className="bt-skeleton h-[76px] w-24" />
                </div>
                <div className="bt-skeleton mt-4 h-7 w-24 rounded-full" />
            </div>
            <div className="bt-card space-y-2 p-3">
                <div className="bt-skeleton h-12" />
                <div className="bt-skeleton h-12" />
                <div className="bt-skeleton h-12" />
            </div>
        </div>
    );
}

/* ───────── Disclosure animado ───────── */
export function Disclosure({ title, icon, children, defaultOpen = false }: { title: string; icon?: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="bt-card overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                className="bt-press flex min-h-12 w-full items-center gap-3 px-4 py-3 text-left"
            >
                {icon}
                <span className="flex-1 text-[15px] font-semibold" style={{ color: 'var(--ink)' }}>
                    {title}
                </span>
                <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="h-4 w-4" style={{ color: 'var(--ink-2)' }} aria-hidden />
                </motion.span>
            </button>
            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: EASE }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4">{children}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function Pill({ label, children }: { label: string; children: ReactNode }) {
    return (
        <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
            style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}
        >
            {children}
            {label}
        </span>
    );
}

export function ExitBadges({ elevator, nocturnal, accessible }: { elevator: boolean; nocturnal: boolean; accessible?: boolean }) {
    return (
        <span className="flex shrink-0 gap-1">
            {elevator && (
                <Pill label="Ascensor">
                    <Accessibility className="h-3 w-3" aria-hidden />
                </Pill>
            )}
            {nocturnal && (
                <Pill label="Nocturno">
                    <Moon className="h-3 w-3" aria-hidden />
                </Pill>
            )}
            {accessible && !elevator && (
                <Pill label="Accesible">
                    <Accessibility className="h-3 w-3" aria-hidden />
                </Pill>
            )}
        </span>
    );
}

/* ───────── Retraso frente al horario programado ───────── */
export function DelayBadge({ delay }: { delay: TrainDelay | null | undefined }) {
    if (!delay) return null;
    const late = delay.state === 'late';
    const early = delay.state === 'early';
    const label = late ? `+${delay.minutes} min de retraso` : early ? `${delay.minutes} min antes` : 'En hora';
    const color = late ? 'var(--warn)' : early ? 'var(--ink-2)' : 'var(--live)';
    return (
        <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{ background: `color-mix(in srgb, ${color} 16%, var(--surface))`, color: 'var(--ink)' }}
        >
            <span className="h-2 w-2 rounded-full" style={{ background: color }} aria-hidden />
            {label}
            {(late || early) && <span className="bt-num font-medium" style={{ color: 'var(--ink-2)' }}>· previsto {delay.scheduled}</span>}
        </span>
    );
}
