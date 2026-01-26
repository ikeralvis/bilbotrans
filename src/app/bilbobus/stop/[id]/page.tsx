'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, MapPin, Bus, Navigation, Loader2, Heart, ExternalLink } from 'lucide-react';
import { getBilbobusStopById, searchBilbobusLinesByStop } from '@/lib/bilbobus/client-search';
import { BilbobusStop } from '@/lib/bilbobus/api';
import { useFavorites } from '@/context/FavoritesContext';
import FavoriteModal from '@/components/bilbobus/FavoriteModal';

export default function BilbobusStopDetailPage() {
    const router = useRouter();
    const params = useParams();
    const stopId = params.id as string;
    const { favorites, addFavorite, removeFavorite } = useFavorites();
    const [stop, setStop] = useState<BilbobusStop | null>(null);
    const [lines, setLines] = useState<Array<{ id: string; name: string }>>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showFavoriteModal, setShowFavoriteModal] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                const stopData = getBilbobusStopById(stopId);
                if (stopData) {
                    setStop(stopData);
                    const lineData = searchBilbobusLinesByStop(stopId);
                    setLines(lineData);
                }
            } catch (error) {
                console.error('Error loading stop:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [stopId]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-red-600 mx-auto mb-3" />
                    <p className="text-slate-500">Cargando parada...</p>
                </div>
            </div>
        );
    }

    if (!stop) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
                <div className="text-center max-w-sm">
                    <MapPin className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">Parada no encontrada</p>
                    <button
                        onClick={() => router.back()}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                        Volver
                    </button>
                </div>
            </div>
        );
    }

    const stopFavorites = favorites.filter(
        fav => fav.stopId === stop.id && fav.agency === 'bilbobus'
    );
    const isFavorite = stopFavorites.length > 0;

    const handleMapClick = () => {
        const url = `https://www.google.com/maps?q=${stop.lat},${stop.lon}`;
        window.open(url, '_blank');
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 text-white sticky top-0 z-40 shadow-lg">
                <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="flex-1 text-center text-lg font-bold truncate mx-4">
                        {stop.name}
                    </h1>
                    <button
                        onClick={() => setShowFavoriteModal(true)}
                        className={`p-2 rounded-lg transition-colors ${
                            isFavorite
                                ? 'bg-white/20 text-white'
                                : 'hover:bg-white/10'
                        }`}
                    >
                        <Heart
                            className="w-5 h-5"
                            fill={isFavorite ? 'currentColor' : 'none'}
                        />
                    </button>
                </div>
            </div>

            <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
                {/* Info Card */}
                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                    {/* Stop ID */}
                    <div className="p-6 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                                <Bus className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-600 uppercase tracking-wide">ID de Parada</p>
                                <p className="text-lg font-bold text-slate-900">{stop.id}</p>
                            </div>
                        </div>
                    </div>

                    {/* Location */}
                    <div className="p-6 border-b border-slate-100">
                        <div className="space-y-4">
                            <p className="text-xs text-slate-600 uppercase tracking-wide font-semibold">
                                Ubicación
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-slate-500">Latitud</p>
                                    <p className="font-mono text-sm text-slate-900 mt-1">
                                        {stop.lat.toFixed(6)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500">Longitud</p>
                                    <p className="font-mono text-sm text-slate-900 mt-1">
                                        {stop.lon.toFixed(6)}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleMapClick}
                                className="w-full mt-4 px-4 py-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2 font-medium text-sm"
                            >
                                <Navigation className="w-4 h-4" />
                                Ver en Google Maps
                                <ExternalLink className="w-3 h-3" />
                            </button>
                        </div>
                    </div>

                    {/* Favorite Info */}
                    {stopFavorites.length > 0 && (
                        <div className="p-6 bg-red-50 border-t border-red-100">
                            <div className="flex items-center gap-2 mb-3">
                                <Heart className="w-5 h-5 text-red-600" fill="currentColor" />
                                <p className="font-semibold text-slate-900">Guardado en favoritos</p>
                            </div>
                            <div className="space-y-2">
                                {stopFavorites.map(fav => (
                                    <div key={fav.id} className="flex items-center justify-between p-2 bg-white rounded-lg">
                                        <span className="text-sm text-slate-700">
                                            {fav.lineId ? `Línea ${fav.lineId}` : 'Parada completa'}
                                        </span>
                                        <button
                                            onClick={() => removeFavorite(fav.id)}
                                            className="text-red-600 hover:text-red-700 transition-colors"
                                        >
                                            <Heart className="w-4 h-4" fill="currentColor" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Lines Section */}
                <div>
                    <h2 className="text-lg font-bold text-slate-900 mb-4">
                        Líneas que pasan por aquí
                        <span className="text-slate-500 font-normal text-base ml-2">
                            ({lines.length})
                        </span>
                    </h2>

                    {lines.length === 0 ? (
                        <div className="p-8 text-center bg-white rounded-xl border border-slate-100">
                            <Bus className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                            <p className="text-slate-500">No se encontraron líneas</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-3">
                            {lines.map(line => (
                                <button
                                    key={line.id}
                                    onClick={() => router.push(`/bilbobus/lineas/${line.id}`)}
                                    className="p-4 bg-white rounded-xl border border-slate-100 hover:border-red-300 hover:bg-red-50 transition-all active:scale-[0.98] group"
                                >
                                    <div className="flex items-center justify-center h-full">
                                        <div className="text-center">
                                            <div className="w-12 h-12 rounded-lg bg-red-600 text-white flex items-center justify-center font-black text-lg mx-auto mb-2 group-hover:shadow-lg transition-shadow">
                                                {line.id}
                                            </div>
                                            <p className="text-xs text-slate-600 truncate px-1">
                                                {line.name}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Action Button */}
                {!isFavorite && (
                    <button
                        onClick={() => setShowFavoriteModal(true)}
                        className="w-full px-6 py-4 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg"
                    >
                        <Heart className="w-5 h-5" />
                        Guardar como favorito
                    </button>
                )}
            </main>

            {/* Modal */}
            <FavoriteModal
                isOpen={showFavoriteModal}
                stop={stop}
                onClose={() => setShowFavoriteModal(false)}
            />
        </div>
    );
}
