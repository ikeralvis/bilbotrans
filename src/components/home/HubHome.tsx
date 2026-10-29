'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import Link, { useLinkStatus } from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowUpRight, Bus, ChevronRight, Heart, LayoutGrid, List, TrainFront, TramFront } from 'lucide-react';
import { useFavorites, type Favorite } from '@/context/FavoritesContext';
import { getStation } from '@/lib/metro/catalog';
import { NETWORKS, isNetworkEnabled, networkByAgency, type Network } from '@/lib/networks';
import { LiveStationCard } from '@/components/metro/MetroHome';
import { BilboMark } from '@/components/shared/BilboLogo';
import { NetworkLogo } from '@/components/shared/brand';
import { LegalFooter } from '@/components/shared/Legal';
import { ThemeToggle } from '@/components/shared/ThemeToggle';

const WATERMARK: Record<string, typeof Bus> = { metro: TrainFront, bizkaibus: Bus, bilbobus: Bus, renfe: TrainFront, euskotren: TramFront };
/** Alto del logo de cada tarjeta (el de Bizkaibus es una baldosa casi cuadrada; el de Bilbobus, muy ancho). */
const LOGO_H = { metro: 36, bilbobus: 24, bizkaibus: 56, renfe: 26 } as const;
const MAX_METRO_LIVE = 4;

/* ───────── Vista en cuadrícula o lista (se recuerda en este dispositivo) ───────── */
type View = 'grid' | 'list';
const VIEW_KEY = 'bt_hub_view';
const viewListeners = new Set<() => void>();
const readView = (): View => {
    try {
        return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'grid';
    } catch {
        return 'grid';
    }
};
function useView(): [View, (v: View) => void] {
    const view = useSyncExternalStore(
        (cb) => {
            viewListeners.add(cb);
            return () => void viewListeners.delete(cb);
        },
        readView,
        () => 'grid' as View,
    );
    const set = useCallback((v: View) => {
        try {
            localStorage.setItem(VIEW_KEY, v);
        } catch {
            /* sin storage: dura hasta recargar */
        }
        viewListeners.forEach((l) => l());
    }, []);
    return [view, set];
}

function ViewToggle({ view, onChange }: { view: View; onChange: (v: View) => void }) {
    const opts: Array<{ id: View; label: string; Icon: typeof List }> = [
        { id: 'grid', label: 'Vista en cuadrícula', Icon: LayoutGrid },
        { id: 'list', label: 'Vista en lista', Icon: List },
    ];
    return (
        <div role="radiogroup" aria-label="Vista" className="inline-flex rounded-full p-1" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-card)' }}>
            {opts.map(({ id, label, Icon }) => {
                const on = id === view;
                return (
                    <button
                        key={id}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        aria-label={label}
                        onClick={() => onChange(id)}
                        className="bt-press grid h-9 w-9 place-items-center rounded-full"
                        style={{ background: on ? 'var(--ink)' : 'transparent', color: on ? 'var(--bg)' : 'var(--ink-2)', transition: 'background-color 160ms var(--ease-out), color 160ms var(--ease-out)' }}
                    >
                        <Icon className="h-[18px] w-[18px]" strokeWidth={on ? 2 : 1.5} aria-hidden />
                    </button>
                );
            })}
        </div>
    );
}

/* ───────── Tarjeta de red ───────── */
/** Mientras la página de la red carga (hijo de <Link>), la tarjeta se vela y late la marca. Aparece tras 140 ms para no parpadear en navegaciones rápidas. */
function CardPending() {
    const { pending } = useLinkStatus();
    if (!pending) return null;
    return (
        <span aria-hidden className="bt-card-pending absolute inset-0 z-10 overflow-hidden rounded-[inherit]">
            <span className="bt-card-bar absolute inset-x-0 bottom-0 h-1" />
        </span>
    );
}


function CardLogo({ network, height }: { network: Network; height: number }) {
    const Icon = WATERMARK[network.slug] ?? Bus;
    if (network.logo) return <NetworkLogo network={network.logo} height={height} original />;
    return (
        <span className="inline-flex items-center gap-2 text-white">
            <Icon className="h-7 w-7" strokeWidth={1.75} aria-hidden />
        </span>
    );
}

