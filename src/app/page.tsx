'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FavoriteStopCard } from '@/components/FavoriteStopCard';
import { NearbyStops } from '@/components/NearbyStops';
import { StopsMap } from '@/components/StopsMap';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useFavorites } from '@/context/FavoritesContext';
import { useGeolocation } from '@/context/GeolocationContext';
import { useLanguage } from '@/context/LanguageContext';
import { getNearbyStops, getAllStops, searchStops, type SearchResult } from '@/app/actions';
import { MapPin, Heart, Navigation, Map, Loader2, ArrowRight, Compass, Search, ArrowRightLeft } from 'lucide-react';

interface Stop extends SearchResult {
    lat?: number;
    lon?: number;
}

export default function Home() {
    const router = useRouter();
    const { t } = useLanguage();
    const { favorites, isLoading: favLoading } = useFavorites();
    const { location, requestLocation, isLoading: geoLoading } = useGeolocation();
    const [nearbyStops, setNearbyStops] = useState<SearchResult[]>([]);
    const [allStops, setAllStops] = useState<SearchResult[]>([]);
    const [isLoadingNearby, setIsLoadingNearby] = useState(false);
    const [isLoadingMap, setIsLoadingMap] = useState(false);
    const [activeTab, setActiveTab] = useState<'favorites' | 'nearby' | 'map'>('favorites');
    
    // Search inputs state
    const [origin, setOrigin] = useState('');
    const [destination, setDestination] = useState('');
    const [originResults, setOriginResults] = useState<Stop[]>([]);
    const [destResults, setDestResults] = useState<Stop[]>([]);
    const [selectedOrigin, setSelectedOrigin] = useState<Stop | null>(null);
    const [selectedDest, setSelectedDest] = useState<Stop | null>(null);
    const [isLoadingOrigin, setIsLoadingOrigin] = useState(false);
    const [isLoadingDest, setIsLoadingDest] = useState(false);
    const [showOriginDropdown, setShowOriginDropdown] = useState(false);
    const [showDestDropdown, setShowDestDropdown] = useState(false);

    // Load all stops for the map
    useEffect(() => {
        const loadAllStops = async () => {
            setIsLoadingMap(true);
            try {
                const results = await getAllStops();
                setAllStops(results.map(r => ({
                    id: r.id,
                    name: r.name,
                    agency: (r.agency || 'metro') as 'metro' | 'bilbobus',
                    lat: r.lat || 0,
                    lon: r.lon || 0
                })));
            } catch (err) {
                console.error('Error loading stops:', err);
            }
            setIsLoadingMap(false);
        };
        loadAllStops();
    }, []);

    // Load nearby stops when we have location
    useEffect(() => {
        if (location) {
            const loadNearby = async () => {
                setIsLoadingNearby(true);
                try {
                    const results = await getNearbyStops(location.lat, location.lon, 2);
                    setNearbyStops(results.map(r => ({
                        id: r.id,
                        name: r.name,
                        agency: (r.agency || 'metro') as 'metro' | 'bilbobus',
                        lat: r.lat || 0,
                        lon: r.lon || 0
                    })));
                } catch (err) {
                    console.error('Error loading nearby stops:', err);
                }
                setIsLoadingNearby(false);
            };
            loadNearby();
        }
    }, [location]);

    // Buscar origen
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (origin.length >= 2) {
                setIsLoadingOrigin(true);
                const data = await searchStops(origin);
                setOriginResults(data as Stop[]);
                setShowOriginDropdown(true);
                setIsLoadingOrigin(false);
            } else {
                setOriginResults([]);
                setShowOriginDropdown(false);
            }
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [origin]);

    // Buscar destino
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (destination.length >= 2) {
                setIsLoadingDest(true);
                const data = await searchStops(destination);
                setDestResults(data as Stop[]);
                setShowDestDropdown(true);
                setIsLoadingDest(false);
            } else {
                setDestResults([]);
                setShowDestDropdown(false);
            }
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [destination]);

    const handleStopSelect = (stopId: string, agency: string) => {
        router.push(`/station/${stopId}?agency=${agency}`);
    };

    const handleSearch = () => {
        if (selectedOrigin && selectedDest) {
            router.push(`/route?origin=${selectedOrigin.id}&originAgency=${selectedOrigin.agency}&dest=${selectedDest.id}&destAgency=${selectedDest.agency}`);
        }
    };

    const handleSwap = () => {
        const temp = selectedOrigin;
        setSelectedOrigin(selectedDest);
        setSelectedDest(temp);
        
        const tempStr = origin;
        setOrigin(destination);
        setDestination(tempStr);
    };

    return (
        <div className="min-h-screen bg-white pb-24">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
                <div className="max-w-4xl mx-auto px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">
                                {t('appName')}
                            </h1>
                        </div>
                        <LanguageSwitcher />
                    </div>
                </div>
            </div>

            {/* Route Search Section */}
            <div className="bg-slate-50 border-b border-slate-200">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="space-y-3">
                        {/* Origin Input */}
                        <div className="relative">
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                                {t('origin')}
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={origin}
                                    onChange={(e) => setOrigin(e.target.value)}
                                    onFocus={() => origin.length >= 2 && setShowOriginDropdown(true)}
                                    placeholder={t('whereFrom')}
                                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 
                                             placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                             transition-all"
                                />
                                {selectedOrigin && (
                                    <button
                                        onClick={() => {
                                            setOrigin('');
                                            setSelectedOrigin(null);
                                        }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>

                            {/* Origin Dropdown */}
                            {showOriginDropdown && origin.length >= 2 && (
                                <>
                                    <div 
                                        className="fixed inset-0 z-30"
                                        onClick={() => setShowOriginDropdown(false)}
                                    />
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-40 max-h-64 overflow-y-auto">
                                        {isLoadingOrigin ? (
                                            <div className="p-4 text-center text-sm text-slate-500">
                                                {t('loading')}
                                            </div>
                                        ) : originResults.length === 0 ? (
                                            <div className="p-4 text-center text-sm text-slate-500">
                                                No results
                                            </div>
                                        ) : (
                                            originResults.map((stop) => (
                                                <button
                                                    key={`${stop.id}-${stop.agency}`}
                                                    onClick={() => {
                                                        setSelectedOrigin(stop);
                                                        setOrigin(stop.name);
                                                        setShowOriginDropdown(false);
                                                    }}
                                                    className="w-full text-left px-4 py-2.5 hover:bg-blue-50 border-b border-slate-100 last:border-b-0 transition-colors"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className="w-4 h-4 text-slate-500 flex-shrink-0" />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-sm font-medium text-slate-900">{stop.name}</div>
                                                            <div className="text-xs text-slate-500">
                                                                {stop.agency === 'metro' ? 'Metro' : 'Bilbobus'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Swap Button */}
                        {selectedOrigin && selectedDest && (
                            <div className="flex justify-center">
                                <button
                                    onClick={handleSwap}
                                    className="p-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 transition-colors text-slate-600 hover:text-slate-900"
                                    title={t('swapOriginDest')}
                                >
                                    <ArrowRightLeft className="w-5 h-5" />
                                </button>
                            </div>
                        )}

                        {/* Destination Input */}
                        <div className="relative">
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                                {t('destination')}
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={destination}
                                    onChange={(e) => setDestination(e.target.value)}
                                    onFocus={() => destination.length >= 2 && setShowDestDropdown(true)}
                                    placeholder={t('whereTo')}
                                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-900 
                                             placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                             transition-all"
                                />
                                {selectedDest && (
                                    <button
                                        onClick={() => {
                                            setDestination('');
                                            setSelectedDest(null);
                                        }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>

                            {/* Destination Dropdown */}
                            {showDestDropdown && destination.length >= 2 && (
                                <>
                                    <div 
                                        className="fixed inset-0 z-30"
                                        onClick={() => setShowDestDropdown(false)}
                                    />
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-lg z-40 max-h-64 overflow-y-auto">
                                        {isLoadingDest ? (
                                            <div className="p-4 text-center text-sm text-slate-500">
                                                {t('loading')}
                                            </div>
                                        ) : destResults.length === 0 ? (
                                            <div className="p-4 text-center text-sm text-slate-500">
                                                No results
                                            </div>
                                        ) : (
                                            destResults.map((stop) => (
                                                <button
                                                    key={`${stop.id}-${stop.agency}`}
                                                    onClick={() => {
                                                        setSelectedDest(stop);
                                                        setDestination(stop.name);
                                                        setShowDestDropdown(false);
                                                    }}
                                                    className="w-full text-left px-4 py-2.5 hover:bg-blue-50 border-b border-slate-100 last:border-b-0 transition-colors"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className="w-4 h-4 text-slate-500 flex-shrink-0" />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-sm font-medium text-slate-900">{stop.name}</div>
                                                            <div className="text-xs text-slate-500">
                                                                {stop.agency === 'metro' ? 'Metro' : 'Bilbobus'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Search Button */}
                        <button
                            onClick={handleSearch}
                            disabled={!selectedOrigin || !selectedDest}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 
                                     disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold transition-colors"
                        >
                            <Search className="w-5 h-5" />
                            {t('searchRoute')}
                        </button>
                    </div>
                </div>
            </div>

            <main className="max-w-4xl mx-auto px-4 py-6">
                {/* Navigation Tabs */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    <button
                        onClick={() => setActiveTab('favorites')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all whitespace-nowrap ${
                            activeTab === 'favorites'
                                ? 'bg-orange-500 text-white shadow-md'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        <Heart className={`w-4 h-4 ${activeTab === 'favorites' ? 'fill-current' : ''}`} />
                        <span>{t('favorites')}</span>
                        {favorites.length > 0 && (
                            <span className="bg-white/30 px-2 py-0.5 rounded-full text-xs font-bold">
                                {favorites.length}
                            </span>
                        )}
                    </button>

                    {location && (
                        <button
                            onClick={() => setActiveTab('nearby')}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all whitespace-nowrap ${
                                activeTab === 'nearby'
                                    ? 'bg-blue-500 text-white shadow-md'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            <Navigation className="w-4 h-4" />
                            <span>{t('nearby')}</span>
                        </button>
                    )}

                    <button
                        onClick={() => setActiveTab('map')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all whitespace-nowrap ${
                            activeTab === 'map'
                                ? 'bg-green-500 text-white shadow-md'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        <Map className="w-4 h-4" />
                        <span>{t('map')}</span>
                    </button>
                </div>

                {/* Content Sections */}

                {/* Favoritos Tab */}
                {activeTab === 'favorites' && (
                    <div className="space-y-4 animate-fadeIn">
                        {favLoading ? (
                            <div className="text-center py-16">
                                <div className="inline-flex flex-col items-center gap-4">
                                    <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
                                    <p className="text-slate-500">{t('loading')}</p>
                                </div>
                            </div>
                        ) : favorites.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center space-y-4">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-2">
                                    <Heart className="w-8 h-8 text-slate-300" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold text-slate-900 mb-2">
                                        {t('favorites')} vacío
                                    </h2>
                                    <p className="text-slate-600 max-w-sm mx-auto">
                                        Busca un trayecto y marca las estaciones como favoritas para acceder rápidamente
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {favorites.map((fav) => (
                                    <FavoriteStopCard
                                        key={fav.id}
                                        stopId={fav.stopId}
                                        name={fav.name}
                                        agency={fav.agency}
                                        lat={fav.lat}
                                        lon={fav.lon}
                                        onTap={() => handleStopSelect(fav.stopId, fav.agency)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Cercanas Tab */}
                {activeTab === 'nearby' && (
                    <div className="animate-fadeIn">
                        {!location ? (
                            <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center space-y-6">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-2">
                                    <MapPin className="w-8 h-8 text-blue-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-semibold text-slate-900 mb-2">
                                        {t('nearby')}
                                    </h2>
                                    <p className="text-slate-600 max-w-sm mx-auto mb-6">
                                        Activa tu ubicación para ver las paradas más próximas a ti
                                    </p>
                                    <button
                                        onClick={requestLocation}
                                        disabled={geoLoading}
                                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 active:scale-95 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                                    >
                                        <Navigation className="w-4 h-4" />
                                        {geoLoading ? t('loading') : 'Detectar ubicación'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <NearbyStops
                                stops={nearbyStops}
                                onSelectStop={handleStopSelect}
                                isLoading={isLoadingNearby}
                            />
                        )}
                    </div>
                )}

                {/* Mapa Tab */}
                {activeTab === 'map' && (
                    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm animate-fadeIn">
                        {isLoadingMap ? (
                            <div className="h-96 flex items-center justify-center">
                                <div className="text-center space-y-3">
                                    <Loader2 className="w-8 h-8 animate-spin text-slate-300 mx-auto" />
                                    <p className="text-slate-500">{t('loading')}</p>
                                </div>
                            </div>
                        ) : (
                            <StopsMap
                                stops={allStops}
                                onSelectStop={handleStopSelect}
                            />
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}

