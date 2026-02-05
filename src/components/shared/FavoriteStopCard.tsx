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

    const renderTrainRow = (train: TrainInfo) => {
        const isUrgent = train.etaMinutes < 2;
        return (
        <div className={`flex items-center justify-between gap-2 py-1 ${isUrgent ? 'animate-pulse' : ''}`}>
            <div className="flex items-baseline gap-1.5 flex-1 min-w-0">
                <span className={`text-lg font-bold leading-none ${
                    isUrgent ? 'text-red-600' : 'text-slate-900'
                }`}>
                    {train.etaMinutes <= 0 ? '0' : train.etaMinutes}
                </span>
                <span className={`text-xs font-medium ${
                    isUrgent ? 'text-red-500' : 'text-slate-500'
                }`}>min</span>
            </div>
            <span className="text-sm font-medium text-slate-700 truncate max-w-24">
                {train.destination}
            </span>
        </div>
    );
    };

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
                <div className="space-y-1.5">
                    <div className="flex items-center gap-3 py-1">
                        <div className="w-8 h-7 bg-slate-200 rounded animate-pulse" />
                        <div className="flex-1 h-6 bg-slate-200 rounded animate-pulse" />
                    </div>
                    <div className="flex items-center gap-3 py-1">
                        <div className="w-8 h-7 bg-slate-200 rounded animate-pulse" />
                        <div className="flex-1 h-6 bg-slate-200 rounded animate-pulse" />
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

        // Metro: lista simple pero agrupada por línea
        const hasBothLines = trainsL1.length > 0 && trainsL2.length > 0;
        
        return (
            <div className="space-y-0">
                {/* Andén 1 - L1 */}
                {trainsL1.length > 0 && (
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-2 mb-1">
                        
                            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Andén 1</span>
                        </div>
                        {trainsL1.slice(0, 2).map((train, idx) => (
                            <div key={`l1-${train.destination}-${idx}`}>
                                {renderTrainRow(train)}
                            </div>
                        ))}
                    </div>
                )}
                
                {/* Separador entre andenes */}
                {hasBothLines && (
                    <div className="my-2 border-t border-slate-200" />
                )}
                
                {/* Andén 2 - L2 */}
                {trainsL2.length > 0 && (
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-2 mb-1">
                            
                            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Andén 2</span>
                        </div>
                        {trainsL2.slice(0, 2).map((train, idx) => (
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
            className={`w-full group p-4 rounded-2xl bg-gradient-to-br from-white to-slate-50 border-2 transition-all duration-200 text-left active:scale-95 ${
                agency === 'metro'
                    ? 'border-orange-200 hover:border-orange-400 hover:shadow-lg hover:shadow-orange-100'
                    : agency === 'bizkaibus'
                    ? 'border-green-200 hover:border-green-400 hover:shadow-lg hover:shadow-green-100'
                    : agency === 'renfe'
                    ? 'border-purple-200 hover:border-purple-400 hover:shadow-lg hover:shadow-purple-100'
                    : 'border-red-200 hover:border-red-400 hover:shadow-lg hover:shadow-red-100'
            }`}
        >
            {/* Header para Bizkaibus */}
            {agency === 'bizkaibus' && (
                <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                        {/* Logo de Bizkaibus */}
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-white flex items-center justify-center shrink-0 shadow-sm border border-slate-100">
                            <Image
                                src="/logoBizkaibus.png"
                                alt="Bizkaibus"
                                width={40}
                                height={40}
                                className="object-contain w-full h-full"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                }}
                            />
                        </div>
                        
                        {/* Nombre de parada */}
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-slate-900 leading-tight mb-0">
                                {name}
                            </h3>
                        </div>
                    </div>
                    
                    {/* Botón GPS */}
                    {lat && lon && (
                        <a
                            href={`https://www.google.com/maps/search/?api=1&query=${lat},${lon}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-green-100 transition-colors shrink-0"
                            title="Ver en Google Maps"
                        >
                            <MapPin className="w-4 h-4 text-slate-600" />
                        </a>
                    )}
                </div>
            )}

            {/* Header para Metro/Bilbobus */}
            {agency !== 'bizkaibus' && (
                <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-slate-900 truncate group-hover:text-slate-700 transition-colors">
                        {name}
                    </h3>
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
