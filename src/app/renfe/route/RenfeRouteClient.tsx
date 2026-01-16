'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, AlertCircle, RefreshCw, Train, ChevronRight, Clock, Info, Accessibility, MapPin, ArrowRight, Timer } from 'lucide-react';
import renfeStopsData from '@/data/renfe/stops.json';

interface TrainRow {
    line: string;
    trainId: string;
    timeToGo: number;
    departure: string;
    arrival: string;
    duration: string;
    isAccessible: boolean;
    destination?: string;
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

    const originName = useMemo(() => {
        const stop = (renfeStopsData as any[]).find(s => s.id === originId);
        return stop ? stop.name : 'Origen';
    }, [originId]);

    const destName = useMemo(() => {
        const stop = (renfeStopsData as any[]).find(s => s.id === destId);
        return stop ? stop.name : 'Destino';
    }, [destId]);

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
                    trainId: `${train.trainId}`,
                    timeToGo: train.timeToGo || 0,
                    departure: train.departure || '—',
                    arrival: train.arrival || '—',
                    duration: train.duration || '—',
                    isAccessible: train.isAccessible || false,
                    destination: train.trans?.estacionDestino || train.trans?.estDestino || undefined,
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

    const handleBack = () => {
        router.push('/?tab=renfe');
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
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header section with Origin -> Destination */}
            <div className="bg-gradient-to-r from-purple-800 to-red-600 text-white shadow-xl sticky top-0 z-10 pt-4 pb-6 px-4">
                <div className="max-w-lg mx-auto">
                    <div className="flex items-center justify-between mb-4">
                        <button
                            onClick={handleBack}
                            className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <h1 className="text-sm font-semibold uppercase tracking-widest text-white/80">Cercanías Renfe</h1>
                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="p-2 -mr-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-white/60 font-medium mb-0.5">ORIGEN</p>
                            <p className="text-lg font-bold truncate">{originName || '—'}</p>
                        </div>
                        <div className="flex items-center justify-center p-2 bg-white/20 rounded-full">
                            <ArrowRight className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0 text-right">
                            <p className="text-xs text-white/60 font-medium mb-0.5">DESTINO</p>
                            <p className="text-lg font-bold truncate">{destName || '—'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Results list */}
            <main className="max-w-xl mx-auto px-4 py-8 space-y-4">
                {sortedTrains.length > 0 ? (
                    sortedTrains.map((train) => (
                        <div
                            key={train.trainId}
                            className="bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow active:scale-[0.98] transition-transform cursor-pointer group"
                        >
                            <div className="flex flex-col">
                                {/* Top bar with Line information */}
                                <div className="px-5 py-3 bg-slate-50 flex items-center justify-between border-b border-separate border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-purple-600 text-white text-xs font-black px-2 py-1 rounded-md shadow-sm">
                                            {train.line}
                                        </div>
                                        {train.destination && (
                                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-tight">
                                                Hacia {train.destination}
                                            </div>
                                        )}
                                    </div>
                                    {train.isAccessible && (
                                        <div className="bg-green-100 p-1 rounded-full">
                                            <Accessibility className="w-3.5 h-3.5 text-green-600" />
                                        </div>
                                    )}
                                </div>

                                <div className="p-5 flex items-center justify-between gap-6">
                                    {/* Main Time Left / Departure info */}
                                    <div className="flex flex-col">
                                        {train.timeToGo < 10 ? (
                                            <div className="flex flex-col">
                                                <div className="flex items-end gap-1.5 leading-none">
                                                    <span className="text-5xl font-black text-slate-900">{train.timeToGo}</span>
                                                    <span className="text-lg font-bold text-slate-400 pb-1">min</span>
                                                </div>
                                                <div className="text-xs font-bold text-green-600 mt-2 flex items-center gap-1 uppercase tracking-wider">
                                                    <Timer className="w-3 h-3" />
                                                    Llega pronto
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col">
                                                <div className="text-4xl font-black text-slate-900 leading-none">
                                                    {train.departure}
                                                </div>
                                                <div className="text-xs font-bold text-purple-600 mt-2 flex items-center gap-1 uppercase tracking-wider">
                                                    <Clock className="w-3 h-3" />
                                                    Salida programada
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Arrival info */}
                                    <div className="flex flex-col items-end text-right">
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                            Llegada <ChevronRight className="w-3 h-3" />
                                        </div>
                                        <div className="text-2xl font-black text-slate-800 tracking-tight">
                                            {train.arrival}
                                        </div>
                                        <div className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full mt-2">
                                            Prev. {train.duration}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="bg-white rounded-[32px] p-12 text-center shadow-sm border border-slate-100">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Train className="w-10 h-10 text-slate-300" />
                        </div>
                        <p className="text-xl font-bold text-slate-900 mb-2">Sin trenes cercanos</p>
                        <p className="text-slate-500 max-w-[240px] mx-auto leading-relaxed">
                            No hemos encontrado servicios programados para el trayecto seleccionado ahora mismo.
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
}

