'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FavoriteStopCard } from '@/components/FavoriteStopCard';
import { NearbyStops } from '@/components/NearbyStops';
import { StopsMap } from '@/components/StopsMap';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useFavorites } from '@/context/FavoritesContext';
import { useGeolocation } from '@/context/GeolocationContext';
import { useLanguage } from '@/context/LanguageContext';
import { getNearbyStops, getAllStops, searchStops } from '@/app/actions';
import { MapPin, Heart, Navigation, Map, Loader2, Search, ArrowUpDown, Train, X } from 'lucide-react';

interface StopLocation {
    id: string;
    name: string;
    agency: 'metro' | 'bilbobus';
    lat: number;
    lon: number;
}

export default function Home() {
    const router = useRouter();
    const { t } = useLanguage();
    const { favorites, isLoading: favLoading } = useFavorites();
    const { location, requestLocation, isLoading: geoLoading } = useGeolocation();
    const [nearbyStops, setNearbyStops] = useState<StopLocation[]>([]);
    const [allStops, setAllStops] = useState<StopLocation[]>([]);
    const [isLoadingNearby, setIsLoadingNearby] = useState(false);
    const [isLoadingMap, setIsLoadingMap] = useState(false);
    const [activeTab, setActiveTab] = useState<'favorites' | 'nearby' | 'map'>('favorites');
    
    // Search inputs state
    const [origin, setOrigin] = useState('');
    const [destination, setDestination] = useState('');
    const [originResults, setOriginResults] = useState<StopLocation[]>([]);
    const [destResults, setDestResults] = useState<StopLocation[]>([]);
    const [selectedOrigin, setSelectedOrigin] = useState<StopLocation | null>(null);
    const [selectedDest, setSelectedDest] = useState<StopLocation | null>(null);
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
                    agency: r.agency === 'bilbobus' ? 'bilbobus' : 'metro',
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
                        agency: r.agency === 'bilbobus' ? 'bilbobus' : 'metro',
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
            if (origin.length >= 2 && !selectedOrigin) {
                const data = await searchStops(origin);
                setOriginResults(data.map(r => ({
                    id: r.id,
                    name: r.name,
                    agency: r.agency === 'bilbobus' ? 'bilbobus' : 'metro',
                    lat: r.lat || 0,
                    lon: r.lon || 0
                })));
                setShowOriginDropdown(true);
            } else {
                setOriginResults([]);
                setShowOriginDropdown(false);
            }
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [origin, selectedOrigin]);

    // Buscar destino
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (destination.length >= 2 && !selectedDest) {
                const data = await searchStops(destination);
                setDestResults(data.map(r => ({
                    id: r.id,
                    name: r.name,
                    agency: r.agency === 'bilbobus' ? 'bilbobus' : 'metro',
                    lat: r.lat || 0,
                    lon: r.lon || 0
                })));
                setShowDestDropdown(true);
            } else {
                setDestResults([]);
                setShowDestDropdown(false);
            }
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [destination, selectedDest]);

    const handleStopSelect = useCallback((stopId: string, agency: string) => {
        router.push(`/station/${stopId}?agency=${agency}`);
    }, [router]);

    const handleSearch = useCallback(() => {
        if (selectedOrigin && selectedDest) {
            router.push(`/route?origin=${selectedOrigin.id}&originAgency=${selectedOrigin.agency}&dest=${selectedDest.id}&destAgency=${selectedDest.agency}`);
        }
    }, [selectedOrigin, selectedDest, router]);

    const handleSwap = useCallback(() => {
        const temp = selectedOrigin;
        setSelectedOrigin(selectedDest);
        setSelectedDest(temp);
        
        const tempStr = origin;
        setOrigin(destination);
        setDestination(tempStr);
    }, [selectedOrigin, selectedDest, origin, destination]);

    const renderDropdownItem = (stop: StopLocation, type: 'origin' | 'dest') => (
        <button
            key={`${stop.id}-${stop.agency}`}
            onClick={() => {
                if (type === 'origin') {
                    setSelectedOrigin(stop);
                    setOrigin(stop.name);
                    setShowOriginDropdown(false);
                } else {
                    setSelectedDest(stop);
                    setDestination(stop.name);
                    setShowDestDropdown(false);
                }
            }}
            className="w-full text-left px-3 py-2.5 hover:bg-orange-50 transition-colors flex items-center gap-3"
        >
            {stop.agency === 'metro' ? (
                <div className="w-6 h-6 rounded-md bg-orange-100 flex items-center justify-center shrink-0">
                    <Train className="w-3.5 h-3.5 text-orange-600" />
                </div>
            ) : (
                <div className="w-6 h-6 rounded-md bg-red-100 flex items-center justify-center shrink-0">
                    <MapPin className="w-3.5 h-3.5 text-red-600" />
                </div>
            )}
            <div className="min-w-0">
                <div className="text-sm font-medium text-slate-900 truncate">{stop.name}</div>
                <div className="text-xs text-slate-500">{stop.agency === 'metro' ? 'Metro Bilbao' : 'Bilbobus'}</div>
            </div>
        </button>
    );

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Hero Section */}
            <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 text-white">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                                <Train className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold">{t('appName')}</h1>
                                <p className="text-xs text-white/80">{t('realtimeSchedules')}</p>
                            </div>
                        </div>
                        <LanguageSwitcher />
                    </div>

                    {/* Route Search Card */}
                    <div className="bg-white rounded-2xl p-4 shadow-xl">
                        <div className="space-y-3">
                            {/* Origin Input */}
                            <div className="relative">
                                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                                    {t('origin')}
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={origin}
                                        onChange={(e) => {
                                            setOrigin(e.target.value);
                                            if (selectedOrigin) setSelectedOrigin(null);
                                        }}
                                        onFocus={() => origin.length >= 2 && !selectedOrigin && setShowOriginDropdown(true)}
                                        placeholder={t('whereFrom')}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 
                                                 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500
                                                 transition-all text-sm"
                                    />
                                    {selectedOrigin && (
                                        <button
                                            onClick={() => {
                                                setOrigin('');
                                                setSelectedOrigin(null);
                                            }}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                {/* Origin Dropdown */}
                                {showOriginDropdown && originResults.length > 0 && (
                                    <>
                                        <button
                                            type="button"
                                            className="fixed inset-0 z-30 cursor-default bg-transparent"
                                            onClick={() => setShowOriginDropdown(false)}
                                            onKeyDown={(e) => e.key === 'Escape' && setShowOriginDropdown(false)}
                                            aria-label="Close dropdown"
                                        />
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-40 max-h-56 overflow-y-auto divide-y divide-slate-100">
                                            {originResults.map((stop) => renderDropdownItem(stop, 'origin'))}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Swap Button */}
                            <div className="flex justify-center -my-1">
                                <button
                                    onClick={handleSwap}
                                    disabled={!selectedOrigin && !selectedDest}
                                    className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors text-slate-500 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                                    title={t('swapOriginDest')}
                                >
                                    <ArrowUpDown className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Destination Input */}
                            <div className="relative">
                                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
                                    {t('destination')}
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={destination}
                                        onChange={(e) => {
                                            setDestination(e.target.value);
                                            if (selectedDest) setSelectedDest(null);
                                        }}
                                        onFocus={() => destination.length >= 2 && !selectedDest && setShowDestDropdown(true)}
                                        placeholder={t('whereTo')}
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 
                                                 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500
                                                 transition-all text-sm"
                                    />
                                    {selectedDest && (
                                        <button
                                            onClick={() => {
                                                setDestination('');
                                                setSelectedDest(null);
                                            }}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                {/* Destination Dropdown */}
                                {showDestDropdown && destResults.length > 0 && (
                                    <>
                                        <button
                                            type="button"
                                            className="fixed inset-0 z-30 cursor-default bg-transparent"
                                            onClick={() => setShowDestDropdown(false)}
                                            onKeyDown={(e) => e.key === 'Escape' && setShowDestDropdown(false)}
                                            aria-label="Close dropdown"
                                        />
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-40 max-h-56 overflow-y-auto divide-y divide-slate-100">
                                            {destResults.map((stop) => renderDropdownItem(stop, 'dest'))}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Search Button */}
                            <button
                                onClick={handleSearch}
                                disabled={!selectedOrigin || !selectedDest}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 
                                         disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed 
                                         text-white font-semibold transition-all active:scale-[0.98]"
                            >
                                <Search className="w-5 h-5" />
                                {t('searchRoute')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-4 py-6">
                {/* Navigation Tabs */}
                <div className="flex gap-2 mb-5">
                    <button
                        onClick={() => setActiveTab('favorites')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                            activeTab === 'favorites'
                                ? 'bg-orange-600 text-white shadow-md'
                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                    >
                        <Heart className={`w-4 h-4 ${activeTab === 'favorites' ? 'fill-current' : ''}`} />
                        <span>{t('favorites')}</span>
                        {favorites.length > 0 && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                                activeTab === 'favorites' ? 'bg-white/20' : 'bg-orange-100 text-orange-600'
                            }`}>
                                {favorites.length}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => setActiveTab('nearby')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                            activeTab === 'nearby'
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                    >
                        <Navigation className="w-4 h-4" />
                        <span>{t('nearby')}</span>
                    </button>

                    <button
                        onClick={() => setActiveTab('map')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                            activeTab === 'map'
                                ? 'bg-green-600 text-white shadow-md'
                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                    >
                        <Map className="w-4 h-4" />
                        <span>{t('map')}</span>
                    </button>
                </div>

                {/* Favorites Tab */}
                {activeTab === 'favorites' && (
                    <div className="animate-fadeIn">
                        {favLoading ? (
                            <div className="text-center py-12">
                                <Loader2 className="w-6 h-6 animate-spin text-slate-300 mx-auto" />
                                <p className="text-sm text-slate-500 mt-2">{t('loading')}</p>
                            </div>
                        ) : favorites.length === 0 ? (
                            <div className="bg-slate-50 rounded-2xl p-8 text-center">
                                <div className="w-12 h-12 rounded-full bg-slate-200 mx-auto mb-4 flex items-center justify-center">
                                    <Heart className="w-6 h-6 text-slate-400" />
                                </div>
                                <h3 className="text-base font-semibold text-slate-700 mb-1">{t('favorites')} vacío</h3>
                                <p className="text-sm text-slate-500">Busca un trayecto y guarda tus estaciones</p>
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

                {/* Nearby Tab */}
                {activeTab === 'nearby' && (
                    <div className="animate-fadeIn">
                        {!location ? (
                            <div className="bg-slate-50 rounded-2xl p-8 text-center">
                                <div className="w-12 h-12 rounded-full bg-blue-100 mx-auto mb-4 flex items-center justify-center">
                                    <Navigation className="w-6 h-6 text-blue-500" />
                                </div>
                                <h3 className="text-base font-semibold text-slate-700 mb-1">{t('nearby')}</h3>
                                <p className="text-sm text-slate-500 mb-4">Activa tu ubicación para ver paradas cercanas</p>
                                <button
                                    onClick={requestLocation}
                                    disabled={geoLoading}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                                >
                                    <Navigation className="w-4 h-4" />
                                    {geoLoading ? t('loading') : 'Activar ubicación'}
                                </button>
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

                {/* Map Tab */}
                {activeTab === 'map' && (
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm animate-fadeIn">
                        {isLoadingMap ? (
                            <div className="h-80 flex items-center justify-center">
                                <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
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

