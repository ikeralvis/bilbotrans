
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Loader2, Bus, Clock, RefreshCw } from 'lucide-react';
import { getBilbobusLineDetails, getBilbobusStops, getBilbobusArrivals } from '@/app/actions';
import { BilbobusLine, BilbobusStop, BilbobusArrival } from '@/lib/bilbobus/api';

export default function BilbobusLinePage() {
    const params = useParams();
    const router = useRouter();
    const lineId = params.id as string;

    const [line, setLine] = useState<BilbobusLine | null>(null);
    const [stops, setStops] = useState<BilbobusStop[]>([]);
    const [arrivals, setArrivals] = useState<BilbobusArrival[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const loadData = async () => {
        try {
            const lineData = await getBilbobusLineDetails(lineId);
            if (!lineData) return;
            setLine(lineData);

            const [stopsData, arrivalsData] = await Promise.all([
                getBilbobusStops(lineData.stops),
                getBilbobusArrivals(lineId)
            ]);

            setStops(stopsData);
            setArrivals(arrivalsData);
        } catch (error) {
            console.error('Error loading line details:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [lineId]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            const arrivalsData = await getBilbobusArrivals(lineId);
            setArrivals(arrivalsData);
        } catch (error) {
            console.error('Error refreshing arrivals:', error);
        } finally {
            setIsRefreshing(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-red-600" />
            </div>
        );
    }

    if (!line) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-8 text-center">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 mb-2">Línea no encontrada</h1>
                    <button onClick={() => router.back()} className="text-red-600 font-medium">Volver</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-red-600 text-white shadow-md">
                <div className="max-w-2xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => router.back()}
                                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div>
                                <h1 className="text-xl font-bold flex items-center gap-2">
                                    <span className="bg-white text-red-600 px-2 py-0.5 rounded text-sm font-black">
                                        {line.id}
                                    </span>
                                    {line.name}
                                </h1>
                            </div>
                        </div>
                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="p-2 rounded-lg hover:bg-white/10 transition-all disabled:opacity-50"
                        >
                            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            <main className="max-w-2xl mx-auto px-4 py-6">
                <div className="relative">
                    {/* Vertical Line */}
                    <div className="absolute left-6 top-8 bottom-8 w-1 bg-red-100" />

                    <div className="space-y-6">
                        {stops.map((stop, index) => {
                            const stopArrivals = arrivals.filter(a => a.stopId === stop.id);

                            return (
                                <div key={stop.id} className="relative flex gap-4">
                                    {/* Stop Node */}
                                    <div className={`z-10 w-12 h-12 rounded-full border-4 border-white shadow-sm shrink-0 flex items-center justify-center ${index === 0 || index === stops.length - 1 ? 'bg-red-600' : 'bg-red-100'
                                        }`}>
                                        <div className={`w-2.5 h-2.5 rounded-full ${index === 0 || index === stops.length - 1 ? 'bg-white' : 'bg-red-600'
                                            }`} />
                                    </div>

                                    {/* Stop Details */}
                                    <button
                                        onClick={() => router.push(`/station/${stop.id}?agency=bilbobus`)}
                                        className="flex-1 bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:border-red-200 transition-all text-left"
                                    >
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="min-w-0">
                                                <h3 className="text-sm font-bold text-slate-900 truncate">{stop.name}</h3>
                                                <p className="text-xs text-slate-400 mt-0.5">Parada {stop.id}</p>
                                            </div>

                                            <div className="flex flex-col items-end gap-1">
                                                {stopArrivals.length > 0 ? (
                                                    stopArrivals.map((arr, i) => (
                                                        <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded bg-red-50 text-red-600">
                                                            <Bus className="w-3 h-3" />
                                                            <span className="text-[10px] font-bold whitespace-nowrap">
                                                                {arr.etaMinutes <= 0 ? 'En parada' : `${arr.etaMinutes} min`}
                                                            </span>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="p-1">
                                                        <MapPin className="w-4 h-4 text-slate-200" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </main>
        </div>
    );
}
