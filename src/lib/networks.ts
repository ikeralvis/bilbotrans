import type { Favorite } from '@/context/FavoritesContext';

/** Una red de transporte de la home. Ver API.md para sus fuentes de datos. */
export interface Network {
    slug: string;
    name: string;
    tagline: string;
    color: string;
    /** Degradado de su tarjeta en la home (color de marca → algo más oscuro). */
    gradient: [string, string];
    /** Color del texto sobre la tarjeta (blanco salvo en fondos claros). */
    ink?: string;
    /** Ruta de la sección. Cada red cuelga de su propio prefijo y tiene su manifest PWA. */
    href: string;
    /** Logo real (`components/shared/brand.tsx`); sin él se pinta un icono sobre el color de la red. */
    logo?: 'metro' | 'bilbobus' | 'bizkaibus' | 'renfe';
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
        gradient: ['#3a393a', '#232223'],
        logo: 'metro',
        href: '/metro',
        agency: 'metro',
        favoriteHref: (f) => `/metro/station/${f.stopId.replace(/[12]$/, '')}?agency=metro`,
    },
    {
        slug: 'bizkaibus',
        name: 'Bizkaibus',
        tagline: 'Autobuses de Bizkaia',
        color: '#22533d',
        gradient: ['#b6d68a', '#9cc467'],
        ink: '#173b2b',
        logo: 'bizkaibus',
        href: '/bizkaibus',
        agency: 'bizkaibus',
        favoriteHref: (f) => `/bizkaibus/stop/${f.stopId}`,
    },
    {
        slug: 'bilbobus',
        name: 'Bilbobus',
        tagline: 'Autobuses urbanos de Bilbao',
        color: '#c22629',
        gradient: ['#c22629', '#9a1b1e'],
        logo: 'bilbobus',
        href: '/bilbobus',
        agency: 'bilbobus',
        favoriteHref: (f) => `/bilbobus/stop/${f.stopId}`,
    },
    {
        slug: 'renfe',
        name: 'Renfe Cercanías',
        tagline: 'Cercanías Bilbao',
        color: '#74349a',
        gradient: ['#74349a', '#592677'],
        logo: 'renfe',
        href: '/renfe',
        agency: 'renfe',
    },
    {
        slug: 'euskotren',
        name: 'Euskotren y tranvías',
        tagline: 'Tren y tranvía',
        color: '#003f8c',
        gradient: ['#0a4a9c', '#002e66'],
        href: '/euskotren',
    },
];

/** Redes activadas con `NEXT_PUBLIC_ENABLED_TRANSPORTS` (por defecto, Metro, Bizkaibus y Bilbobus). */
const ENABLED = new Set(
    (process.env.NEXT_PUBLIC_ENABLED_TRANSPORTS ?? 'metro,bizkaibus,bilbobus')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
);

export const isNetworkEnabled = (slug: string) => ENABLED.has(slug);

export const networkByAgency = (agency: string) => NETWORKS.find((n) => n.agency === agency);
