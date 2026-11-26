'use client';

import { useMemo, useSyncExternalStore } from 'react';
import Link, { useLinkStatus } from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { ChevronRight, Heart } from 'lucide-react';
import { useFavorites, type Favorite } from '@/context/FavoritesContext';
import { getStation } from '@/lib/metro/catalog';
import { NETWORKS, isNetworkEnabled, networkByAgency, type Network } from '@/lib/networks';
import { LiveStationCard } from '@/components/metro/MetroHome';
import { BilboMark } from '@/components/shared/BilboLogo';
import { NetworkMark } from '@/components/shared/brand';
import { LegalFooter } from '@/components/shared/Legal';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { UnifiedSearch } from './UnifiedSearch';
import { NearbyAll } from './NearbyAll';

const MAX_METRO_LIVE = 4;
/** Alto fijo de cada parada del esquema: la vía va del centro de la primera al centro de la última. */
const STOP_H = 76;
const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/* ───────── Esquema de redes ─────────
 * La home dibuja las redes como paradas de una línea: una vía vertical y, en cada parada, el distintivo de la red.
 * Al entrar, la vía se traza de arriba abajo y cada parada aparece cuando la vía llega a ella. */

/** Final de cada parada: flecha, o un indicador de carga mientras se abre la red (tras 140 ms, para no parpadear). */
function StopTrail() {
    const { pending } = useLinkStatus();
    if (pending) return <span className="bt-stop-pending h-[18px] w-[18px] shrink-0 rounded-full" role="status" aria-label="Abriendo" />;
    return <ChevronRight className="bt-stop-chevron h-5 w-5 shrink-0" strokeWidth={2} style={{ color: 'var(--ink-2)' }} aria-hidden />;
}

function NetworkStop({ network, index }: { network: Network; index: number }) {
    const reduce = useReducedMotion();
    const enabled = isNetworkEnabled(network.slug);

    const body = (
        <>
            <motion.span
                className="relative z-10 grid w-[52px] shrink-0 place-items-center"
                initial={reduce ? false : { scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 420, damping: 26, delay: 0.12 + index * 0.07 }}
            >
                {/* anillo del color del panel: separa el distintivo de la vía */}
                <span className="grid place-items-center rounded-full p-[3px]" style={{ background: 'var(--surface)' }}>
                    <NetworkMark network={network.mark} size={44} muted={!enabled} decorative />
                </span>
            </motion.span>
            <span className="min-w-0 flex-1">
                <span className="block truncate text-[18px] font-bold leading-6 tracking-[-0.015em]" style={{ color: enabled ? 'var(--ink)' : 'var(--ink-2)' }}>
                    {network.name}
                </span>
                <span className="block truncate text-[14px] leading-5" style={{ color: 'var(--ink-2)' }}>
                    {enabled ? network.tagline : 'Próximamente'}
                </span>
            </span>
        </>
    );

    const rowClass = 'bt-stop flex items-center gap-3 rounded-2xl pl-1.5 pr-3';
    return (
        <li style={{ height: STOP_H }}>
            {enabled ? (
                <Link href={network.href} className={`${rowClass} bt-press h-full`}>
                    {body}
                    <StopTrail />
                </Link>
            ) : (
                <div className={`${rowClass} h-full`} aria-disabled="true">
                    {body}
                </div>
            )}
        </li>
    );
}

function NetworkLine() {
    const reduce = useReducedMotion();
    const n = NETWORKS.length;
    return (
        <nav aria-label="Redes de transporte" className="bt-card relative px-1.5 py-2">
            {/* vía: del centro de la primera parada al de la última, detrás de los distintivos */}
            <motion.span
                aria-hidden
                className="absolute w-1 rounded-full"
                style={{ left: 6 + 6 + 26 - 2, top: 8 + STOP_H / 2, bottom: 8 + STOP_H / 2, background: 'var(--track)', transformOrigin: 'top' }}
                initial={reduce ? false : { scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.12 + n * 0.07, ease: EASE_OUT }}
            />
            <ol className="relative">
                {NETWORKS.map((net, i) => <NetworkStop key={net.slug} network={net} index={i} />)}
            </ol>
        </nav>
    );
}

