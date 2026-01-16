'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, AlertCircle, RefreshCw, Train, ChevronRight, Clock, Info, Accessibility } from 'lucide-react';
import { getRenfeStopById } from '@/lib/renfe/api';

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

export default function RenfeRoutePage() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const originId = searchParams.get('origin');
    const destId = searchParams.get('dest');

    const [trains, setTrains] = useState<TrainRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const originStop = useMemo(() => originId ? getRenfeStopById(originId) : null, [originId]);
    const destStop = useMemo(() => destId ? getRenfeStopById(destId) : null, [destId]);

    const load = async () => {
        if (!originId || !destId) return;
        setIsLoading(true);
        try {
            const res = await fetch(`/api/renfe/schedule?origin=${originId}&dest=${destId}`);
            const data = await res.json();
            if (data.ok) {
                setError(null);
                setTrains(data.trains || []);
            } else {
                setError(data.error || 'No se encontraron itinerarios para esta ruta');
                setTrains([]);
            }
        } catch (err) {
            console.error(err);
            setError('Error al cargar los itinerarios');
            setTrains([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { load(); }, [originId, destId]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await load();
        setIsRefreshing(false);
    };

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="py-20 flex flex-col items-center justify-center space-y-4">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-red-100 border-t-red-600 rounded-full animate-spin"></div>
                        <Train className="w-6 h-6 text-red-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-slate-500 font-medium">Calculando mejores rutas...</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center shadow-sm">
                    <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-slate-900 font-bold text-lg mb-2">Ups, algo salió mal</h3>
                    <p className="text-slate-500 mb-6">{error}</p>
                    <button 
                        onClick={load}
                        className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
                    >
                        Reintentar búsqueda
                    </button>
                </div>
            );
        }

        if (trains.length === 0) {
            return (
                <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-slate-200">
                    <Info className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <h3 className="text-slate-900 font-bold mb-1">Sin circulaciones</h3>
                    <p className="text-slate-500 text-sm">No hay trenes disponibles para el trayecto seleccionado en las próximas 12 horas.</p>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between px-1 mb-2">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Próximos trenes</h3>
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200">{trains.length} resultados</span>
                </div>

                <div className="grid gap-3">
                    {trains.map((t, idx) => (
                        <div 
                            key={`${t.trainId}-${idx}`} 
                            className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:border-red-200 transition-all group relative overflow-hidden"
                        >
                            {/* Decorative sidebar color indicative of Cercanías */}
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600 group-hover:w-1.5 transition-all" />
                            
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    {/* Time block */}
                                    <div className="shrink-0 text-center">
                                        <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center border transition-colors ${
                                            t.timeToGo <= 5 ? 'bg-red-600 text-white border-red-700' : 'bg-red-50 text-red-600 border-red-100'
                                        }`}>
                                            <span className="text-xl font-black leading-none">{t.timeToGo}</span>
                                            <span className="text-[9px] font-bold uppercase mt-1">min</span>
                                        </div>
                                    </div>

                                    {/* Detailed Info */}
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[9px] font-black uppercase border border-slate-200">
                                                Línea {t.line}
                                            </span>
                                            {t.isAccessible && (
                                                <Accessibility className="w-3.5 h-3.5 text-blue-400" />
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl font-black text-slate-900 tracking-tight">{t.departure}</span>
                                            <ChevronRight className="w-4 h-4 text-slate-300" />
                                            <span className="text-lg font-bold text-slate-400">{t.arrival}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right shrink-0">
                                    <div className="text-[10px] font-bold text-slate-300 uppercase leading-none mb-1.5">Duración</div>
                                    <div className="flex items-center gap-1.5 justify-end">
                                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                                        <span className="text-sm font-black text-slate-700">{t.duration}</span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Status bar */}
                            <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
                                <div className="flex gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1 animate-pulse" />
                                    <span className="text-[11px] font-bold text-green-600 uppercase">En hora</span>
                                </div>
                                {/* Fake "ticket" holes */}
                                <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-50/50 rounded-full border border-slate-100 hidden group-hover:block" />
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-8 mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] text-slate-400 leading-relaxed text-center italic">
                        * Los horarios mostrados son estimaciones basadas en datos reales de Renfe. 
                        La disponibilidad de plazas y precios debe consultarse en canales oficiales de Renfe Operadora.
                    </p>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-24">
            {/* Header con gradiente */}
            <div className="bg-linear-to-br from-purple-700 via-purple-600 to-red-600 text-white shadow-lg sticky top-0 z-40">
                <div className="max-w-2xl mx-auto px-4 pt-4 pb-6">
                    <div className="flex items-center gap-3 mb-6">
                        <button 
                            onClick={() => router.push('/?tab=renfe')} 
                            className="p-2 -ml-2 rounded-full hover:bg-white/20 transition-colors"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <h1 className="text-xl font-bold tracking-tight">Itinerario Renfe</h1>
                        <button 
                            onClick={handleRefresh} 
                            disabled={isLoading || isRefreshing}
                            className="ml-auto p-2 rounded-full hover:bg-white/20 transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    {/* Origen y Destino */}
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                <p className="text-xs text-white/70 uppercase font-bold tracking-wider mb-1">Origen</p>
                                <h2 className="text-lg font-bold truncate">{originStop?.name || 'Cargando...'}</h2>
                            </div>
                            <div className="shrink-0 bg-white/20 p-2 rounded-full shadow-inner">
                                <ChevronRight className="w-5 h-5 animate-pulse" />
                            </div>
                            <div className="flex-1 min-w-0 text-right">
                                <p className="text-xs text-white/70 uppercase font-bold tracking-wider mb-1">Destino</p>
                                <h2 className="text-lg font-bold truncate">{destStop?.name || 'Cargando...'}</h2>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-2xl mx-auto px-4 py-8">
                {renderContent()}
            </main>
        </div>
    );
}
