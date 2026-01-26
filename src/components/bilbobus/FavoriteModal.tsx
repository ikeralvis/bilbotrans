'use client';

import { BilbobusStop } from '@/lib/bilbobus/api';
import { X, Heart, Check } from 'lucide-react';
import { useFavorites } from '@/context/FavoritesContext';
import { useState } from 'react';

interface FavoriteModalProps {
    readonly isOpen: boolean;
    readonly stop: BilbobusStop;
    readonly onClose: () => void;
}

export default function FavoriteModal({ isOpen, stop, onClose }: FavoriteModalProps) {
    const { addFavorite, favorites } = useFavorites();
    const [selectedLines, setSelectedLines] = useState<Set<string>>(new Set());
    const [saveEntireStop, setSaveEntireStop] = useState(false);
    const [isAdded, setIsAdded] = useState(false);

    if (!isOpen) return null;

    const stopFavorites = favorites.filter(
        fav => fav.stopId === stop.id && fav.agency === 'bilbobus'
    );

    const handleToggleLine = (lineId: string) => {
        const newSelected = new Set(selectedLines);
        if (newSelected.has(lineId)) {
            newSelected.delete(lineId);
        } else {
            newSelected.add(lineId);
        }
        setSelectedLines(newSelected);
    };

    const handleSave = () => {
        if (saveEntireStop) {
            // Guardar la parada completa
            addFavorite({
                stopId: stop.id,
                agency: 'bilbobus'
            });
        } else if (selectedLines.size > 0) {
            // Guardar líneas específicas
            selectedLines.forEach(lineId => {
                addFavorite({
                    stopId: stop.id,
                    lineId,
                    agency: 'bilbobus'
                });
            });
        }

        setIsAdded(true);
        setTimeout(() => {
            setIsAdded(false);
            setSelectedLines(new Set());
            setSaveEntireStop(false);
            onClose();
        }, 1500);
    };

    const canSave = saveEntireStop || selectedLines.size > 0;
    const alreadyFavorited = stopFavorites.length > 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <button
                type="button"
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
                aria-label="Close modal"
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
                {/* Header */}
                <div className="bg-linear-to-r from-red-600 to-red-700 px-6 py-6">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <h2 className="text-xl font-bold text-white">
                                Guardar como favorito
                            </h2>
                            <p className="text-red-100 text-sm mt-1">
                                {stop.name}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-white/20 transition-colors text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Entire Stop Option */}
                    <div>
                        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">
                            Guardar parada
                        </p>
                        <button
                            onClick={() => {
                                setSaveEntireStop(!saveEntireStop);
                                setSelectedLines(new Set());
                            }}
                            className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                                saveEntireStop
                                    ? 'border-red-600 bg-red-50'
                                    : 'border-slate-200 hover:border-red-300'
                            }`}
                        >
                            <div
                                className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                                    saveEntireStop
                                        ? 'bg-red-600 border-red-600'
                                        : 'border-slate-300'
                                }`}
                            >
                                {saveEntireStop && (
                                    <Check className="w-3 h-3 text-white" />
                                )}
                            </div>
                            <div className="text-left flex-1">
                                <p className="font-semibold text-slate-900">
                                    Parada completa
                                </p>
                                <p className="text-xs text-slate-600 mt-0.5">
                                    Guarda todas las líneas que pasan por aquí
                                </p>
                            </div>
                        </button>
                    </div>

                    {/* Divider */}
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-slate-500">O selecciona líneas</span>
                        </div>
                    </div>

                    {/* Lines Options */}
                    {!saveEntireStop && (
                        <div>
                            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">
                                Líneas ({selectedLines.size} seleccionadas)
                            </p>
                            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                                {stop.lines.map(lineId => {
                                    const isSelected = selectedLines.has(lineId);
                                    const isAlreadyFavorited = stopFavorites.some(
                                        fav => fav.lineId === lineId
                                    );
                                    
                                    const getButtonClass = () => {
                                        if (isAlreadyFavorited) {
                                            return 'border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed';
                                        }
                                        if (isSelected) {
                                            return 'border-red-600 bg-red-50 text-red-600';
                                        }
                                        return 'border-slate-200 text-slate-600 hover:border-red-300';
                                    };

                                    return (
                                        <button
                                            key={lineId}
                                            onClick={() => handleToggleLine(lineId)}
                                            disabled={isAlreadyFavorited}
                                            className={`p-3 rounded-lg border-2 text-center font-bold transition-all ${getButtonClass()}`}
                                        >
                                            {lineId}
                                            {isAlreadyFavorited && (
                                                <div className="text-xs text-slate-400 mt-0.5">
                                                    Guardada
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Status Message */}
                    {isAdded && (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                            <Check className="w-5 h-5 text-green-600" />
                            <p className="text-sm font-medium text-green-700">
                                ¡Guardado en favoritos!
                            </p>
                        </div>
                    )}

                    {alreadyFavorited && !isAdded && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
                            <Heart className="w-5 h-5 text-blue-600" fill="currentColor" />
                            <p className="text-sm text-blue-700">
                                Esta parada ya tiene {stopFavorites.length} línea{stopFavorites.length === 1 ? '' : 's'} guardada{stopFavorites.length === 1 ? '' : 's'}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-slate-50 px-6 py-4 flex gap-3 border-t border-slate-100">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 text-slate-700 font-semibold rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!canSave || isAdded}
                        className={`flex-1 px-4 py-2.5 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
                            canSave && !isAdded
                                ? 'bg-red-600 hover:bg-red-700 active:scale-[0.98]'
                                : 'bg-slate-300 cursor-not-allowed'
                        }`}
                    >
                        {isAdded ? (
                            <>
                                <Check className="w-4 h-4" />
                                Guardado
                            </>
                        ) : (
                            <>
                                <Heart className="w-4 h-4" />
                                Guardar
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
