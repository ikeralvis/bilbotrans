import { secondsOfDay } from './delay';

/**
 * Estación donde se cambia entre L1 y L2: San Ignazio.
 *
 * La API de horarios no nombra el cambio, pero se comprobó contra tramos directos (29/10/2026):
 * - ANS→PLE: ANS→SIN llega 13:10:32, SIN→PLE sale 13:20:43 y llega 13:54:13 = `finalDestinyTime` del trayecto con transbordo.
 * - PLE→BSR: PLE→SIN llega 13:53:52, SIN→BSR sale 13:57:12 (= `transbordTrainGettingTime`) y llega 14:17:32 = final.
 * - KAB→LUT: SIN→LUT sale 13:26:54 (= `transbordTrainGettingTime`) y llega 13:28:53 = final.
 * Es decir, `transbordTrainGettingTime` es la salida desde San Ignazio del siguiente tren.
 */
export const TRANSFER_STATION = 'SIN';

/** Minutos enteros de espera entre llegar al cambio y salir en el siguiente tren ("HH:mm:ss" ambos). */
export function waitMinutes(arrivesAtTransfer: string, departsFromTransfer: string): number | null {
    const diff = secondsOfDay(departsFromTransfer) - secondsOfDay(arrivesAtTransfer);
    return diff < 0 ? null : Math.round(diff / 60);
}
