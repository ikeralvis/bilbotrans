import { AlertCircle, MapPin, Zap } from 'lucide-react';
import Image from 'next/image';
import { useGeolocation } from '@/context/GeolocationContext';
import { useEffect, useState } from 'react';
import { getMetroArrivalsByStop } from '@/lib/metro';

interface FavoriteStopCardProps {
    stopId: string;
    name: string;
    agency: 'metro' | 'bilbobus';
    lat?: number;
    lon?: number;
    lines?: string[];
    onTap?: () => void;
}

interface Train {
    destination: string;
    etaMinutes: number;
    wagons?: number;
    lineId: string;
}

export function FavoriteStopCard({ stopId, name, agency, lat, lon, lines, onTap }: Readonly<FavoriteStopCardProps>) {
    const { calculateDistance, location } = useGeolocation();
    const [trainsL1, setTrainsL1] = useState<Train[]>([]);
    const [trainsL2, setTrainsL2] = useState<Train[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const distance = lat && lon && location ? calculateDistance(lat, lon) : null;

    // Cargar trenes al montar el componente - 2 por línea
    useEffect(() => {
        if (agency === 'metro') {
            const loadTrains = async () => {
                setIsLoading(true);
                setError(null);
                try {
                    const arrivals = await getMetroArrivalsByStop(stopId);
                    
                    // Separar por línea
                    const l1 = arrivals.filter(a => a.lineId.includes('L1')).slice(0, 2);
                    const l2 = arrivals.filter(a => a.lineId.includes('L2')).slice(0, 2);
                    
                    setTrainsL1(l1.map(a => ({
                        destination: a.destination,
                        etaMinutes: a.etaMinutes,
                        wagons: a.wagons,
                        lineId: a.lineId
                    })));
                    
                    setTrainsL2(l2.map(a => ({
                        destination: a.destination,
                        etaMinutes: a.etaMinutes,
                        wagons: a.wagons,
                        lineId: a.lineId
                    })));
                    
                    if (l1.length === 0 && l2.length === 0) {
                        setError('Sin trenes disponibles');
                    }
                } catch (err) {
                    console.error('Error loading trains:', err);
                    setError('Error cargando horarios');
                }
                setIsLoading(false);
            };
            loadTrains();
        }
    }, [stopId, agency]);

    // Colores según agencia
    const agencyConfig = {
        metro: { dot: 'bg-orange-500', shadow: 'shadow-orange-500/20', label: 'Metro' },
        bilbobus: { dot: 'bg-red-600', shadow: 'shadow-red-600/20', label: 'Bilbobus' },
    };

    const config = agencyConfig[agency];

    const renderLineSection = (lineId: string, trains: Train[], hasData: boolean) => {
        if (!hasData || trains.length === 0) return null;
        
        return (
            <div key={lineId} className="space-y-1">
                {trains.map((train, idx) => (
                    <div 
                        key={`${lineId}-${idx}`} 
                        className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 group-hover:bg-blue-50 transition-colors"
                    >
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold text-white flex-shrink-0 ${
                                lineId === 'L1' ? 'bg-orange-500' : 'bg-green-600'
                            }`}>
                                {lineId}
                            </span>
                            <span className="text-xs font-medium text-slate-700 truncate line-clamp-1">
                                {train.destination}
                            </span>
                        </div>
                        <span className={`text-xs font-bold ml-1 flex-shrink-0 ${
                            train.etaMinutes <= 2 ? 'text-red-600' : 'text-slate-900'
                        }`}>
                            {train.etaMinutes <= 0 ? 'Now' : `${train.etaMinutes}m`}
                        </span>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <button
            onClick={onTap}
            className="w-full group relative p-3 rounded-xl bg-white border border-slate-100/80 
                     hover:border-slate-200 hover:shadow-md active:scale-[0.98] 
                     transition-all duration-200 text-left hover:bg-slate-50"
        >
            {/* Nombre parada + distancia */}
            <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-slate-950 line-clamp-2">
                        {name}
                    </h3>
                    <div className="flex items-center gap-1 mt-1">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            agency === 'metro' ? 'bg-orange-500' : 'bg-red-600'
                        }`} />
                        <span className="text-xs text-slate-500">
                            {agency === 'metro' ? 'Metro' : 'Bilbobus'}
                        </span>
                    </div>
                </div>
                {distance !== null && (
                    <div className="flex items-center gap-1 flex-shrink-0 text-right">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        <span className="text-xs font-semibold text-slate-600">
                            {distance < 1 ? (distance * 1000).toFixed(0) + 'm' : distance.toFixed(1) + 'km'}
                        </span>
                    </div>
                )}
            </div>

            {/* Próximos trenes */}
            {isLoading ? (
                <div className="space-y-1">
                    <div className="h-7 bg-slate-100 rounded animate-pulse" />
                    <div className="h-7 bg-slate-100 rounded animate-pulse" />
                </div>
            ) : error ? (
                <div className="p-2 rounded-lg bg-red-50 flex items-center gap-1.5 text-xs text-red-600">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            ) : (trainsL1.length > 0 || trainsL2.length > 0) ? (
                <div className="space-y-1 text-xs">
                    {renderLineSection('L1', trainsL1, trainsL1.length > 0)}
                    {renderLineSection('L2', trainsL2, trainsL2.length > 0)}
                </div>
            ) : null}
        </button>
    );
}
