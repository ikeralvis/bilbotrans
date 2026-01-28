'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ArrowLeft, Loader2, RefreshCw, Bell, AlertTriangle } from 'lucide-react';
import { MetroAlertsConfig } from '@/components/MetroAlertsConfig';
import { MetroIncidents } from '@/components/MetroIncidents';

// Import station data
import stationsData from '@/data/metro/stations.json';

// Import map component dynamically to avoid SSR issues
const MetroMapContent = dynamic(() => import('@/components/MetroMapContent'), {
    ssr: false,
    loading: () => (
        <div className="flex-1 flex items-center justify-center bg-slate-100">
            <div className="text-center">
                <Loader2 className="w-10 h-10 animate-spin text-orange-500 mx-auto mb-4" />
                <p className="text-slate-600">Cargando visualización...</p>
            </div>
        </div>
    )
});

interface TrainInfo {
    lineId: string;
    trainId: string;
    destination: string;
    currentStation: string;
    nextStation: string;
    etaMinutes: number;
}

export default function MetroMapPage() {
    const router = useRouter();
    const [trains, setTrains] = useState<TrainInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showAlertsConfig, setShowAlertsConfig] = useState(false);
    const [showIncidents, setShowIncidents] = useState(false);

    const lines = Object.values(stationsData) as any[];

    const updateTrains = async () => {
        try {
            setIsRefreshing(true);
            setError(null);

            const response = await fetch('/api/metro/trains');
            if (!response.ok) throw new Error('Failed to fetch trains');

            const data = await response.json();
            setTrains(data.trains || []);
            setLastUpdate(new Date());
        } catch (err) {
            console.error('Error updating trains:', err);
            setError('Error al cargar los trenes');
        } finally {
            setIsRefreshing(false);
            setIsLoading(false);
        }
    };

    useEffect(() => {
        updateTrains();
        const interval = setInterval(updateTrains, 30000);
        return () => clearInterval(interval);
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-orange-500 mx-auto mb-4" />
                    <p className="text-lg font-semibold text-slate-700">Cargando mapa del metro...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen flex flex-col bg-slate-900 overflow-hidden">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-700" />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900">Mapa del Metro en Tiempo Real</h1>
                        <p className="text-xs text-slate-500">
                            {trains.length} {trains.length === 1 ? 'tren' : 'trenes'} en circulación
                        </p>
                    </div>
                </div>2">
                    {lastUpdate && (
                        <span className="text-xs text-slate-500 hidden sm:inline">
                            Actualizado: {lastUpdate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    )}
                    <button
                        onClick={() => setShowIncidents(true)}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Ver avisos"
                    >
                        <AlertTriangle className="w-5 h-5 text-slate-700" />
                    </button>
                    <button
                        onClick={() => setShowAlertsConfig(true)}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Configurar alertas"
                    >
                        <Bell className="w-5 h-5 text-slate-700" />
                    </button>      Actualizado: {lastUpdate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    )}
                    <button
                        onClick={updateTrains}
                        disabled={isRefreshing}
                        className="p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-50"
                        title="Actualizar"
                    >
                        <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Map Container */}
            <div className="flex-1 relative">
                {error && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
                        {error}
                    </div>
                )}

                {/* Legend */}
                <div className="absolute bottom-6 left-6 z-[1000] bg-white/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-xl border border-slate-200 hidden sm:block">
                    <h3 className="text-xs font-bold text-slate-700 mb-2 font-mono uppercase tracking-wider">Líneas</h3>
                    <div className="space-y-2">
                        {lines.map((line: any) => (

            {/* Modals */}
            <MetroAlertsConfig 
                isOpen={showAlertsConfig} 
                onClose={() => setShowAlertsConfig(false)} 
            />
            
            {/* Modal de incidencias */}
            {showIncidents && (
                <>
                    <div
                        className="fixed inset-0 bg-black/50 z-50"
                        onClick={() => setShowIncidents(false)}
                    />
                    <div className="fixed inset-x-0 bottom-0 z-50 animate-slideUp">
                        <div className="bg-white rounded-t-3xl shadow-2xl max-h-[80vh] overflow-y-auto">
                            <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-4 flex items-center justify-between rounded-t-3xl">
                                <h2 className="text-lg font-bold text-slate-900">Avisos del Metro</h2>
                                <button
                                    onClick={() => setShowIncidents(false)}
                                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                                </button>
                            </div>
                            <div className="p-4">
                                <MetroIncidents isEmbedded />
                            </div>
                        </div>
                    </div>
                </>
            )}
                            <div key={line.id} className="flex items-center gap-2">
                                <div
                                    className="w-3 h-3 rounded-full border border-white shadow-sm"
                                    style={{ backgroundColor: line.color }}
                                />
                                <span className="text-xs font-bold text-slate-700">{line.id}</span>
                                <span className="text-[10px] text-slate-500">{line.name}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <MetroMapContent trains={trains} />
            </div>
        </div>
    );
}