function NetworkCard({ network, index, view }: { network: Network; index: number; view: View }) {
    const reduce = useReducedMotion();
    const enabled = isNetworkEnabled(network.slug);
    const Mark = WATERMARK[network.slug] ?? Bus;
    const list = view === 'list';
    const logoH = network.logo ? Math.round(LOGO_H[network.logo] * (list ? 0.78 : 1)) : 28;

    const inner = (
        <>
            {/* marca de agua: silueta grande y casi transparente, asomando por la esquina */}
            <Mark
                aria-hidden
                strokeWidth={1.25}
                className="pointer-events-none absolute"
                style={list ? { right: -14, top: '50%', height: 120, width: 120, opacity: 0.1, transform: 'translateY(-50%) rotate(-8deg)' } : { right: -22, bottom: -26, height: 132, width: 132, opacity: 0.12, transform: 'rotate(-8deg)' }}
            />
            {list ? (
                <div className="relative flex min-h-[76px] items-center gap-4">
                    <div className="flex w-[120px] shrink-0 items-center">
                        <CardLogo network={network} height={logoH} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-[17px] font-bold leading-5 tracking-[-0.01em]">{network.name}</p>
                        <p className="truncate text-[13px] leading-5 opacity-75">{enabled ? network.tagline : 'Próximamente'}</p>
                    </div>
                    {enabled && <ArrowUpRight className="h-5 w-5 shrink-0 opacity-85" strokeWidth={2} aria-hidden />}
                </div>
            ) : (
                <div className="relative flex min-h-[148px] flex-col justify-between">
                    <div className="flex items-start justify-between gap-2">
                        <CardLogo network={network} height={logoH} />
                        {enabled ? (
                            <ArrowUpRight className="h-5 w-5 shrink-0 opacity-85" strokeWidth={2} aria-hidden />
                        ) : (
                            <span className="rounded-full bg-black/20 px-2 py-0.5 text-[11px] font-semibold">Pronto</span>
                        )}
                    </div>
                    <div>
                        <p className="text-[19px] font-bold leading-6 tracking-[-0.015em]">{network.name}</p>
                        <p className="text-[13px] leading-[18px] opacity-75">{enabled ? network.tagline : 'Próximamente'}</p>
                    </div>
                </div>
            )}
        </>
    );

    const className = `relative block overflow-hidden rounded-[26px] p-4 ${enabled ? 'bt-press' : ''}`;
    const style = {
        color: network.ink ?? '#fff',
        background: `linear-gradient(150deg, ${network.gradient[0]}, ${network.gradient[1]})`,
        boxShadow: '0 1px 0 rgb(255 255 255 / 0.14) inset, 0 12px 24px -16px rgb(0 0 0 / 0.5)',
        filter: enabled ? undefined : 'saturate(0.7) brightness(0.96)',
    } as const;

    return (
        <motion.li
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', duration: 0.45, bounce: 0, delay: index * 0.05 }}
            className={list ? 'col-span-2' : undefined}
        >
            {enabled ? (
                <Link href={network.href} className={className} style={style} aria-label={network.name}>
                    {inner}
                    <CardPending />
                </Link>
            ) : (
                <div className={className} style={style} aria-disabled="true">
                    {inner}
                </div>
            )}
        </motion.li>
    );
}

function FavoriteRow({ fav, network }: { fav: Favorite; network: Network }) {
    return (
        <li>
            <Link href={network.favoriteHref?.(fav) ?? network.href} className="bt-press flex min-h-12 items-center gap-3 rounded-xl px-3 hover:bg-[var(--surface-2)]">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: network.gradient[0] }} aria-hidden />
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium" style={{ color: 'var(--ink)' }}>
                    {fav.stopName ?? fav.name ?? fav.stopId}
                </span>
                <span className="text-xs" style={{ color: 'var(--ink-2)' }}>{network.name}</span>
                <ChevronRight className="h-4 w-4 shrink-0" style={{ color: 'var(--ink-2)' }} aria-hidden />
            </Link>
        </li>
    );
}

/** Home de BilboTrans: tarjetas de color por red (como Bide+) y, debajo, tus favoritos de todas. */
export default function HubHome() {
    const { favorites } = useFavorites();
    const [view, setView] = useView();

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
            <div className="mx-auto max-w-2xl px-5 pt-[max(1.5rem,env(safe-area-inset-top))]">
                <header>
                    <h1 className="flex items-center gap-3 text-[40px] font-extrabold leading-none tracking-[-0.04em]" style={{ color: 'var(--ink)' }}>
                        <BilboMark size={44} />
                        <span>Bilbo<span style={{ color: 'var(--metro)' }}>Trans</span></span>
                    </h1>
                    <p className="mt-1.5 text-[16px] tracking-[-0.01em]" style={{ color: 'var(--ink-2)' }}>Movilidad en Bizkaia</p>
                    <div className="mt-5 flex items-center justify-between gap-3">
                        <ThemeToggle />
                        <ViewToggle view={view} onChange={setView} />
                    </div>
                </header>

                <main className="mt-5 space-y-7">
                    <ul className="grid grid-cols-2 gap-3" aria-label="Transportes">
                        {NETWORKS.map((n, i) => <NetworkCard key={n.slug} network={n} index={i} view={view} />)}
                    </ul>

                    <section aria-label="Favoritos" className="space-y-3">
                        <h2 className="px-1 text-[13px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--ink-2)' }}>Tus favoritos</h2>
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

                    <LegalFooter />
                </main>
            </div>
        </div>
    );
}