function FavoriteRow({ fav, network }: { fav: Favorite; network: Network }) {
    return (
        <li>
            <Link href={network.favoriteHref?.(fav) ?? network.href} className="bt-press flex min-h-12 items-center gap-3 rounded-xl px-2.5 hover:bg-[var(--surface-2)]">
                <NetworkMark network={network.mark} size={26} />
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium" style={{ color: 'var(--ink)' }}>
                    {fav.stopName ?? fav.name ?? fav.stopId}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0" style={{ color: 'var(--ink-2)' }} aria-hidden />
            </Link>
        </li>
    );
}

/** Saludo según la hora de Bilbao. En el servidor (y al hidratar) se usa el genérico, así no hay desajuste. */
function greetingNow(): string {
    const h = Number(new Intl.DateTimeFormat('es-ES', { hour: 'numeric', hour12: false, timeZone: 'Europe/Madrid' }).format(new Date()));
    return h >= 6 && h < 13 ? 'Buenos días. ¿A dónde vas?' : h >= 13 && h < 21 ? 'Buenas tardes. ¿A dónde vas?' : 'Buenas noches. ¿Vuelves a casa?';
}
const noopSubscribe = () => () => {};
const useGreeting = () => useSyncExternalStore(noopSubscribe, greetingNow, () => '¿A dónde vas hoy?');

/** Home de BilboTrans: las redes como paradas de una línea y, debajo, tus favoritos de todas. */
export default function HubHome() {
    const { favorites } = useFavorites();
    const greeting = useGreeting();
    const reduce = useReducedMotion();

    const { metroStations, others } = useMemo(() => {
        const seen = new Set<string>();
        const metroStations = favorites
            .filter((f) => f.agency === 'metro')
            .map((f) => getStation(f.stopId.replace(/[12]$/, '')))
            .filter((s): s is NonNullable<typeof s> => Boolean(s) && !seen.has(s!.code) && Boolean(seen.add(s!.code)));
        const others = favorites.filter((f) => f.agency !== 'metro' && networkByAgency(f.agency));
        return { metroStations, others };
    }, [favorites]);
    const hasFavorites = metroStations.length + others.length > 0;

    return (
        <div className="min-h-dvh pb-[max(6rem,env(safe-area-inset-bottom))]" style={{ background: 'var(--bg)' }}>
            <div className="mx-auto max-w-2xl px-4 pt-[max(1.5rem,env(safe-area-inset-top))]">
                <motion.header
                    className="flex items-start justify-between gap-3 px-1"
                    initial={reduce ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.32, ease: EASE_OUT }}
                >
                    <div className="min-w-0">
                        <h1 className="flex items-center gap-3 text-[36px] font-extrabold leading-none tracking-[-0.04em]" style={{ color: 'var(--ink)' }}>
                            <BilboMark size={40} />
                            <span>BilboTrans</span>
                        </h1>
                        <p className="mt-2 text-[15px] leading-5" style={{ color: 'var(--ink-2)' }}>{greeting}</p>
                    </div>
                    <ThemeToggle />
                </motion.header>

                <main className="mt-6 space-y-8">
                    <UnifiedSearch />

                    <NetworkLine />

                    <section aria-labelledby="fav-title" className="space-y-3">
                        <h2 id="fav-title" className="px-1 text-[20px] font-bold tracking-[-0.02em]" style={{ color: 'var(--ink)' }}>Tus favoritos</h2>
                        {!hasFavorites ? (
                            <div className="bt-card flex items-center gap-3 px-4 py-5">
                                <Heart className="h-5 w-5 shrink-0" strokeWidth={1.5} style={{ color: 'var(--ink-2)' }} aria-hidden />
                                <p className="text-sm" style={{ color: 'var(--ink-2)' }}>Abre una parada o estación y pulsa el corazón para tenerla aquí.</p>
                            </div>
                        ) : (
                            <>
                                {metroStations.length > 0 && (
                                    <div className="grid grid-cols-2 gap-3">
                                        {metroStations.slice(0, MAX_METRO_LIVE).map((s) => <LiveStationCard key={s.code} station={s} />)}
                                    </div>
                                )}
                                {others.length > 0 && (
                                    <ul className="bt-card p-1.5">
                                        {others.map((f) => <FavoriteRow key={f.id} fav={f} network={networkByAgency(f.agency)!} />)}
                                    </ul>
                                )}
                            </>
                        )}
                    </section>

                    <NearbyAll />

                    <LegalFooter />
                </main>
            </div>
        </div>
    );
}
