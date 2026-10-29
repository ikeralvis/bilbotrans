/** Parada del catálogo (`src/data/bizkaibus/catalog/stops.json`). `code` es el código reducido que usa la API en tiempo real. */
export interface CatalogStop {
    code: string;
    name: string;
    municipality: string;
    lat: number;
    lon: number;
    /** Líneas que pasan por la parada (A3527…). */
    lines: string[];
}

export interface CatalogLine {
    code: string;
    routeNumber: string;
    name: string;
}

export type DirectionId = 'I' | 'V';

export interface LineStop {
    code: string;
    name: string;
}

/** Recorrido de una línea: paradas ordenadas por sentido (`I` ida, `V` vuelta). */
export interface LineDetail {
    code: string;
    name: string;
    directions: Record<DirectionId, LineStop[]>;
}

/** Un autobús que se acerca a una parada. `meters` es la distancia por carretera si la API la da con sentido. */
export interface BusPass {
    minutes: number;
    meters: number | null;
}

export interface StopArrival {
    line: string;
    /** Destino tal y como lo da la API (MUNGIA, GOIETAKO PLAZA…). */
    route: string;
    next: BusPass | null;
    following: BusPass | null;
}

export interface StopArrivals {
    code: string;
    name: string;
    /** Letra de accesibilidad de la API (B = accesible, según la ficha de la parada). */
    accessibility: string;
    arrivals: StopArrival[];
    fetchedAt: number;
}

export interface BizkaibusAlert {
    id: string;
    /** Líneas afectadas (A3524…). Vacío = toda la red. */
    lines: string[];
    summary: string;
    description: string;
    start: string | null;
    end: string | null;
}

export interface ScheduleSeason {
    name: string;
    from: string;
    to: string;
    /** Hoy cae dentro de las fechas de la temporada. */
    active: boolean;
    outbound: string;
    inbound: string;
}

export interface LineSchedule {
    code: string;
    seasons: ScheduleSeason[];
    notice: string;
    fetchedAt: number;
}

/** Trayecto directo entre dos paradas con una línea. */
export interface Connection {
    line: string;
    lineName: string;
    direction: DirectionId;
    /** Parada de subida (puede ser una equivalente cercana a la elegida). */
    from: LineStop;
    to: LineStop;
    /** Paradas que recorre el bus entre subida y bajada. */
    stops: number;
}
