'use client';

import { BilbobusStop, BilbobusLine } from '@/lib/bilbobus/api';
import { Heart, MapPin, Bus, ChevronRight } from 'lucide-react';
import { useFavorites } from '@/context/FavoritesContext';
import { useState } from 'react';
import FavoriteModal from './FavoriteModal';
import { useRouter } from 'next/navigation';

interface BilbobusStopCardProps {
    readonly stop: BilbobusStop;
    readonly lines?: BilbobusLine[];
}

export default function BilbobusStopCard({ stop }: BilbobusStopCardProps) {
    const router = useRouter();
    const { favorites, removeFavorite } = useFavorites();
    const [showFavoriteModal, setShowFavoriteModal] = useState(false);

    const stopFavorites = favorites.filter(
        fav => fav.stopId === stop.id && fav.agency === 'bilbobus'
    );

    const isFavorite = stopFavorites.length > 0;

    const handleAddFavorite = () => {
        setShowFavoriteModal(true);
    };

    const handleRemoveFavorite = () => {
        stopFavorites.forEach(fav => {
            removeFavorite(fav.stopId);
        });
    };

    return (
        <>
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow active:scale-[0.99]">
                {/* Header */}
                <div className="bg-linear-to-r from-red-600 to-red-700 px-4 py-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-white truncate">
                                {stop.name}
                            </h3>
                            <p className="text-red-100 text-sm mt-1">
                                ID: {stop.id}
                            </p>
                        </div>
                        <button
                            onClick={isFavorite ? handleRemoveFavorite : handleAddFavorite}
                            className={`shrink-0 p-2 rounded-lg transition-all ${
                                isFavorite
                                    ? 'bg-white/20 text-white'
                                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                            }`}
                        >
                            <Heart
                                className="w-5 h-5"
                                fill={isFavorite ? 'currentColor' : 'none'}
                            />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    {/* Location */}
                    <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                        <div className="text-sm">
                            <p className="text-slate-600">
                                Coordenadas
                            </p>
                            <p className="text-slate-900 font-medium">
                                {stop.lat.toFixed(6)}, {stop.lon.toFixed(6)}
                            </p>
                        </div>
                    </div>

                    {/* Lines */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Bus className="w-5 h-5 text-red-600" />
                            <span className="text-sm font-medium text-slate-900">
                                {stop.lines.length} línea{stop.lines.length === 1 ? '' : 's'}
                            </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {stop.lines.map(lineId => (
                                <button
                                    key={lineId}
                                    onClick={() => router.push(`/bilbobus/lineas/${lineId}`)}
                                    className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors active:scale-95"
                                >
                                    {lineId}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Favorite Lines */}
                    {stopFavorites.length > 0 && (
                        <div className="pt-3 border-t border-slate-100">
                            <p className="text-xs font-medium text-slate-600 mb-2">
                                Líneas favoritas
                            </p>
                            <div className="space-y-1">
                                {stopFavorites.map(fav => (
                                    <div
                                        key={fav.id}
                                        className="flex items-center gap-2 p-2 bg-red-50 rounded-lg border border-red-100"
                                    >
                                        <div className="w-6 h-6 rounded bg-red-600 text-white text-xs font-bold flex items-center justify-center">
                                            {fav.lineId || '✓'}
                                        </div>
                                        <span className="text-sm text-slate-900 flex-1">
                                            {fav.lineId ? `Línea ${fav.lineId}` : 'Parada completa'}
                                        </span>
                                        <button
                                            onClick={() => removeFavorite(fav.stopId)}
                                            className="text-red-600 hover:text-red-700"
                                        >
                                            <Heart className="w-4 h-4" fill="currentColor" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Action Button */}
                    <button
                        onClick={() => router.push(`/bilbobus/stop/${stop.id}`)}
                        className="w-full mt-4 px-4 py-3 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        Ver detalles
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Favorite Modal */}
            <FavoriteModal
                isOpen={showFavoriteModal}
                stop={stop}
                onClose={() => setShowFavoriteModal(false)}
            />
        </>
    );
}
