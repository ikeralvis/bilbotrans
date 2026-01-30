'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Info, AlertCircle, RefreshCw, Train } from 'lucide-react';

interface RenfeIncident {
    id: string;
    type: 'warning' | 'info' | 'error';
    title: string;
    description: string;
    lines: string[];
    station?: string;
}

interface RenfeIncidentsProps {
    compact?: boolean;
    maxItems?: number;
}

export default function RenfeIncidents({ compact = false, maxItems = 5 }: RenfeIncidentsProps) {
    const [incidents, setIncidents] = useState<RenfeIncident[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAll, setShowAll] = useState(false);

    const fetchIncidents = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/renfe/incidents');
            const data = await response.json();
            
            if (data.ok) {
                setIncidents(data.incidents.slice(0, maxItems));
            } else {
                setError(data.error || 'Error al cargar incidencias');
            }
        } catch (err) {
            setError('Error de conexión');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchIncidents();
    }, [maxItems]);

    const getIcon = (type: string) => {
        switch (type) {
            case 'error':
                return <AlertCircle className="w-4 h-4 text-red-500" />;
            case 'warning':
                return <AlertTriangle className="w-4 h-4 text-amber-500" />;
            default:
                return <Info className="w-4 h-4 text-blue-500" />;
        }
    };

    const getBgColor = (type: string) => {
        switch (type) {
            case 'error':
                return 'bg-red-50 border-red-200';
            case 'warning':
                return 'bg-amber-50 border-amber-200';
            default:
                return 'bg-blue-50 border-blue-200';
        }
    };

    const getLineColor = (line: string): string => {
        const colors: Record<string, string> = {
            'C1': 'bg-purple-600',
            'C2': 'bg-green-600',
            'C3': 'bg-red-600',
            'C4': 'bg-amber-500',
        };
        return colors[line] || 'bg-slate-500';
    };

    if (isLoading) {
        return (
            <div className="space-y-2">
                {[1, 2].map(i => (
                    <div key={i} className="animate-pulse bg-slate-100 rounded-xl h-16" />
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                <p className="text-sm text-slate-500">{error}</p>
                <button 
                    onClick={fetchIncidents}
                    className="mt-2 text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1 mx-auto"
                >
                    <RefreshCw className="w-3 h-3" /> Reintentar
                </button>
            </div>
        );
    }

    if (incidents.length === 0) {
        return (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                    <Train className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-sm font-medium text-green-800">Sin incidencias</p>
                <p className="text-xs text-green-600 mt-0.5">El servicio funciona con normalidad</p>
            </div>
        );
    }

    if (compact) {
        const displayIncidents = showAll ? incidents : incidents.slice(0, 3);
        return (
            <div className="space-y-2">
                {displayIncidents.map((incident) => (
                    <div
                        key={incident.id}
                        className={`${getBgColor(incident.type)} border rounded-xl px-3 py-2 flex items-start gap-2`}
                    >
                        <div className="mt-0.5">{getIcon(incident.type)}</div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{incident.title}</p>
                            <p className="text-xs text-slate-600 line-clamp-1">{incident.description}</p>
                        </div>
                    </div>
                ))}
                {incidents.length > 3 && (
                    <button 
                        onClick={() => setShowAll(!showAll)}
                        className="w-full text-xs text-purple-600 font-medium text-center hover:text-purple-700 py-2"
                    >
                        {showAll ? 'Ver menos' : `Ver ${incidents.length - 3} más`}
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {incidents.map((incident) => (
                <div
                    key={incident.id}
                    className={`${getBgColor(incident.type)} border rounded-2xl p-4`}
                >
                    <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex-shrink-0">{getIcon(incident.type)}</div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="text-sm font-bold text-slate-900">{incident.title}</span>
                                {incident.lines.map((line) => (
                                    <span
                                        key={line}
                                        className={`${getLineColor(line)} text-white px-1.5 py-0.5 rounded text-[10px] font-bold`}
                                    >
                                        {line}
                                    </span>
                                ))}
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed">{incident.description}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
