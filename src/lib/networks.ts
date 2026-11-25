import type { Favorite } from '@/context/FavoritesContext';
import type { NetworkId } from '@/components/shared/brand';

/** Una red de transporte de la home. Ver API.md para sus fuentes de datos. */
export interface Network {
    slug: string;
    name: string;
    tagline: string;
    color: string;
    /** Ruta de la sección. Cada red cuelga de su propio prefijo y tiene su manifest PWA. */
    href: string;
    /** Distintivo propio de la red (`components/shared/brand.tsx`). */
    mark: NetworkId;
    /** Clave de `Favorite.agency`, si la red guarda favoritos. */
    agency?: Favorite['agency'];
    /** Enlace a la ficha de un favorito de esta red. */
    favoriteHref?: (fav: Favorite) => string;
}

export const NETWORKS: Network[] = [
    {
        slug: 'metro',
        name: 'Metro Bilbao',
        tagline: 'Trenes en directo por sentido',
        color: '#d93e14',
        mark: 'metro',
        href: '/metro',
        agency: 'metro',
        favoriteHref: (f) => `/metro/station/${f.stopId.replace(/[12]$/, '')}?agency=metro`,
    },
    {
        slug: 'bizkaibus',
        name: 'Bizkaibus',
        tagline: 'Autobuses de Bizkaia',
        color: '#22533d',
        mark: 'bizkaibus',
        href: '/bizkaibus',
        agency: 'bizkaibus',
        favoriteHref: (f) => `/bizkaibus/stop/${f.stopId}`,
    },
    {
        slug: 'bilbobus',
        name: 'Bilbobus',
        tagline: 'Autobuses urbanos de Bilbao',
        color: '#c22629',
        mark: 'bilbobus',
        href: '/bilbobus',
        agency: 'bilbobus',
        favoriteHref: (f) => `/bilbobus/stop/${f.stopId}`,
    },
    {
        slug: 'renfe',
        name: 'Renfe Cercanías',
        tagline: 'Cercanías Bilbao',
        color: '#74349a',
        mark: 'renfe',
        href: '/renfe',
        agency: 'renfe',
    },
    {
        slug: 'euskotren',
        name: 'Euskotren',
        tagline: 'Tren y funicular',
        color: '#003f8c',
        mark: 'euskotren',
        href: '/euskotren',
        agency: 'euskotren',
        favoriteHref: (f) => `/euskotren/station/${f.stopId}`,
    },
    {
        slug: 'tranvia-bilbao',
        name: 'Tranvía de Bilbao',
        tagline: 'Bolueta – La Casilla',
        color: '#2f8f2a',
        mark: 'tranvia-bilbao',
        href: '/euskotren/tranvia-bilbao',
    },
    {
        slug: 'tranvia-vitoria',
        name: 'Tranvía de Vitoria-Gasteiz',
        tagline: 'Abetxuko, Unibertsitatea, Salburua',
        color: '#4c8a1f',
        mark: 'tranvia-vitoria',
        href: '/euskotren/tranvia-vitoria',
    },
];

/** Redes activadas con `NEXT_PUBLIC_ENABLED_TRANSPORTS` (por defecto, Metro, Bizkaibus, Bilbobus y Euskotren). */
const ENABLED = new Set(
    (process.env.NEXT_PUBLIC_ENABLED_TRANSPORTS ?? 'metro,bizkaibus,bilbobus,euskotren,tranvia-bilbao,tranvia-vitoria')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
);

export const isNetworkEnabled = (slug: string) => ENABLED.has(slug);

export const networkByAgency = (agency: string) => NETWORKS.find((n) => n.agency === agency);
