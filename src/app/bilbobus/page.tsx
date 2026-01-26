'use client';

import { useFavorites } from '@/context/FavoritesContext';
import { useState, useCallback } from 'react';
import BilbobusStopSearch from '@/components/bilbobus/BilbobusStopSearch';
import BilbobusLineSearch from '@/components/bilbobus/BilbobusLineSearch';
import BilbobusFavoriteCard from '@/components/bilbobus/BilbobusFavoriteCard';
import FavoriteConfigModal from '@/components/bilbobus/FavoriteConfigModal';
import { Bus, Star, RefreshCw, MapPin, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function BilbobusPage() {
    const router = useRouter();
    const { favorites, removeFavorite } = useFavorites();
    const [refreshing, setRefreshing] = useState(false);
    const [key, setKey] = useState(0);
    const [activeTab, setActiveTab] = useState<'stops' | 'lines'>('stops');
    const [showFavoriteModal, setShowFavoriteModal] = useState(false);
    const [editingFavorite, setEditingFavorite] = useState<{stopId: string, lines: string[]} | undefined>();

    const bilbobusFavorites = favorites.filter(fav => fav.agency === 'bilbobus');

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        setKey(prev => prev + 1);
        await new Promise(resolve => setTimeout(resolve, 500));
        setRefreshing(false);
    }, []);

    const handleAddFavorite = () => {
        setEditingFavorite(undefined);
        setShowFavoriteModal(true);
    };

    const handleConfigureFavorite = (stopId: string, selectedLines: string[]) => {
        setEditingFavorite({ stopId, lines: selectedLines });
        setShowFavoriteModal(true);
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-24">
            {/* Header Global */}
            <header className="bg-white border-b border-slate-100 sticky top-0 z-40">
                <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center">
                            <img src="/logo.png" alt="BilboTrans" className="w-7 h-7 object-contain" />
                        </div>
                        <span className="text-lg font-bold text-slate-900">BilboTrans</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center text-sm">
                            🌐
                        </button>
                        <button className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center">
                            👤
                        </button>
                    </div>
                </div>
            </header>

            {/* Bilbobus Section */}
            <div className="bg-red-600">
                {/* Red Header Container */}
                <div className="relative pt-8 pb-20">
                    <div className="max-w-lg mx-auto px-4 text-center">
                        <div className="flex flex-col items-center gap-3 mb-8">
                            <Bus className="w-12 h-12 text-white" />
                            <h1 className="text-white font-bold text-xl tracking-wide">BUSCAR PARADA O LÍNEA</h1>
                        </div>

                        {/* Search Card - Floating */}
                        <div className="relative" style={{ marginBottom: '-80px', zIndex: 10 }}>
                            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
                                {/* Tabs */}
                                <div className="flex border-b border-slate-100">
                                    <button
                                        onClick={() => setActiveTab('stops')}
                                        className={`flex-1 py-4 text-sm font-semibold transition-all ${
                                            activeTab === 'stops'
                                                ? 'text-red-600 border-b-2 border-red-600'
                                                : 'text-slate-400 hover:text-slate-600'
                                        }`}
                                    >
                                        <MapPin className="w-4 h-4 inline-block mr-1.5" />
                                        Paradas
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('lines')}
                                        className={`flex-1 py-4 text-sm font-semibold transition-all ${
                                            activeTab === 'lines'
                                                ? 'text-red-600 border-b-2 border-red-600'
                                                : 'text-slate-400 hover:text-slate-600'
                                        }`}
                                    >
                                        <Bus className="w-4 h-4 inline-block mr-1.5" />
                                        Líneas
                                    </button>
                                </div>

                                {/* Search Content */}
                                <div className="p-5">
                                    {activeTab === 'stops' && <BilbobusStopSearch />}
                                    {activeTab === 'lines' && <BilbobusLineSearch />}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="px-4 pt-20">
                <div className="max-w-lg mx-auto space-y-6">
                    {/* MIS PARADAS Section */}
                    <div className="space-y-3">
                        <h2 className="text-base font-bold text-slate-700 uppercase tracking-wide">MIS PARADAS</h2>
                        
                        {/* Tabs Selector */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setActiveTab('stops')}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold transition-all ${
                                    activeTab === 'stops'
                                        ? 'bg-red-600 text-white'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                <Star className="w-4 h-4" />
                                Favoritos
                            </button>
                            <button
                                className="flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
                            >
                                📍
                                Cercanas
                            </button>
                        </div>

                        {/* Favorites Section */}
                        <div className="space-y-3 mt-4">
                            {bilbobusFavorites.length === 0 ? (
                                <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-sm">
                                    <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                                        <Star className="w-8 h-8 text-red-600" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 mb-2">
                                        No tienes favoritos
                                    </h3>
                                    <p className="text-slate-500 text-sm mb-6">
                                        Guarda paradas y elige qué líneas ver
                                    </p>
                                    <button
                                        onClick={handleAddFavorite}
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors shadow-md"
                                    >
                                        <Plus className="w-5 h-5" />
                                        Agregar Favorito
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3" key={key}>
                                    {bilbobusFavorites.map(fav => (
                                        <BilbobusFavoriteCard
                                            key={fav.id}
                                            stopId={fav.stopId}
                                            stopName={fav.stopName || fav.name || `Parada ${fav.stopId}`}
                                            selectedLines={fav.metadata?.selectedLines || []}
                                            onConfigure={() => handleConfigureFavorite(
                                                fav.stopId,
                                                fav.metadata?.selectedLines || []
                                            )}
                                            onRemove={() => removeFavorite(fav.id)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Favorite Config Modal */}
            <FavoriteConfigModal
                isOpen={showFavoriteModal}
                onClose={() => {
                    setShowFavoriteModal(false);
                    setEditingFavorite(undefined);
                }}
                initialStopId={editingFavorite?.stopId}
                initialLines={editingFavorite?.lines}
            />
        </div>
    );
}
