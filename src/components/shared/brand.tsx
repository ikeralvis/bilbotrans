'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Bus, BusFront, ChevronLeft, TrainFront, TrainFrontTunnel, TramFront, type LucideIcon } from 'lucide-react';

/* ───────── Distintivos de red ─────────
 * BilboTrans no usa los logotipos de los operadores: cada red se identifica con un círculo de su color
 * con el icono de su tipo de vehículo, y con su nombre escrito en texto. */

export type NetworkId = 'metro' | 'bilbobus' | 'bizkaibus' | 'renfe' | 'euskotren' | 'tranvia-bilbao' | 'tranvia-vitoria';

interface MarkDef {
    /** Icono del tipo de vehículo. */
    Icon: LucideIcon;
    /** Color de la red, de fondo del círculo. */
    color: string;
    label: string;
}

export const MARKS: Record<NetworkId, MarkDef> = {
    metro: { Icon: TrainFrontTunnel, color: '#d93e14', label: 'Metro Bilbao' },
    bizkaibus: { Icon: Bus, color: '#22533d', label: 'Bizkaibus' },
    bilbobus: { Icon: BusFront, color: '#c22629', label: 'Bilbobus' },
    renfe: { Icon: TrainFront, color: '#74349a', label: 'Renfe Cercanías' },
    euskotren: { Icon: TrainFront, color: '#0a4a9c', label: 'Euskotren' },
    'tranvia-bilbao': { Icon: TramFront, color: '#2a7d26', label: 'Tranvía de Bilbao' },
    'tranvia-vitoria': { Icon: TramFront, color: '#427a1b', label: 'Tranvía de Vitoria-Gasteiz' },
};

/** Home de cada red cuando no es `/{red}`. */
const HOME: Partial<Record<NetworkId, string>> = { 'tranvia-bilbao': '/euskotren/tranvia-bilbao', 'tranvia-vitoria': '/euskotren/tranvia-vitoria' };

/**
 * Distintivo de una red: círculo de su color con el icono de su vehículo. `inverse` lo pinta en blanco con el icono
 * del color de la red, para ponerlo sobre una cabecera que ya es de ese color. `muted` lo apaga (redes aún no disponibles).
 */
export function NetworkMark({ network, size = 40, inverse = false, muted = false, decorative = false, className = '' }: { network: NetworkId; size?: number; inverse?: boolean; muted?: boolean; /** Ya hay un texto con el nombre al lado: el distintivo no se anuncia. */ decorative?: boolean; className?: string }) {
    const { Icon, color, label } = MARKS[network];
    const icon = Math.round(size * 0.52);
    return (
        <span
            role={decorative ? undefined : 'img'}
            aria-label={decorative ? undefined : label}
            aria-hidden={decorative || undefined}
            className={`bt-mark inline-grid shrink-0 select-none place-items-center rounded-full ${className}`}
            style={{
                width: size,
                height: size,
                background: inverse ? '#ffffff' : muted ? 'var(--surface-2)' : color,
                color: inverse ? color : muted ? 'var(--ink-2)' : '#ffffff',
                boxShadow: muted ? 'inset 0 0 0 1.5px var(--hairline)' : inverse ? undefined : 'inset 0 0 0 1px var(--hairline)',
            }}
        >
            <Icon width={icon} height={icon} strokeWidth={size >= 36 ? 2 : 2.25} aria-hidden />
        </span>
    );
}

/**
 * Cabecera de color de una red: botón para volver a todas las redes, distintivo y nombre de la red,
 * acciones a la derecha y, debajo, el vehículo animado.
 */
export function NetworkHero({ network, actions, children }: { network: NetworkId; actions?: ReactNode; children?: ReactNode }) {
    return (
        <header className="relative overflow-hidden rounded-b-[28px]" style={{ background: 'linear-gradient(160deg, var(--brand), var(--brand-2))', color: 'var(--brand-ink)' }}>
            <div className="mx-auto flex max-w-2xl items-center gap-2 px-3 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))]">
                <Link href="/" aria-label="Todas las redes" className="bt-press grid h-11 w-11 shrink-0 place-items-center rounded-full text-white transition-colors duration-150 hover:bg-white/15">
                    <ChevronLeft className="h-6 w-6" strokeWidth={2} aria-hidden />
                </Link>
                <h1 className="m-0 flex min-w-0 items-center gap-2.5">
                    <NetworkMark network={network} size={34} inverse decorative />
                    <span className="truncate text-[21px] font-bold leading-none tracking-[-0.02em] text-white">{MARKS[network].label}</span>
                </h1>
                <div className="flex-1" />
                {actions}
            </div>
            {children}
        </header>
    );
}

