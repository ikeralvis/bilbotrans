'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, AlertCircle, RefreshCw, Train, ChevronRight, Clock, Info, Accessibility } from 'lucide-react';

interface TrainRow {
    line: string;
    trainId: string;
    timeToGo: number;
    departure: string;
    arrival: string;
    duration: string;
    isAccessible: boolean;
    trans?: any;
}

export default function RenfeRouteClient() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const originId = searchParams.get('origin');
    const destId = searchParams.get('dest');

    const [trains, setTrains] = useState<TrainRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!originId || !destId) {
            setError('Origen y destino son requeridos');
            setIsLoading(false);
            return;
        }

        const fetchTrains = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // Use the local API route instead of fetching directly from Renfe
                const response = await fetch(`/api/renfe/schedule?origin=${originId}&dest=${destId}`);
                const data = await response.json();

                if (!data.ok) {
                    setError(data.error || 'Error al obtener los itinerarios');
                    setTrains([]);
                    return;
                }

                // Map the API response to TrainRow format
                const trainRows: TrainRow[] = (data.trains || []).map((train: any) => ({
                    line: train.line || '—',
                    trainId: `${train.departure}-${train.arrival}`,
                    timeToGo: Math.max(0, Math.floor((new Date(train.departureTime).getTime() - new Date().getTime()) / 60000)),
                    departure: train.departure || '—',
                    arrival: train.arrival || '—',
                    duration: train.duration || '—',
                    isAccessible: train.isAccessible || false,
                    trans: train,
                }));

                // Sort by time to go
                trainRows.sort((a, b) => a.timeToGo - b.timeToGo);
                setTrains(trainRows);
            } catch (err) {
                console.error('Error fetching trains:', err);
                setError('Error al cargar los trenes. Intenta de nuevo.');
                setTrains([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTrains();
    }, [originId, destId]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        setTimeout(() => setIsRefreshing(false), 1000);
    };

    const sortedTrains = useMemo(() => {
        return [...trains].sort((a, b) => a.timeToGo - b.timeToGo);
    }, [trains]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-purple-50 to-red-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-red-500 flex items-center justify-center mx-auto mb-4 animate-pulse">
                        <Train className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-slate-600 font-medium">Buscando trenes...</p>
                </div>
            </div>
        );
    }

    if (error || !originId || !destId) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-purple-50 to-red-50 px-4 py-8">
                <div className="max-w-lg mx-auto">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-6 font-medium"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Atrás
                    </button>

                    <div className="bg-white rounded-2xl p-6 text-center border-2 border-red-200">
                        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                        <p className="text-slate-900 font-semibold mb-1">{error || 'Datos incompletos'}</p>
                        <p className="text-sm text-slate-500">Vuelve atrás e intenta de nuevo</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-purple-50 to-red-50 pb-20">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-red-600 text-white px-4 py-6 shadow-lg">
                <div className="max-w-lg mx-auto flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        title="Atrás"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-lg font-bold">Trenes disponibles</h1>
                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
                        title="Actualizar"
                    >
                        <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Results */}
            <main className="max-w-lg mx-auto px-4 py-6 space-y-3">
                {sortedTrains.length > 0 ? (
                    sortedTrains.map((train) => (
                        <div
                            key={train.trainId}
                            className="bg-white rounded-2xl border-2 border-purple-100 hover:border-purple-300 transition-all p-4 cursor-pointer"
                        >
                            <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="flex-1">
                                    <div className="text-sm font-bold text-purple-600 mb-1">Línea {train.line}</div>
                                    <div className="text-xs text-slate-500">
                                        {train.timeToGo === 0 ? 'Salida inmediata' : `Salida en ${train.timeToGo} min`}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-bold text-slate-900">{train.departure}</div>
                                    <div className="text-xs text-slate-500">Salida</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 py-2 border-t border-b border-slate-100 mb-3">
                                <Clock className="w-4 h-4 text-slate-400" />
                                <span className="text-sm text-slate-600">{train.duration}</span>
                                {train.isAccessible && (
                                    <div className="ml-auto flex items-center gap-1 px-2 py-1 bg-green-100 rounded-lg">
                                        <Accessibility className="w-3 h-3 text-green-600" />
                                        <span className="text-xs font-medium text-green-600">Accesible</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="text-right">
                                    <div className="text-lg font-bold text-slate-900">{train.arrival}</div>
                                    <div className="text-xs text-slate-500">Llegada</div>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-300" />
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="bg-white rounded-2xl p-8 text-center border-2 border-purple-100">
                        <Info className="w-10 h-10 text-purple-300 mx-auto mb-3" />
                        <p className="text-slate-900 font-semibold mb-1">No hay trenes disponibles</p>
                        <p className="text-sm text-slate-500">Intenta con otras fechas u horarios</p>
                    </div>
                )}
            </main>
        </div>
    );
}
