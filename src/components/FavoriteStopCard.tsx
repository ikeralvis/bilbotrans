import { AlertCircle, MapPin, Train, Bus } from 'lucide-react';
import { useGeolocation } from '@/context/GeolocationContext';
import { useEffect, useState } from 'react';
import { getMetroArrivalsByStop } from '@/lib/metro';
import { getBizkaibusArrivals } from '@/lib/bizkaibus';

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
                    const l1 = arrivals.filter(a => a.lineId.includes('L1')).slice(0, 2);
                    const l2 = arrivals.filter(a => a.lineId.includes('L2')).slice(0, 2);

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

    const renderTrainRow = (train: TrainInfo, lineColor: string) => (
        <div className="flex items-center justify-between gap-1 text-xs">
            <div className="flex items-center gap-1 min-w-0">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold text-white shrink-0 ${lineColor}`}>
                    {getCleanLineId(train.lineId)}
                </span>
                <span className="text-slate-600 truncate">{train.destination}</span>
            </div>
            <span className={`font-bold shrink-0 ${train.etaMinutes <= 5 ? 'text-red-500' : 'text-slate-800'}`}>
                {train.etaMinutes <= 0 ? 'Aquí' : `${train.etaMinutes}'`}
            </span>
        </div>
    );

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="grid grid-cols-2 gap-2">
                    <div className="h-8 bg-slate-100 rounded animate-pulse" />
                    <div className="h-8 bg-slate-100 rounded animate-pulse" />
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
                            {renderTrainRow(train, 'bg-green-600')}
                        </div>
                    ))}
                </div>
            );
        }

        return (
            <div className="grid grid-cols-2 gap-3">
                {/* Línea 1 */}
                {trainsL1.length > 0 && (
                    <div className="space-y-1">
                        {trainsL1.map((train, idx) => (
                            <div key={`l1-${train.destination}-${idx}`}>
                                {renderTrainRow(train, 'bg-orange-500')}
                            </div>
                        ))}
                    </div>
                )}

                {/* Línea 2 */}
                {trainsL2.length > 0 && (
                    <div className="space-y-1">
                        {trainsL2.map((train, idx) => (
                            <div key={`l2-${train.destination}-${idx}`}>
                                {renderTrainRow(train, 'bg-green-600')}
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
            className={`w-full group p-3 rounded-xl bg-white border border-slate-200 
                     ${getHoverBorder()} hover:shadow-sm active:scale-[0.98] 
                     transition-all duration-150 text-left`}
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${getAgencyBg()}`}>
                        {getAgencyIcon()}
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 truncate group-hover:text-slate-700 transition-colors">
                        {name}
                    </h3>
                </div>
                {distance !== null && (
                    <div className="flex items-center gap-0.5 shrink-0">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span className="text-[10px] font-medium text-slate-500">
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
