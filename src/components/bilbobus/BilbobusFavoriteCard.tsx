'use client';

import { useState, useEffect } from 'react';
import { MapPin, Bus, Loader2, Settings, Heart } from 'lucide-react';
import { getBilbobusStopById } from '@/lib/bilbobus/client-search';
import { BilbobusStop } from '@/lib/bilbobus/api';

interface BilbobusFavoriteCardProps {
    stopId: string;
    stopName: string;
    selectedLines: string[];
    onConfigure?: () => void;
    onRemove?: () => void;
}

interface Arrival {
    lineId: string;
    destination: string;
    etaMinutes: number;
    etaDisplay: string;
}

export default function BilbobusFavoriteCard({ 
    stopId, 
    stopName, 
    selectedLines,
    onConfigure,
    onRemove 
}: BilbobusFavoriteCardProps) {
    const [arrivals, setArrivals] = useState<Arrival[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        fetchArrivals();
        const interval = setInterval(fetchArrivals, 30000); // Actualizar cada 30s
        return () => clearInterval(interval);
    }, [stopId, selectedLines]);

    const fetchArrivals = async () => {
        try {
            setError(false);
            const linesParam = selectedLines.join(',');
            const response = await fetch(`/api/bilbobus/arrivals?stopId=${stopId}&lines=${linesParam}`);
            
            if (!response.ok) throw new Error('Failed to fetch');
            
            const data = await response.json();
            setArrivals(data.arrivals || []);
        } catch (err) {
            console.error('Error fetching arrivals:', err);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    const stop = getBilbobusStopById(stopId);

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-100">
                <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-red-600 flex items-center justify-center shrink-0">
                        <MapPin className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-900 truncate">
                            {stopName}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                            ID: {stopId} • {selectedLines.length} {selectedLines.length === 1 ? 'línea' : 'líneas'}
                        </p>
                        {/* Lines badges */}
                        <div className="flex flex-wrap gap-1 mt-2">
                            {selectedLines.map(line => (
                                <span key={line} className="inline-flex items-center px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded">
                                    {line}
                                </span>
                            ))}
                        </div>
                    </div>
                    <button
                        onClick={onConfigure}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
                        title="Configurar"
                    >
                        <Settings className="w-4 h-4 text-slate-400" />
                    </button>
                </div>
            </div>

            {/* Arrivals */}
            <div className="px-4 py-4">
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-red-600" />
                        <span className="ml-2 text-sm text-slate-500">Cargando tiempos...</span>
                    </div>
                ) : error ? (
                    <div className="text-center py-8">
                        <Bus className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">Error al cargar tiempos</p>
                        <button
                            onClick={fetchArrivals}
                            className="mt-2 text-xs text-red-600 hover:underline"
                        >
                            Reintentar
                        </button>
                    </div>
                ) : arrivals.length === 0 ? (
                    <div className="text-center py-8">
                        <Bus className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">No hay llegadas próximas</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                        <div className="flex gap-3">
                            {arrivals.slice(0, 5).map((arrival, index) => (
                                <div 
                                    key={`${arrival.lineId}-${index}`}
                                    className="flex-shrink-0 w-28 bg-slate-50 rounded-2xl p-3 text-center border border-slate-100"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold text-sm mx-auto mb-2">
                                        {arrival.lineId}
                                    </div>
                                    <p className="text-xs text-slate-600 truncate mb-1">
                                        {arrival.destination}
                                    </p>
                                    <p className={`text-base font-bold ${
                                        arrival.etaMinutes <= 2 ? 'text-red-600' : 'text-slate-900'
                                    }`}>
                                        {arrival.etaDisplay}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-4 pb-4">
                <button
                    onClick={() => window.location.href = `/bilbobus/stop/${stopId}`}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors text-sm"
                >
                    Ver detalles completos
                </button>
            </div>
        </div>
    );
}