/** Botón redondo translúcido para las acciones de una cabecera de color. */
export function HeroAction({ href, label, children }: { href: string; label: string; children: ReactNode }) {
    return (
        <Link href={href} aria-label={label} className="bt-press grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white transition-colors duration-150 hover:bg-white/25">
            {children}
        </Link>
    );
}

/** Distintivo pequeño de la red en las cabeceras interiores; lleva a la home de esa red. */
export function NetworkBadge({ network }: { network: NetworkId }) {
    return (
        <Link href={HOME[network] ?? `/${network}`} aria-label={`Inicio de ${MARKS[network].label}`} className="bt-press relative shrink-0 before:absolute before:-inset-2 before:content-['']">
            <NetworkMark network={network} size={30} />
        </Link>
    );
}
/* ───────── Autobús animado ───────── */

/** Autobús urbano de perfil (dibujo propio). `facing` es hacia dónde mira. */
export function BusIllustration({ color, height = 44, facing = 'left', spin = true }: { color: string; height?: number; facing?: 'left' | 'right'; spin?: boolean }) {
    const reduce = useReducedMotion();
    const wheel = (cx: number) => (
        <g>
            <circle cx={cx} cy={57} r={9.5} fill="#1b1b1f" />
            <motion.g
                animate={reduce || !spin ? undefined : { rotate: 360 }}
                transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            >
                <circle cx={cx} cy={57} r={5.2} fill="#9a9aa3" />
                <rect x={cx - 0.9} y={52} width={1.8} height={10} fill="#5b5b63" />
                <rect x={cx - 5} y={56.1} width={10} height={1.8} fill="#5b5b63" />
            </motion.g>
        </g>
    );
    return (
        <svg viewBox="0 0 200 68" height={height} width={(height * 200) / 68} aria-hidden style={{ display: 'block', transform: facing === 'left' ? 'scaleX(-1)' : undefined, overflow: 'visible' }}>
            {/* carrocería */}
            <rect x={4} y={6} width={188} height={50} rx={11} fill={color} />
            <rect x={4} y={40} width={188} height={16} rx={8} fill="#000" opacity={0.16} />
            <rect x={4} y={34} width={188} height={3} fill="#fff" opacity={0.35} />
            {/* ventanas */}
            {[14, 44, 74, 104].map((x) => (
                <rect key={x} x={x} y={13} width={25} height={19} rx={3.5} fill="#dcebf7" opacity={0.95} />
            ))}
            {/* puerta */}
            <rect x={136} y={11} width={22} height={39} rx={3} fill="#dcebf7" opacity={0.95} />
            <rect x={146.4} y={11} width={1.6} height={39} fill={color} opacity={0.7} />
            {/* parabrisas y faro */}
            <path d="M164 13h20a8 8 0 0 1 8 8v13h-28z" fill="#dcebf7" opacity={0.95} />
            <rect x={178} y={40} width={11} height={5} rx={2.5} fill="#fff6c2" />
            {/* rótulo de destino */}
            <rect x={166} y={7.5} width={22} height={4} rx={1.5} fill="#1b1b1f" opacity={0.85} />
            {/* ruedas */}
            {wheel(44)}
            {wheel(152)}
        </svg>
    );
}

/** Tira con carretera: el autobús llega rodando y se queda con un pequeño vaivén. Como la del tren de Metro. */
export function BusStrip({ color, height = 46, background = '#e9e9ee' }: { color: string; height?: number; background?: string }) {
    const reduce = useReducedMotion();
    return (
        <div className="relative w-full overflow-hidden" style={{ height: height + 8, background }} aria-hidden>
            <motion.div
                className="absolute left-4"
                style={{ bottom: 5 }}
                initial={reduce ? { opacity: 0 } : { x: '105vw', opacity: 1 }}
                animate={{ x: 0, opacity: 1 }}
                transition={reduce ? { duration: 0.2 } : { type: 'spring', stiffness: 46, damping: 17, mass: 1.2 }}
            >
                <motion.div animate={reduce ? undefined : { y: [0, -1.4, 0] }} transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}>
                    <BusIllustration color={color} height={height} />
                </motion.div>
            </motion.div>
            <Road />
        </div>
    );
}

/** Asfalto con la línea discontinua en movimiento. */
function Road() {
    const reduce = useReducedMotion();
    return (
        <div className="absolute inset-x-0 bottom-0 h-[5px]" style={{ background: '#2b2b31' }}>
            <motion.div
                className="absolute inset-x-0 top-[2px] h-[1px]"
                style={{ backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,.55) 0 12px, transparent 12px 28px)' }}
                animate={reduce ? undefined : { backgroundPositionX: ['0px', '-28px'] }}
                transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
            />
        </div>
    );
}
