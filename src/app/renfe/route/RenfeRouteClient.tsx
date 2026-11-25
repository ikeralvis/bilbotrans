'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, AlertCircle, RefreshCw, Train, ChevronRight, Clock, Accessibility, ArrowRight, Timer } from 'lucide-react';
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
    delayMin?: number;
}

const getLineColor = (line: string): string => {
    const colors: Record<string, string> = {
        'C1': 'bg-purple-600',
        'C2': 'bg-green-600',
        'C3': 'bg-red-600',
        'C4': 'bg-amber-500',
    };
    return colors[line] || 'bg-slate-500';
};

export default function RenfeRouteClient() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const originId = searchParams.get('origin');
    const destId = searchParams.get('dest');

    const [trains, setTrains] = useState<TrainRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [delayMap, setDelayMap] = useState<Record<string, number>>({});

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
                // Fetch schedule and delays in parallel
                const [scheduleRes, delaysRes] = await Promise.all([
                    fetch(`/api/renfe/schedule?origin=${originId}&dest=${destId}`),
                    fetch('/api/renfe/delays')
                ]);
                
                const data = await scheduleRes.json();
                const delaysData = await delaysRes.json();
                
                // Build delay map
                const delays: Record<string, number> = delaysData.ok ? delaysData.delayMap : {};
                setDelayMap(delays);

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
                    delayMin: delays[`${train.trainId}`] || undefined,
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
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <img 
                        src="/icons/icon-192x192.png" 
                        alt="BilboTrans" 
                        className="w-16 h-16 mx-auto mb-4 animate-pulse"
                    />
                    <p className="text-slate-600 font-medium">Buscando trenes...</p>
                </div>
            </div>
        );
    }

    if (error || !originId || !destId) {
        return (
            <div className="min-h-screen bg-slate-50 px-4 py-8">
                <div className="max-w-lg mx-auto">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-purple-600 hover:text-purple-700 mb-6 font-medium"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Atrás
                    </button>

                    <div className="bg-white rounded-2xl p-6 text-center border border-red-200">
                        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                        <p className="text-slate-900 font-semibold mb-1">{error || 'Datos incompletos'}</p>
                        <p className="text-sm text-slate-500">Vuelve atrás e intenta de nuevo</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-24">
            {/* Header */}
            <div className="bg-white border-b border-slate-100 sticky top-0 z-10">
                <div className="max-w-lg mx-auto px-4 py-3">
                    <div className="flex items-center justify-between mb-3">
                        <button
                            onClick={handleBack}
                            className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-600" />
                        </button>
                        <h1 className="text-sm font-bold text-slate-600 uppercase tracking-wide">Cercanías</h1>
                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="p-2 -mr-2 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={`w-5 h-5 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    {/* Route Card */}
                    <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl p-4 text-white">
                        <div className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] text-white/60 font-bold uppercase tracking-wider">Origen</p>
                                <p className="text-sm font-bold truncate">{originName}</p>
                            </div>
                            <div className="flex items-center justify-center p-2 bg-white/20 rounded-full">
                                <ArrowRight className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0 text-right">
                                <p className="text-[10px] text-white/60 font-bold uppercase tracking-wider">Destino</p>
                                <p className="text-sm font-bold truncate">{destName}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Results list */}
            <main className="max-w-lg mx-auto px-4 py-4 space-y-3">
                {sortedTrains.length > 0 ? (
                    sortedTrains.map((train) => (
                        <div
                            key={train.trainId}
                            className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
                        >
                            {/* Top bar with Line */}
                            <div className="px-4 py-2.5 bg-slate-50 flex items-center justify-between border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <span className={`${getLineColor(train.line)} text-white text-xs font-bold px-2 py-0.5 rounded`}>
                                        {train.line}
                                    </span>
                                    {train.destination && (
                                        <span className="text-xs font-medium text-slate-500">
                                            → {train.destination}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {train.delayMin !== undefined && train.delayMin > 0 && (
                                        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                            +{train.delayMin} min
                                        </span>
                                    )}
                                    {train.isAccessible && (
                                        <div className="bg-green-100 p-1 rounded-full">
                                            <Accessibility className="w-3 h-3 text-green-600" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-4 flex items-center justify-between gap-4">
                                {/* Time to go / Departure */}
                                <div className="flex-1">
                                    {train.timeToGo < 10 ? (
                                        <div>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-4xl font-black text-slate-900">{train.timeToGo}</span>
                                                <span className="text-lg font-bold text-slate-400">min</span>
                                            </div>
                                            <p className="text-xs font-bold text-green-600 mt-1 flex items-center gap-1">
                                                <Timer className="w-3 h-3" />
                                                Sale pronto
                                            </p>
                                        </div>
                                    ) : (
                                        <div>
                                            <p className="text-3xl font-black text-slate-900">{train.departure}</p>
                                            <p className="text-xs font-medium text-slate-500 mt-1 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                Salida
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Arrival */}
                                <div className="text-right">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Llegada</p>
                                    <p className="text-2xl font-black text-slate-800">{train.arrival}</p>
                                    <span className="inline-block text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full mt-1">
                                        {train.duration}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="bg-white rounded-2xl p-8 text-center border border-slate-100">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Train className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="text-lg font-bold text-slate-900 mb-2">Sin trenes disponibles</p>
                        <p className="text-sm text-slate-500 max-w-[200px] mx-auto">
                            No hay servicios programados para este trayecto ahora mismo
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
}

