'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowUpLeft } from 'lucide-react';

/* ───────── Logos reales ─────────
 * Versiones para fondo de color (blancas o con su propia placa), todas oficiales:
 *   Metro Bilbao  public/brand/mb-logo-white-text.png      (anillos naranjas + texto blanco, el de la web de Metro)
 *   Bilbobus      public/brand/bilbobus-logo-white.png     (bilbao.eus/Bilbobus/images/bilbobus-logo1.png)
 *   Bizkaibus     rotulo de texto (el logo oficial lleva "bizkaibus" diminuto bajo el escudo de Bizkaia y no se lee a tamaño de cabecera)
 *   Renfe         public/brand/renfe-cercanias-logo.svg    (Wikimedia Commons; se pinta en blanco con un filtro)
 * Son marcas de sus titulares: sirven para identificar la red, no para sugerir que BilboTrans es oficial. */

export type LogoNetwork = 'metro' | 'bilbobus' | 'bizkaibus' | 'renfe';

interface LogoDef {
    src: string;
    ratio: number;
    label: string;
    /** Se pinta en blanco puro (logos de un color sobre un fondo de color). */
    mono?: boolean;
    /** El archivo ya trae su propia baldosa de color: se redondea. */
    tile?: boolean;
    /** Sin imagen: se dibuja como texto (partes en blanco y en el verde lima de la red). */
    wordmark?: [string, string];
}

const LOGOS: Record<LogoNetwork, LogoDef> = {
    metro: { src: '/brand/mb-logo-white-text.png', ratio: 666 / 226, label: 'Metro Bilbao' },
    bilbobus: { src: '/brand/bilbobus-logo-white.png', ratio: 446 / 97, label: 'Bilbobus' },
    bizkaibus: { src: '', ratio: 3.9, label: 'Bizkaibus', wordmark: ['Bizkai', 'bus'] },
    renfe: { src: '/brand/renfe-cercanias-logo.svg', ratio: 3177 / 1005.5, label: 'Renfe Cercanías', mono: true },
};

const BIZKAIBUS_ORIGINAL: LogoDef = { src: '/brand/bizkaibus-logo-tile.png', ratio: 169 / 130, label: 'Bizkaibus', tile: true };

export const LOGO_LABEL: Record<LogoNetwork, string> = { metro: 'Metro Bilbao', bilbobus: 'Bilbobus', bizkaibus: 'Bizkaibus', renfe: 'Renfe Cercanías' };

/** Logo de la red sobre su color de marca. `height` es el alto en px. */
export function NetworkLogo({ network, height = 28, className = '', original = false }: { network: LogoNetwork; height?: number; className?: string; /** Usa el PNG oficial aunque la red tenga rótulo de texto (Bizkaibus). */ original?: boolean }) {
    const def = original && network === 'bizkaibus' ? BIZKAIBUS_ORIGINAL : LOGOS[network];
    const { src, ratio, label, mono, tile, wordmark } = def;
    if (wordmark) {
        return (
            <span role="img" aria-label={label} className={`block select-none whitespace-nowrap font-extrabold leading-none text-white ${className}`} style={{ fontSize: Math.round(height * 0.92), letterSpacing: '-0.035em', height, lineHeight: `${height}px` }}>
                {wordmark[0]}<span style={{ color: 'var(--lime, #a5ca71)' }}>{wordmark[1]}</span>
            </span>
        );
    }
    return (
        // eslint-disable-next-line @next/next/no-img-element -- logos estáticos: no necesitan el optimizador de imágenes
        <img
            src={src}
            alt={label}
            width={Math.round(height * ratio)}
            height={height}
            draggable={false}
            className={`block select-none ${className}`}
            style={{ height, width: 'auto', borderRadius: tile ? Math.round(height * 0.16) : undefined, filter: mono ? 'brightness(0) invert(1)' : undefined }}
        />
    );
}

/**
 * Cabecera de color de una red: su logo con una flechita al lado que lleva a la lista de transportes (como en Bide+),
 * acciones a la derecha y, debajo, el vehículo animado. Sin textos: el logo ya dice dónde estás.
 */
export function NetworkHero({ network, logoHeight, actions, children }: { network: LogoNetwork; logoHeight: number; actions?: ReactNode; children?: ReactNode }) {
    return (
        <header className="relative overflow-hidden rounded-b-[28px]" style={{ background: 'linear-gradient(160deg, var(--brand), var(--brand-2))', color: 'var(--brand-ink)' }}>
            <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))]">
                <h1 className="m-0 min-w-0">
                    <Link href="/" aria-label={`${LOGO_LABEL[network]}: cambiar de transporte`} className="bt-press group -ml-1 inline-flex min-h-11 items-center gap-2.5 rounded-xl px-1">
                        <NetworkLogo network={network} height={logoHeight} />
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/20 transition-colors duration-150 group-hover:bg-white/30">
                            <ArrowUpLeft className="h-4 w-4 text-white" strokeWidth={2} aria-hidden />
                        </span>
                    </Link>
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

/** Logo pequeño de la red en las cabeceras interiores: píldora del color de la red; lleva a la home de esa red. */
export function NetworkBadge({ network }: { network: LogoNetwork }) {
    const tile = LOGOS[network].tile;
    return (
        <Link href={`/${network}`} aria-label={`Inicio de ${LOGO_LABEL[network]}`} className="bt-press shrink-0">
            {tile ? (
                <NetworkLogo network={network} height={28} />
            ) : (
                <span className="inline-flex h-7 items-center rounded-lg px-2.5" style={{ background: 'var(--brand)' }}>
                    <NetworkLogo network={network} height={network === 'bilbobus' ? 12 : 16} />
                </span>
            )}
        </Link>
    );
}
