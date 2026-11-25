/** Estación o parada del catálogo (`src/data/euskotren/catalog/stations.json`). `id` es el número del `StopPlace` del GTFS. */
export interface EtStation {
    id: string;
    name: string;
    /** Calle o municipio ("Calle Uribitarte / Bilbao"); puede venir vacío. */
    desc: string;
    lat: number;
    lon: number;
    accessible: boolean;
    zone: string | null;
    /** `route_short_name` de las líneas que paran (E1, L3, TR…). */
    lines: string[];
}

export type EtOperator = 'tren' | 'tranvia-bilbao' | 'tranvia-vitoria' | 'funicular';

export interface EtLine {
    id: string;
    code: string;
    name: string;
    color: string;
    textColor: string;
    operator: EtOperator;
}

export type EtDirection = '0' | '1';

export interface EtLineDetail {
    code: string;
    name: string;
    /** Estaciones (`id`) en orden, por sentido (`direction_id`). Se toma el viaje con más paradas. */
    directions: Partial<Record<EtDirection, string[]>>;
    /** Destino más habitual de cada sentido (`trip_headsign`). */
    terminals: Partial<Record<EtDirection, string>>;
}

export interface EtArrival {
    line: string;
    /** Destino del tren: última parada que el tiempo real le asigna. */
    towards: string;
    /** `direction_id` del GTFS (0/1). */
    direction: EtDirection;
    /** Segundos Unix de la salida prevista. */
    time: number;
    /** Minutos hasta la salida (0 = llegando). */
    minutes: number;
    /** Retraso en segundos si el operador lo informa; 0 si va en hora o no se sabe. */
    delay: number;
}

export interface EtStationLive {
    id: string;
    name: string;
    arrivals: EtArrival[];
    /** `live` = GTFS-RT del operador; `schedule` = no había tiempo real y son las próximas salidas del horario. */
    source: 'live' | 'schedule';
    fetchedAt: number;
}
