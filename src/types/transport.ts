
export interface StopLocation {
    id: string;
    name: string;
    agency: 'metro' | 'bilbobus' | 'bizkaibus' | 'renfe';
    lat: number;
    lon: number;
}
