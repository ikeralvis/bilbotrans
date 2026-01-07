import { AlertCircle, TramFront, Route } from 'lucide-react';

interface Exit {
    id: number;
    name: string;
    elevator: boolean;
    nocturnal: boolean;
}

interface TransportCardProps {
    agency: 'metro' | 'bizkaibus' | 'bilbobus';
    lineId: string;
    destination: string;
    etaMinutes: number;
    color?: string;
    vehicleId?: string;
    wagons?: number;
    duration?: number;
    originExits?: Exit[];
    destinationExits?: Exit[];
}

export function TransportCard({ 
    agency, 
    lineId, 
    destination, 
    etaMinutes, 
    color, 
    vehicleId, 
    wagons,
    duration,
    originExits,
    destinationExits
}: TransportCardProps) {
    // Agency config
    const config = {
        metro: { bg: 'bg-orange-500', text: 'text-white', label: 'Metro', dot: 'bg-orange-500' },
        bizkaibus: { bg: 'bg-green-600', text: 'text-white', label: 'Bizkaibus', dot: 'bg-green-600' },
        bilbobus: { bg: 'bg-red-600', text: 'text-white', label: 'Bilbobus', dot: 'bg-red-600' }
    };

    const theme = config[agency];
    const isImminent = etaMinutes <= 2;
    const isArrived = etaMinutes <= 0;

    return (
        <div className="flex items-center justify-between p-3 rounded-lg bg-white 
                      border border-slate-100 hover:border-slate-200 hover:shadow-sm 
                      hover:bg-slate-50 transition-smooth active:scale-[0.98] duration-200 animate-fadeIn">
            {/* Left: Line + Destination */}
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                {/* Line Badge */}
                <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${theme.bg} ${theme.text} 
                              font-bold text-sm shadow-sm flex-shrink-0`}>
                    {lineId ? lineId.slice(0, 2) : '??'}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 text-sm leading-tight truncate">
                        {destination}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                        {wagons && agency === 'metro' && (
                            <span className="flex items-center gap-0.5">
                                <TramFront className="w-3 h-3" />
                                {wagons}
                            </span>
                        )}
                        {duration && (
                            <span className="flex items-center gap-0.5">
                                <Route className="w-3 h-3" />
                                {duration}m
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Right: ETA */}
            <div className="flex flex-col items-end gap-0.5 flex-shrink-0 ml-3">
                {isArrived ? (
                    <div className="px-2 py-1 rounded bg-green-100">
                        <span className="text-xs font-bold text-green-700">Aquí</span>
                    </div>
                ) : (
                    <>
                        <div className={`text-lg font-bold transition-colors ${
                            isImminent ? 'text-red-600' : 'text-slate-900'
                        }`}>
                            {etaMinutes}
                        </div>
                        <span className="text-xs text-slate-400 font-medium">min</span>
                    </>
                )}
            </div>
        </div>
    );
}

