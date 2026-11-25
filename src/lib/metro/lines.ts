/** Colores oficiales de las líneas de Metro Bilbao. */
export const LINE_COLOR = { L1: '#D93E14', L2: '#000000', L3: '#E1007A' } as const;
export type LineId = keyof typeof LINE_COLOR;
export const LINE_IDS: LineId[] = ['L1', 'L2', 'L3'];
export const isLineId = (v: string): v is LineId => v in LINE_COLOR;

export const LINE_NAME: Record<LineId, string> = {
    L1: 'Etxebarri – Plentzia',
    L2: 'Basauri – Kabiezes',
    L3: 'Matiko – Kukullaga',
};

/** Estación del diagrama de línea (de `/metro/line-with-issues`). */
export interface LineStation {
    code: string;
    name: string;
    zone: string;
    /** Tramo troncal compartido por L1 y L2. */
    trunk: boolean;
    issues: boolean;
    /** Minutos hasta la siguiente estación (hacia el interior). */
    minToNext: number | null;
    connection: boolean;
}
export interface LineDiagramData {
    line: LineId;
    stations: LineStation[];
    fetchedAt: number;
}
