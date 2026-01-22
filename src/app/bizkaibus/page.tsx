'use client';

import { useLanguage } from '@/context/LanguageContext';
import { useFavorites } from '@/context/FavoritesContext';
import { Bus, Star, RefreshCw } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import BizkaibusStopCard from '@/components/bizkaibus/BizkaibusStopCard';
import BizkaibusStopSearch from '@/components/bizkaibus/BizkaibusStopSearch';
import { getBizkaibusStopById } from '@/lib/bizkaibus/api';

export default function BizkaibusPage() {
    const { language } = useLanguage();
    const { favorites } = useFavorites();
    const [refreshing, setRefreshing] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);
    const [key, setKey] = useState(0);

    const bizkaiBusFavorites = favorites.filter(fav => fav.agency === 'bizkaibus');

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        // Force re-render of stop cards
        setKey(prev => prev + 1);
        await new Promise(resolve => setTimeout(resolve, 500));
        setRefreshing(false);
    }, []);

    // Pull-to-refresh effect
    useEffect(() => {
        let startY = 0;
        let currentY = 0;
        let isPulling = false;

        const handleTouchStart = (e: TouchEvent) => {
            if (window.scrollY === 0) {
                startY = e.touches[0].clientY;
                isPulling = true;
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!isPulling) return;
            currentY = e.touches[0].clientY;
            const pullDistance = currentY - startY;

            if (pullDistance > 80 && !refreshing) {
                handleRefresh();
                isPulling = false;
            }
        };

        const handleTouchEnd = () => {
            isPulling = false;
            startY = 0;
            currentY = 0;
        };

        document.addEventListener('touchstart', handleTouchStart);
        document.addEventListener('touchmove', handleTouchMove);
        document.addEventListener('touchend', handleTouchEnd);

        return () => {
            document.removeEventListener('touchstart', handleTouchStart);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };
    }, [refreshing, handleRefresh]);

    return (
        <div className="min-h-screen bg-slate-50 pb-24">
            {/* Header with BilboTrans + Bizkaibus logo */}
            <div className="bg-white border-b border-slate-100">
                <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-linear-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                            <span className="text-sm font-bold text-slate-600">B</span>
                        </div>
                        <span className="font-semibold text-slate-800">Bizkaibus</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                            src="/logoBizkaibus.png" 
                            alt="Bizkaibus" 
                            className="h-8 object-contain"
                        />
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={`w-5 h-5 text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Green Container with Search */}
            <div className="px-4 pt-4 pb-2">
                <div className="max-w-lg mx-auto bg-linear-to-br from-green-600 to-green-700 rounded-3xl p-1 shadow-lg">
                    {/* White Search Card Inside */}
                    <div className="bg-white rounded-[22px] p-5">
                        <h2 className="text-sm font-bold text-green-800 uppercase tracking-wide mb-4">BUSCAR PARADA</h2>
                        <BizkaibusStopSearch onSelectStop={() => setIsNavigating(true)} />
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-lg mx-auto px-4 py-4">
                {/* Favorites Section */}
                {bizkaiBusFavorites.length > 0 && (
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Star className="w-5 h-5 text-green-600 fill-green-600" />
                            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                                {language === 'es' ? 'PARADAS FAVORITAS' : 'GELTOKI GOGOKOENAK'}
                            </h2>
                        </div>
                        <div className="space-y-3">
                            {bizkaiBusFavorites.map((fav) => {
                                const stopData = getBizkaibusStopById(fav.id);
                                return (
                                    <BizkaibusStopCard
                                        key={`${fav.id}-${key}`}
                                        stopId={fav.id}
                                        stopName={stopData?.name || fav.name}
                                        municipality={stopData?.municipality}
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {bizkaiBusFavorites.length === 0 && (
                    <div className="text-center py-12">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-linear-to-br from-green-100 to-green-50 mb-4 shadow-sm">
                            <Bus className="w-10 h-10 text-green-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">
                            {language === 'es' ? '¡Bienvenido a Bizkaibus!' : 'Ongi etorri Bizkaibusera!'}
                        </h3>
                        <p className="text-slate-500 mb-6 max-w-sm mx-auto text-sm">
                            {language === 'es'
                                ? 'Busca tu parada de autobús y agrégala a favoritos para ver las llegadas en tiempo real'
                                : 'Bilatu zure autobus-geltokia eta gehitu gogokoetan denbora errealeko iritsierak ikusteko'}
                        </p>
                    </div>
                )}

                {/* Info Card */}
                <div className="mt-4 p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
                    <h3 className="font-semibold text-slate-800 mb-2 text-sm">
                        💡 {language === 'es' ? 'Consejo' : 'Aholkua'}
                    </h3>
                    <p className="text-slate-600 text-sm leading-relaxed">
                        {language === 'es'
                            ? 'Puedes buscar paradas por nombre, número o municipio. Añade tus paradas favoritas tocando la estrella.'
                            : 'Geltokiak izen, zenbaki edo udalerriren arabera bilatu ditzakezu. Gehitu zure geltoki gogokoenak izarra sakatuz.'}
                    </p>
                </div>
            </div>

            {/* Loading Overlay */}
            {isNavigating && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-xl animate-pulse">
                            <img src="/logo.png" alt="Loading" className="w-10 h-10 object-contain animate-spin" />
                        </div>
                        <p className="text-white font-medium text-sm">
                            {language === 'es' ? 'Cargando parada...' : 'Geltokia kargatzean...'}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
