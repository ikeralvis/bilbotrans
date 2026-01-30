import { TramFront, Route } from 'lucide-react';

interface Exit {
    id: number;
    name: string;
    elevator: boolean;
    nocturnal: boolean;
}

interface TransportCardProps {
    agency: 'metro' | 'bizkaibus' | 'bilbobus' | 'renfe';
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
}: Readonly<TransportCardProps>) {
    // Agency config con colores oficiales de Bizkaibus
    const config = {
        metro: { bg: 'bg-orange-500', text: 'text-white', label: 'Metro', dot: 'bg-orange-500' },
        bizkaibus: { bg: '#22533d', text: 'text-white', label: 'Bizkaibus', dot: '#a5ca71', bgLight: '#a5ca71' },
        bilbobus: { bg: 'bg-red-600', text: 'text-white', label: 'Bilbobus', dot: 'bg-red-600' },
        renfe: { bg: 'bg-purple-600', text: 'text-white', label: 'Renfe', dot: 'bg-purple-600' }
    };

    const theme = config[agency];
    const isImminent = etaMinutes <= 2;
    const isArrived = etaMinutes <= 0;

    // Extract clean line name
    const getLineDisplay = (line: string): string => {
        if (agency === 'metro') {
            const regex = /L[1-3]/;
            const match = regex.exec(line);
            return match ? match[0] : line.slice(0, 2);
        }
        // Para Bizkaibus, mostrar línea completa (A3250, A3247, etc.)
        return line;
    };

    // Line color based on agency and line
    const getLineColor = (line: string): string => {
        if (agency === 'metro') {
            if (line.includes('L1')) return 'bg-[#f14e2d]';
            if (line.includes('L2')) return 'bg-[#242324]';
            if (line.includes('L3')) return 'bg-blue-600';
        }
        if (agency === 'bizkaibus') {
            // Verde oscuro de Bizkaibus
            return '';
        }
        return typeof theme.bg === 'string' && theme.bg.startsWith('bg-') ? theme.bg : 'bg-slate-600';
    };

    // Estilo especial para badge de Bizkaibus
    const getLineBadgeStyle = () => {
        if (agency === 'bizkaibus') {
            return {
                backgroundColor: '#22533d',
                color: '#a5ca71'
            };
        }
        return {};
    };

    return (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-white 
                      border border-slate-200 hover:border-slate-300 hover:shadow-md 
                      transition-all duration-200 animate-fadeIn">
            {/* Left: Line + Destination */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Line Badge - Más ancho para líneas largas */}
                <div 
                    className={`flex items-center justify-center min-w-[3rem] h-11 px-2 rounded-lg
                              font-bold text-sm shadow-sm shrink-0 ${
                                  agency === 'bizkaibus' ? '' : `${getLineColor(lineId)} text-white`
                              }`}
                    style={agency === 'bizkaibus' ? getLineBadgeStyle() : {}}
                >
                    <span className="text-center leading-tight">{getLineDisplay(lineId)}</span>
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
            <div className="flex flex-col items-end gap-0.5 shrink-0 ml-3">
                {isArrived ? (
                    <div className="px-2 py-1 rounded bg-green-100">
                        <span className="text-xs font-bold text-green-700">Aquí</span>
                    </div>
                ) : (
                    <>
                        <div className={`text-lg font-bold transition-colors ${isImminent ? 'text-red-600' : 'text-slate-900'
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

