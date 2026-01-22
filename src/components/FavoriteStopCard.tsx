import { AlertCircle, MapPin, Train, Bus } from 'lucide-react';
import { useGeolocation } from '@/context/GeolocationContext';
import { useEffect, useState } from 'react';
import { getMetroArrivalsByStop } from '@/lib/metro/api';
import { getBizkaibusArrivals } from '@/lib/bizkaibus/api';

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
        if (lineId.includes('L1')) return 'bg-orange-500';
        if (lineId.includes('L2')) return 'bg-emerald-500';
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
            <span className="text-sm font-medium text-slate-700 truncate flex-shrink-0 max-w-[80px]">
                {train.destination}
            </span>
        </div>
    );

    const renderContent = () => {
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

        if (agency === 'bizkaibus') {
            return (
                <div className="space-y-1">
                    {trainsL1.map((train, idx) => (
                        <div key={`biz-${train.destination}-${idx}`}>
                            {renderTrainRow(train)}
                        </div>
                    ))}
                </div>
            );
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

    const getAgencyIcon = () => {
        if (agency === 'metro') return <Train className="w-3.5 h-3.5 text-orange-600" />;
        if (agency === 'bizkaibus') return <Bus className="w-3.5 h-3.5 text-green-600" />;
        if (agency === 'renfe') return <Train className="w-3.5 h-3.5 text-purple-600" />;
        return <Bus className="w-3.5 h-3.5 text-red-600" />; // Bilbobus
    };

    const getAgencyBg = () => {
        if (agency === 'metro') return 'bg-orange-100';
        if (agency === 'bizkaibus') return 'bg-green-100';
        if (agency === 'renfe') return 'bg-purple-100';
        return 'bg-red-100';
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
            className={`w-full group p-4 rounded-2xl bg-white border border-slate-200 
                     ${getHoverBorder()} hover:shadow-md active:scale-[0.98] 
                     transition-all duration-150 text-left`}
        >
            {/* Header */}
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

            {/* Trains Grid */}
            {renderContent()}
        </button>
    );
}
