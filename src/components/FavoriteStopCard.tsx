import { AlertCircle, MapPin } from 'lucide-react';
import { useGeolocation } from '@/context/GeolocationContext';
import { useEffect, useState } from 'react';
import { getMetroArrivalsByStop } from '@/lib/metro/api';
import { getBizkaibusArrivals } from '@/lib/bizkaibus/api';
import Image from 'next/image';

interface FavoriteStopCardProps {
    readonly stopId: string;
    readonly name: string;
    readonly agency: 'metro' | 'bilbobus' | 'bizkaibus' | 'renfe';
    readonly lat?: number;
    readonly lon?: number;
    readonly onTap?: () => void;
}

interface TrainInfo {
    destination: string;
    etaMinutes: number;
    lineId: string;
}

export function FavoriteStopCard({ stopId, name, agency, lat, lon, onTap }: FavoriteStopCardProps) {
    const { calculateDistance, location } = useGeolocation();
    const [trainsL1, setTrainsL1] = useState<TrainInfo[]>([]);
    const [trainsL2, setTrainsL2] = useState<TrainInfo[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const distance = lat && lon && location ? calculateDistance(lat, lon) : null;

    useEffect(() => {
        if (agency === 'metro') {
            const loadTrains = async () => {
                setIsLoading(true);
                setError(null);
                try {
                    const arrivals = await getMetroArrivalsByStop(stopId);
                    const l1 = arrivals.filter(a => a.lineId.includes('L1')).slice(0, 3);
                    const l2 = arrivals.filter(a => a.lineId.includes('L2')).slice(0, 3);

                    setTrainsL1(l1.map(a => ({ destination: a.destination, etaMinutes: a.etaMinutes, lineId: a.lineId })));
                    setTrainsL2(l2.map(a => ({ destination: a.destination, etaMinutes: a.etaMinutes, lineId: a.lineId })));

                    if (l1.length === 0 && l2.length === 0) setError('Sin servicio');
                } catch {
                    setError('Error');
                }
                setIsLoading(false);
            };
            loadTrains();
        } else if (agency === 'bizkaibus') {
            const loadBizkaibus = async () => {
                setIsLoading(true);
                setError(null);
                try {
                    const arrivals = await getBizkaibusArrivals(stopId);
                    const list = arrivals.arrivals.slice(0, 4).map(a => ({
                        destination: a.destination,
                        etaMinutes: a.etaMinutes,
                        lineId: a.lineId
                    }));
                    setTrainsL1(list);
                    if (list.length === 0) setError('Sin servicio');
                } catch {
                    setError('Error');
                }
                setIsLoading(false);
            };
            loadBizkaibus();
        }
    }, [stopId, agency]);

    // Función para extraer el nombre de línea limpio (L1, L2, L3)
    const getCleanLineId = (lineId: string): string => {
        const regex = /L[1-3]/;
        const match = regex.exec(lineId);
        return match ? match[0] : lineId;
    };

    const getLineColor = (lineId: string): string => {
        if (lineId.includes('L1')) return 'bg-[#f14e2d]';
        if (lineId.includes('L2')) return 'bg-[#242324]';
        if (lineId.includes('L3')) return 'bg-purple-500';
        return 'bg-slate-500';
    };

    const getEtaStyle = (etaMinutes: number): string => {
        if (etaMinutes <= 2) return 'text-red-500 animate-pulse';
        if (etaMinutes <= 8) return 'text-orange-500';
        return 'text-emerald-600';
    };

    const renderTrainRow = (train: TrainInfo) => (
        <div className="flex items-center gap-2 py-1.5">
            <span className={`w-6 h-6 rounded-full text-[10px] font-bold text-white flex items-center justify-center shrink-0 ${getLineColor(train.lineId)}`}>
                {getCleanLineId(train.lineId)}
            </span>
            <div className="flex-1 min-w-0 flex items-baseline gap-1">
                <span className={`text-2xl font-black ${getEtaStyle(train.etaMinutes)} leading-none`}>
                    {train.etaMinutes <= 0 ? '0' : train.etaMinutes}
                </span>
                <span className="text-xs text-slate-500 font-medium">min</span>
            </div>
            <span className="text-sm font-medium text-slate-700 truncate shrink-0 max-w-20">
                {train.destination}
            </span>
        </div>
    );

    const renderContent = () => {
        // Diseño especial para Bizkaibus (estilo de la imagen)
        if (agency === 'bizkaibus') {
            if (isLoading) {
                return (
                    <div className="flex items-center justify-center py-8">
                        <div className="w-6 h-6 rounded-full border-2 border-green-600 border-t-transparent animate-spin" />
                    </div>
                );
            }

            if (error || trainsL1.length === 0) {
                return (
                    <div className="text-center py-4 text-sm text-slate-500">
                        Sin llegadas disponibles
                    </div>
                );
            }

            return (
                <div className="grid grid-cols-2 gap-3 mt-3">
                    {trainsL1.map((train) => (
                        <div 
                            key={`biz-${train.lineId}-${train.destination}-${train.etaMinutes}`}
                            className="flex items-center gap-2 bg-white rounded-xl pl-1 pr-4 py-2 border border-slate-200 shadow-sm"
                        >
                            {/* SQUARE badge with line number */}
                            <div 
                                className="w-14 h-8 rounded-lg flex items-center justify-center font-bold text-[11px] shrink-0 ml-0.5"
                                style={{ backgroundColor: '#22533d', color: 'white' }}
                            >
                                {train.lineId}
                            </div>
                            
                            {/* Destination */}
                            <div className="flex flex-col min-w-0 flex-1">
                                <span className="text-[11px] font-medium text-slate-600 truncate">
                                    {train.destination}
                                </span>
                            </div>
                            
                            {/* Time */}
                            <div className="flex items-baseline gap-0.5 ml-1">
                                <span className="font-black leading-none text-[14px]" style={{ color: '#22533d' }}>
                                    {train.etaMinutes <= 0 ? '0' : train.etaMinutes}
                                </span>
                                <span className="text-xs font-bold" style={{ color: '#22533d' }}>'</span>
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        // Diseño original para Metro
        if (isLoading) {
            return (
                <div className="grid grid-cols-2 gap-3 divide-x divide-slate-200">
                    <div className="space-y-2 pr-1.5">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-200 animate-pulse" />
                            <div className="flex-1">
                                <div className="h-7 w-12 bg-slate-200 rounded animate-pulse" />
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-200 animate-pulse" />
                            <div className="flex-1">
                                <div className="h-7 w-12 bg-slate-200 rounded animate-pulse" />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2 pl-1.5">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-200 animate-pulse" />
                            <div className="flex-1">
                                <div className="h-7 w-12 bg-slate-200 rounded animate-pulse" />
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        if (error) {
            return (
                <div className="flex items-center gap-1 text-xs text-slate-500">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{error}</span>
                </div>
            );
        }

        if (trainsL1.length === 0 && trainsL2.length === 0 && agency !== 'renfe') {
            return null;
        }

        // Metro: mostrar por líneas en columnas separadas
        return (
            <div className="grid grid-cols-2 gap-3 divide-x divide-slate-200">
                {/* Línea 1 */}
                {trainsL1.length > 0 && (
                    <div className="space-y-1 pr-1.5">
                        {trainsL1.map((train, idx) => (
                            <div key={`l1-${train.destination}-${idx}`}>
                                {renderTrainRow(train)}
                            </div>
                        ))}
                    </div>
                )}
                
                {/* Línea 2 */}
                {trainsL2.length > 0 && (
                    <div className="space-y-1 pl-1.5">
                        {trainsL2.map((train, idx) => (
                            <div key={`l2-${train.destination}-${idx}`}>
                                {renderTrainRow(train)}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const getHoverBorder = () => {
        if (agency === 'metro') return 'hover:border-orange-300';
        if (agency === 'bizkaibus') return 'hover:border-green-300';
        if (agency === 'renfe') return 'hover:border-purple-300';
        return 'hover:border-red-300';
    };

    return (
        <button
            onClick={onTap}
            className={`w-full group p-4 rounded-2xl bg-white border transition-all duration-150 text-left ${
                agency === 'bizkaibus' 
                    ? 'border-2 border-slate-200 hover:border-green-500 hover:shadow-lg' 
                    : `border border-slate-200 ${getHoverBorder()} hover:shadow-md active:scale-[0.98]`
            }`}
        >
            {/* Header para Bizkaibus */}
            {agency === 'bizkaibus' && (
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                        {/* Logo de Bizkaibus */}
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-white flex items-center justify-center shrink-0 shadow-sm border border-slate-100">
                            <Image
                                src="/logoBizkaibus.png"
                                alt="Bizkaibus"
                                width={48}
                                height={48}
                                className="object-contain w-full h-full"
                                onError={(e) => {
                                    // Fallback if image doesn't exist
                                    e.currentTarget.style.display = 'none';
                                }}
                            />
                        </div>
                        
                        {/* Nombre de parada */}
                        <div className="flex-1 min-w-0">
                            <h3 className="text-base font-bold text-slate-900 leading-tight mb-0.5">
                                {name}
                            </h3>
                            <p className="text-xs font-semibold" style={{ color: '#22533d' }}>
                                bizkaibus
                            </p>
                        </div>
                    </div>
                    
                    {/* Botón GPS */}
                    {lat && lon && (
                        <a
                            href={`https://www.google.com/maps/search/?api=1&query=${lat},${lon}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-2.5 rounded-xl bg-slate-100 hover:bg-green-100 transition-colors shrink-0"
                            title="Ver en Google Maps"
                        >
                            <MapPin className="w-5 h-5 text-slate-600" />
                        </a>
                    )}
                </div>
            )}

            {/* Header para Metro/Bilbobus (diseño original) */}
            {agency !== 'bizkaibus' && (
                <div className="flex items-center justify-between gap-3 mb-3 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2 min-w-0">
                        <h3 className="text-base font-bold text-slate-900 truncate group-hover:text-slate-700 transition-colors">
                            {name}
                        </h3>
                    </div>
                    {distance !== null && (
                        <div className="flex items-center gap-1 shrink-0">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span className="text-xs font-medium text-slate-500">
                                {distance < 1 ? `${(distance * 1000).toFixed(0)}m` : `${distance.toFixed(1)}km`}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Trains Grid */}
            {renderContent()}
        </button>
    );
}
