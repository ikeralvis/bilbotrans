/** Parada del catálogo (`src/data/bilbobus/catalog/stops.json`). `code` es el `stop_code` del GTFS = `codParada` del AJAX. */
export interface BbStop {
    code: string;
    name: string;
    lat: number;
    lon: number;
    accessible: boolean;
    /** Líneas que pasan por la parada (`route_short_name`: "01", "A1"…). */
    lines: string[];
}

export interface BbLine {
    /** `route_short_name` = `codLinea` del AJAX. */
    code: string;
    name: string;
    /** Refuerzos (E*), nocturnos (G*) y bus turístico (BT): el AJAX solo responde dentro de su horario. */
    special: boolean;
    /** Color oficial de la línea (hoja de estilos de bilbao.eus), `#RRGGBB`; `null` si la web no lo define. */
    color: string | null;
}

export type BbDirection = '0' | '1';

export interface BbLineDetail {
    code: string;
    name: string;
    /** Recorrido más habitual por sentido (`direction_id`). Los viajes con variantes pueden pasar por más paradas. */
    directions: Partial<Record<BbDirection, Array<{ code: string; name: string }>>>;
    /** Destino final de cada sentido tal como lo rotulan los buses (`trip_headsign`: "JESUSEN BIHOTZA"). */
    terminals?: Partial<Record<BbDirection, string>>;
}

/** Minutos hasta el próximo bus en cada parada de una línea; `null` = el servicio dice "sin información" (9999). */
export interface BbLineWaiting {
    line: string;
    minutes: Record<string, number | null>;
    fetchedAt: number;
}

export interface BbArrival {
    line: string;
    /** Última parada del sentido en el que va el bus desde esta parada. */
    towards: string;
    /** `null` = sin información. 0 = llegando. */
    minutes: number | null;
}

export interface BbStopWaiting {
    code: string;
    name: string;
    /** Ordenadas: primero las que tienen minutos (de menos a más), luego las que no tienen información. */
    arrivals: BbArrival[];
    /** Líneas de la parada que ahora no devuelven nada (fuera de horario o sin servicio). */
    inactive: string[];
    /** Líneas cuya consulta falló: el dato es de las demás. */
    unavailable: string[];
    fetchedAt: number;
}
