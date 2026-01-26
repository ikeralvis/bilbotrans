'use client';

import { useState, useEffect } from 'react';
import { X, Check, Bus, MapPin, Heart } from 'lucide-react';
import { searchBilbobusStops, searchBilbobusLinesByStop, getBilbobusStopById } from '@/lib/bilbobus/client-search';
import { BilbobusStop, BilbobusLine } from '@/lib/bilbobus/api';
import { useFavorites } from '@/context/FavoritesContext';

interface FavoriteConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialStopId?: string;
    initialLines?: string[];
}

export default function FavoriteConfigModal({ isOpen, onClose, initialStopId, initialLines }: FavoriteConfigModalProps) {
    const { addFavorite } = useFavorites();
    const [step, setStep] = useState<'stop' | 'lines'>('stop');
    const [stopQuery, setStopQuery] = useState('');
    const [stopResults, setStopResults] = useState<BilbobusStop[]>([]);
    const [selectedStop, setSelectedStop] = useState<BilbobusStop | null>(null);
    const [availableLines, setAvailableLines] = useState<BilbobusLine[]>([]);
    const [selectedLines, setSelectedLines] = useState<string[]>([]);

    useEffect(() => {
        if (initialStopId) {
            const stop = getBilbobusStopById(initialStopId);
            if (stop) {
                setSelectedStop(stop);
                setStep('lines');
                const lines = searchBilbobusLinesByStop(stop.id);
                setAvailableLines(lines);
                setSelectedLines(initialLines || stop.lines || []);
            }
        }
    }, [initialStopId, initialLines]);

    useEffect(() => {
        if (stopQuery.length >= 2) {
            const results = searchBilbobusStops(stopQuery, 10);
            setStopResults(results);
        } else {
            setStopResults([]);
        }
    }, [stopQuery]);

    const handleSelectStop = (stop: BilbobusStop) => {
        setSelectedStop(stop);
        setStep('lines');
        const lines = searchBilbobusLinesByStop(stop.id);
        setAvailableLines(lines);
        setSelectedLines(stop.lines || []);
    };

    const toggleLine = (lineId: string) => {
        setSelectedLines(prev => 
            prev.includes(lineId) 
                ? prev.filter(id => id !== lineId)
                : [...prev, lineId]
        );
    };

    const handleSave = async () => {
        if (!selectedStop) return;

        await addFavorite({
            stopId: selectedStop.id,
            stopName: selectedStop.name,
            agency: 'bilbobus',
            lineId: undefined,
            name: selectedStop.name,
            metadata: {
                selectedLines: selectedLines
            }
        });

        handleClose();
    };

    const handleClose = () => {
        setStep('stop');
        setStopQuery('');
        setStopResults([]);
        setSelectedStop(null);
        setAvailableLines([]);
        setSelectedLines([]);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">
                            {step === 'stop' ? 'Seleccionar Parada' : 'Seleccionar Líneas'}
                        </h2>
                        <p className="text-sm text-slate-500 mt-0.5">
                            {step === 'stop' 
                                ? 'Elige la parada que quieres monitorizar'
                                : `Líneas disponibles en ${selectedStop?.name}`
                            }
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5">
                    {step === 'stop' ? (
                        <div className="space-y-4">
                            {/* Search Input */}
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    value={stopQuery}
                                    onChange={(e) => setStopQuery(e.target.value)}
                                    placeholder="Buscar parada..."
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-transparent focus:border-red-500 focus:bg-white rounded-xl text-sm outline-none transition-all text-black"
                                    autoFocus
                                />
                            </div>

                            {/* Results */}
                            {stopResults.length > 0 ? (
                                <div className="space-y-2">
                                    {stopResults.map(stop => (
                                        <button
                                            key={stop.id}
                                            onClick={() => handleSelectStop(stop)}
                                            className="w-full bg-white border-2 border-slate-200 hover:border-red-500 rounded-xl p-4 text-left transition-all active:scale-[0.98]"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                                                    <MapPin className="w-5 h-5 text-red-600" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-semibold text-slate-900 truncate">
                                                        {stop.name}
                                                    </h3>
                                                    <p className="text-xs text-slate-500 mt-0.5">
                                                        ID: {stop.id}
                                                    </p>
                                                    {stop.lines && stop.lines.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-2">
                                                            {stop.lines.slice(0, 8).map(line => (
                                                                <span key={line} className="inline-flex items-center px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
                                                                    {line}
                                                                </span>
                                                            ))}
                                                            {stop.lines.length > 8 && (
                                                                <span className="text-xs text-slate-400">+{stop.lines.length - 8}</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : stopQuery.length >= 2 ? (
                                <div className="text-center py-12">
                                    <MapPin className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                    <p className="text-slate-500">No se encontraron paradas</p>
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <MapPin className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                    <p className="text-slate-500">Escribe para buscar paradas</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* Selected Stop Info */}
                            <div className="bg-slate-50 rounded-xl p-4 mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center">
                                        <MapPin className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-slate-900 truncate">
                                            {selectedStop?.name}
                                        </h3>
                                        <p className="text-xs text-slate-500">ID: {selectedStop?.id}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Lines Selection */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-semibold text-slate-700">
                                        Líneas a mostrar ({selectedLines.length} seleccionadas)
                                    </h3>
                                    {availableLines.length > 0 && (
                                        <button
                                            onClick={() => setSelectedLines(
                                                selectedLines.length === availableLines.length 
                                                    ? [] 
                                                    : availableLines.map(l => l.id)
                                            )}
                                            className="text-xs text-red-600 font-medium hover:underline"
                                        >
                                            {selectedLines.length === availableLines.length ? 'Desmarcar' : 'Todas'}
                                        </button>
                                    )}
                                </div>

                                {availableLines.length > 0 ? (
                                    <div className="space-y-2">
                                        {availableLines.map(line => (
                                            <button
                                                key={line.id}
                                                onClick={() => toggleLine(line.id)}
                                                className={`w-full border-2 rounded-xl p-3 text-left transition-all active:scale-[0.98] ${
                                                    selectedLines.includes(line.id)
                                                        ? 'border-red-500 bg-red-50'
                                                        : 'border-slate-200 bg-white hover:border-slate-300'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 font-bold text-sm ${
                                                        selectedLines.includes(line.id)
                                                            ? 'bg-red-600 text-white'
                                                            : 'bg-slate-100 text-slate-600'
                                                    }`}>
                                                        {line.id}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-semibold text-slate-900 text-sm truncate">
                                                            {line.name}
                                                        </h4>
                                                    </div>
                                                    {selectedLines.includes(line.id) && (
                                                        <Check className="w-5 h-5 text-red-600 shrink-0" />
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <Bus className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                        <p className="text-slate-500 text-sm">No hay líneas disponibles</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {step === 'lines' && (
                    <div className="border-t border-slate-100 p-5">
                        <div className="flex gap-3">
                            <button
                                onClick={() => setStep('stop')}
                                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
                            >
                                Atrás
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={selectedLines.length === 0}
                                className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <Heart className="w-4 h-4" />
                                Guardar Favorito
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
