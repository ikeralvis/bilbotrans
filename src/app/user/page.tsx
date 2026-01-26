'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, LogOut, Heart, Bus, Train } from 'lucide-react';
import { useFavorites } from '@/context/FavoritesContext';
import { useLanguage } from '@/context/LanguageContext';

type TransportFilter = 'all' | 'metro' | 'bilbobus' | 'bizkaibus';

export default function UserPage() {
    const router = useRouter();
    const { t } = useLanguage();
    const { favorites, removeFavorite } = useFavorites();
    const [filterType, setFilterType] = useState<TransportFilter>('all');
    const [userName, setUserName] = useState<string>('Usuario');
    const [userEmail, setUserEmail] = useState<string>('');
    const [isLoadingAuth, setIsLoadingAuth] = useState(false);

    const filteredFavorites = favorites.filter(fav => 
        filterType === 'all' ? true : fav.agency === filterType
    );

    const getTransportIcon = (agency: string) => {
        if (agency === 'metro') return <Train className="w-4 h-4 text-orange-600" />;
        if (agency === 'bilbobus') return <Bus className="w-4 h-4 text-red-600" />;
        return <Bus className="w-4 h-4 text-slate-600" />;
    };

    const getTransportLabel = (agency: string) => {
        if (agency === 'metro') return 'Metro Bilbao';
        if (agency === 'bilbobus') return 'Bilbobus';
        if (agency === 'bizkaibus') return 'Bizkaibus';
        return agency;
    };

    const handleLoginGoogle = async () => {
        setIsLoadingAuth(true);
        try {
            // Implementar OAuth con Google en el futuro
            console.log('Login con Google');
            // Por ahora solo guardar un nombre de demo
            setUserName('Usuario Demo');
            setUserEmail('usuario@example.com');
        } finally {
            setIsLoadingAuth(false);
        }
    };

    const handleLogout = () => {
        setUserName('Usuario');
        setUserEmail('');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 pb-24">
            {/* Header */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white">
                <div className="max-w-2xl mx-auto px-4 py-6">
                    <div className="flex items-center justify-between mb-6">
                        <button
                            onClick={() => router.back()}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h1 className="text-lg font-bold">{t('account') || 'Mi cuenta'}</h1>
                        <div className="w-10" />
                    </div>

                    {/* Profile Card */}
                    <div className="bg-white/10 backdrop-blur rounded-2xl p-6 border border-white/20">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                                <span className="text-2xl font-bold">
                                    {userName.charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-lg font-bold text-white truncate">{userName}</p>
                                {userEmail && (
                                    <p className="text-sm text-white/70 truncate">{userEmail}</p>
                                )}
                            </div>
                        </div>

                        {userEmail ? (
                            <button
                                onClick={handleLogout}
                                className="w-full mt-4 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                            >
                                <LogOut className="w-4 h-4" />
                                Cerrar sesión
                            </button>
                        ) : (
                            <button
                                onClick={handleLoginGoogle}
                                disabled={isLoadingAuth}
                                className="w-full mt-4 px-4 py-3 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                            >
                                {isLoadingAuth ? '...' : '🔐 Iniciar sesión con Google'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
                {/* Favorites Section */}
                <div>
                    <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                        {t('favorites') || 'Paradas favoritas'}
                    </h2>

                    {/* Filter Buttons */}
                    <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                        {['all', 'metro', 'bilbobus', 'bizkaibus'].map(filter => (
                            <button
                                key={filter}
                                onClick={() => setFilterType(filter as TransportFilter)}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                                    filterType === filter
                                        ? filter === 'metro'
                                            ? 'bg-orange-500 text-white'
                                            : filter === 'bilbobus'
                                            ? 'bg-red-500 text-white'
                                            : 'bg-slate-900 text-white'
                                        : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300'
                                }`}
                            >
                                {filter === 'all' && '✓ Todos'}
                                {filter === 'metro' && '🚇 Metro'}
                                {filter === 'bilbobus' && '🚌 Bilbobus'}
                                {filter === 'bizkaibus' && '🚍 Bizkaibus'}
                            </button>
                        ))}
                    </div>

                    {/* Favorites List */}
                    {filteredFavorites.length > 0 ? (
                        <div className="space-y-2">
                            {filteredFavorites.map((fav, idx) => (
                                <div
                                    key={`${fav.stopId}-${fav.agency}-${idx}`}
                                    className="bg-white rounded-lg border border-slate-200 p-4 flex items-center justify-between hover:shadow-md transition-shadow group"
                                >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                                            fav.agency === 'metro' ? 'bg-orange-100' : 'bg-red-100'
                                        }`}>
                                            {getTransportIcon(fav.agency)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-slate-900 truncate">{fav.name}</p>
                                            <p className="text-xs text-slate-500">{getTransportLabel(fav.agency)}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => removeFavorite(fav.stopId)}
                                        className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <Heart className="w-4 h-4 fill-current" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
                            <Heart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="text-slate-600 font-medium">{t('noFavorites') || 'No tienes paradas favoritas'}</p>
                            <p className="text-sm text-slate-400 mt-1">Añade paradas desde la pantalla principal</p>
                        </div>
                    )}
                </div>

                {/* Coming Soon Section */}
                <div className="bg-slate-100 rounded-lg border border-slate-200 p-6 text-center">
                    <p className="text-slate-600 font-medium mb-2">📋 Próximas funcionalidades</p>
                    <p className="text-sm text-slate-500">
                        Seguimiento de líneas favoritas, historial de búsquedas y notificaciones de incidencias
                    </p>
                </div>
            </div>
        </div>
    );
}
