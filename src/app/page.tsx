'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FavoriteStopCard } from '@/components/FavoriteStopCard';
import { NearbyStops } from '@/components/NearbyStops';
import { StopsMap } from '@/components/StopsMap';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { MetroIncidents } from '@/components/MetroIncidents';
import { BottomNav, TransportType } from '@/components/BottomNav';
import { useFavorites } from '@/context/FavoritesContext';
import { useGeolocation } from '@/context/GeolocationContext';
import { useLanguage } from '@/context/LanguageContext';
import { getNearbyStops, getAllStops } from '@/app/actions';
import { searchStops } from '@/lib/stopSearch';
import { Heart, Navigation, Map, Loader2, Search, ArrowUpDown, Train, X, Bus, Construction, MapPin } from 'lucide-react';
import { searchBizkaibusStops, getBizkaibusArrivals, BizkaibusStop, BizkaibusArrival } from '@/lib/bizkaibus';

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
    const [activeTransport, setActiveTransport] = useState<TransportType>('metro');
    
    // Search inputs state
    const [origin, setOrigin] = useState('');
    const [destination, setDestination] = useState('');
    const [originResults, setOriginResults] = useState<StopLocation[]>([]);
    const [destResults, setDestResults] = useState<StopLocation[]>([]);
    const [selectedOrigin, setSelectedOrigin] = useState<StopLocation | null>(null);
    const [selectedDest, setSelectedDest] = useState<StopLocation | null>(null);
    const [showOriginDropdown, setShowOriginDropdown] = useState(false);
    const [showDestDropdown, setShowDestDropdown] = useState(false);
    
    // Bizkaibus state
    const [bizkaibusSearch, setBizkaibusSearch] = useState('');
    const [bizkaibusResults, setBizkaibusResults] = useState<BizkaibusStop[]>([]);
    const [selectedBizkaibusStop, setSelectedBizkaibusStop] = useState<BizkaibusStop | null>(null);
    const [bizkaibusArrivals, setBizkaibusArrivals] = useState<BizkaibusArrival[]>([]);
    const [isLoadingBizkaibus, setIsLoadingBizkaibus] = useState(false);
    const [showBizkaibusDropdown, setShowBizkaibusDropdown] = useState(false);

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

    // Buscar paradas Bizkaibus
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (bizkaibusSearch.length >= 2 && !selectedBizkaibusStop) {
                const results = await searchBizkaibusStops(bizkaibusSearch);
                setBizkaibusResults(results);
                setShowBizkaibusDropdown(true);
            } else {
                setBizkaibusResults([]);
                setShowBizkaibusDropdown(false);
            }
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [bizkaibusSearch, selectedBizkaibusStop]);

    // Cargar llegadas de Bizkaibus cuando se selecciona una parada
    const loadBizkaibusArrivals = useCallback(async (stopId: string) => {
        setIsLoadingBizkaibus(true);
        try {
            const response = await getBizkaibusArrivals(stopId);
            if (response.status === 'OK') {
                setBizkaibusArrivals(response.arrivals);
            } else {
                setBizkaibusArrivals([]);
            }
        } catch (err) {
            console.error('Error loading Bizkaibus arrivals:', err);
            setBizkaibusArrivals([]);
        } finally {
            setIsLoadingBizkaibus(false);
        }
    }, []);

    const handleSelectBizkaibusStop = useCallback((stop: BizkaibusStop) => {
        setSelectedBizkaibusStop(stop);
        setBizkaibusSearch(stop.name);
        setShowBizkaibusDropdown(false);
        loadBizkaibusArrivals(stop.id);
    }, [loadBizkaibusArrivals]);

    const handleClearBizkaibusStop = useCallback(() => {
        setSelectedBizkaibusStop(null);
        setBizkaibusSearch('');
        setBizkaibusArrivals([]);
    }, []);

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
            className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-center gap-3 active:bg-slate-100"
        >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                stop.agency === 'metro' ? 'bg-orange-100' : 'bg-red-100'
            }`}>
                {stop.agency === 'metro' ? (
                    <img src="/logoMetro.svg" alt="Metro Bilbao" className="w-6 h-6 object-contain" />
                ) : (
                    <Bus className="w-4 h-4 text-red-600" />
                )}
            </div>
            <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-slate-900 truncate">{stop.name}</div>
                <div className="text-xs text-slate-500">{stop.agency === 'metro' ? 'Metro Bilbao' : 'Bilbobus'}</div>
            </div>
        </button>
    );

    // Render coming soon placeholder for other transports
    const renderComingSoon = (transportName: string, color: string) => (
        <div className="flex-1 flex items-center justify-center">
            <div className="text-center p-8">
                <div className={`w-20 h-20 rounded-2xl ${color} mx-auto mb-4 flex items-center justify-center`}>
                    <Construction className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">{transportName}</h2>
                <p className="text-slate-500 text-sm max-w-xs mx-auto">
                    Estamos trabajando para traerte información en tiempo real de {transportName}
                </p>
                <span className="inline-block mt-4 px-4 py-2 rounded-full bg-slate-100 text-slate-600 text-sm font-medium">
                    Próximamente
                </span>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header - Minimalista */}
            <header className="bg-white border-b border-slate-100 sticky top-0 z-40">
                <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
                            <Train className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-lg font-bold text-slate-900">BilboTrans</span>
                    </div>
                    <LanguageSwitcher />
                </div>
            </header>

            {/* Metro Content */}
            {activeTransport === 'metro' && (
                <div className="animate-fadeIn">
                    {/* Search Card */}
                    <div className="bg-white border-b border-slate-100">
                        <div className="max-w-lg mx-auto p-4">
                            <div className="space-y-3">
                                {/* Origin */}
                                <div className="relative">
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full bg-green-500 shrink-0" />
                                        <input
                                            type="text"
                                            value={origin}
                                            onChange={(e) => {
                                                setOrigin(e.target.value);
                                                if (selectedOrigin) setSelectedOrigin(null);
                                            }}
                                            onFocus={() => origin.length >= 2 && !selectedOrigin && setShowOriginDropdown(true)}
                                            placeholder={t('whereFrom')}
                                            className="flex-1 py-2.5 text-sm text-slate-900 placeholder-slate-400 
                                                     bg-transparent border-none focus:outline-none"
                                        />
                                        {selectedOrigin && (
                                            <button
                                                onClick={() => { setOrigin(''); setSelectedOrigin(null); }}
                                                className="p-1 rounded-full hover:bg-slate-100 text-slate-400"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                    
                                    {showOriginDropdown && originResults.length > 0 && (
                                        <>
                                            <div className="fixed inset-0 z-30" onClick={() => setShowOriginDropdown(false)} />
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-40 max-h-64 overflow-y-auto">
                                                {originResults.map((stop) => renderDropdownItem(stop, 'origin'))}
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Divider with Swap */}
                                <div className="flex items-center gap-3">
                                    <div className="w-3 flex justify-center">
                                        <div className="w-0.5 h-6 bg-slate-200" />
                                    </div>
                                    <div className="flex-1 h-px bg-slate-100" />
                                    <button
                                        onClick={handleSwap}
                                        disabled={!selectedOrigin && !selectedDest}
                                        className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-30"
                                    >
                                        <ArrowUpDown className="w-4 h-4 text-slate-500" />
                                    </button>
                                </div>

                                {/* Destination */}
                                <div className="relative">
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full bg-red-500 shrink-0" />
                                        <input
                                            type="text"
                                            value={destination}
                                            onChange={(e) => {
                                                setDestination(e.target.value);
                                                if (selectedDest) setSelectedDest(null);
                                            }}
                                            onFocus={() => destination.length >= 2 && !selectedDest && setShowDestDropdown(true)}
                                            placeholder={t('whereTo')}
                                            className="flex-1 py-2.5 text-sm text-slate-900 placeholder-slate-400 
                                                     bg-transparent border-none focus:outline-none"
                                        />
                                        {selectedDest && (
                                            <button
                                                onClick={() => { setDestination(''); setSelectedDest(null); }}
                                                className="p-1 rounded-full hover:bg-slate-100 text-slate-400"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>

                                    {showDestDropdown && destResults.length > 0 && (
                                        <>
                                            <div className="fixed inset-0 z-30" onClick={() => setShowDestDropdown(false)} />
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-40 max-h-64 overflow-y-auto">
                                                {destResults.map((stop) => renderDropdownItem(stop, 'dest'))}
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Search Button */}
                                <button
                                    onClick={handleSearch}
                                    disabled={!selectedOrigin || !selectedDest}
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl 
                                             bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 
                                             text-white disabled:text-slate-400 font-semibold text-sm
                                             transition-all active:scale-[0.98] disabled:cursor-not-allowed"
                                >
                                    <Search className="w-4 h-4" />
                                    {t('searchRoute')}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <main className="max-w-lg mx-auto px-4 py-4 space-y-4">
                        {/* Metro Incidents */}
                        <MetroIncidents />

                        {/* Quick Tabs */}
                        <div className="flex gap-2">
                            {[
                                { id: 'favorites', icon: Heart, label: t('favorites'), count: favorites.length },
                                { id: 'nearby', icon: Navigation, label: t('nearby') },
                                { id: 'map', icon: Map, label: t('map') },
                            ].map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as typeof activeTab)}
                                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                            isActive
                                                ? 'bg-orange-500 text-white'
                                                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                                        }`}
                                    >
                                        <Icon className={`w-4 h-4 ${isActive && tab.id === 'favorites' ? 'fill-current' : ''}`} />
                                        <span className="hidden sm:inline">{tab.label}</span>
                                        {tab.count !== undefined && tab.count > 0 && (
                                            <span className={`text-xs px-1.5 rounded-full ${
                                                isActive ? 'bg-white/20' : 'bg-orange-100 text-orange-600'
                                            }`}>
                                                {tab.count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Tab Content */}
                        {activeTab === 'favorites' && (
                            <div className="space-y-3 animate-fadeIn">
                                {favLoading ? (
                                    <div className="py-12 text-center">
                                        <Loader2 className="w-6 h-6 animate-spin text-slate-300 mx-auto" />
                                    </div>
                                ) : favorites.length === 0 ? (
                                    <div className="bg-white rounded-xl p-8 text-center border border-slate-100">
                                        <Heart className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                                        <p className="text-slate-600 font-medium">Sin favoritos</p>
                                        <p className="text-sm text-slate-400 mt-1">Busca un trayecto y guarda tus estaciones</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-3">
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

                        {activeTab === 'nearby' && (
                            <div className="animate-fadeIn">
                                {!location ? (
                                    <div className="bg-white rounded-xl p-8 text-center border border-slate-100">
                                        <Navigation className="w-10 h-10 text-blue-200 mx-auto mb-3" />
                                        <p className="text-slate-600 font-medium">Ubicación desactivada</p>
                                        <p className="text-sm text-slate-400 mt-1 mb-4">Activa tu ubicación para ver paradas cercanas</p>
                                        <button
                                            onClick={requestLocation}
                                            disabled={geoLoading}
                                            className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                                        >
                                            {geoLoading ? 'Activando...' : 'Activar ubicación'}
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

                        {activeTab === 'map' && (
                            <div className="bg-white rounded-xl border border-slate-100 overflow-hidden animate-fadeIn">
                                {isLoadingMap ? (
                                    <div className="h-72 flex items-center justify-center">
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
            )}

            {/* Bilbobus - Coming Soon */}
            {activeTransport === 'bilbobus' && renderComingSoon('Bilbobus', 'bg-red-500')}

            {/* Bizkaibus - Functional */}
            {activeTransport === 'bizkaibus' && (
                <div className="flex-1 flex flex-col">
                    {/* Bizkaibus Header */}
                    <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-6">
                        <div className="max-w-lg mx-auto">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                                    <Bus className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">Bizkaibus</h2>
                                    <p className="text-sm text-white/70">Autobuses de Bizkaia</p>
                                </div>
                            </div>
                            
                            {/* Search */}
                            <div className="relative">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-600" />
                                    <input
                                        type="text"
                                        placeholder="Buscar parada..."
                                        value={bizkaibusSearch}
                                        onChange={(e) => {
                                            setBizkaibusSearch(e.target.value);
                                            if (selectedBizkaibusStop) {
                                                setSelectedBizkaibusStop(null);
                                                setBizkaibusArrivals([]);
                                            }
                                        }}
                                        className="w-full pl-10 pr-10 py-3 rounded-xl bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-white/50"
                                    />
                                    {bizkaibusSearch && (
                                        <button
                                            onClick={handleClearBizkaibusStop}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-100"
                                        >
                                            <X className="w-4 h-4 text-slate-400" />
                                        </button>
                                    )}
                                </div>

                                {/* Dropdown results */}
                                {showBizkaibusDropdown && bizkaibusResults.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-slate-200 max-h-64 overflow-y-auto z-50">
                                        {bizkaibusResults.map((stop) => (
                                            <button
                                                key={stop.id}
                                                onClick={() => handleSelectBizkaibusStop(stop)}
                                                className="w-full text-left px-4 py-3 hover:bg-green-50 transition-colors flex items-center gap-3"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                                                    <Bus className="w-4 h-4 text-green-600" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-sm font-medium text-slate-900 truncate">{stop.name}</div>
                                                    <div className="text-xs text-slate-500">{stop.municipality}</div>
                                                </div>
                                                <span className="text-xs text-slate-400 shrink-0">#{stop.id}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Results */}
                    <div className="flex-1 max-w-lg mx-auto w-full px-4 py-6">
                        {selectedBizkaibusStop ? (
                            <div className="space-y-4">
                                {/* Selected stop info */}
                                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                                            <Bus className="w-6 h-6 text-green-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-slate-900 truncate">{selectedBizkaibusStop.name}</h3>
                                            <p className="text-sm text-slate-500">{selectedBizkaibusStop.municipality} • Parada #{selectedBizkaibusStop.id}</p>
                                        </div>
                                        <button
                                            onClick={() => loadBizkaibusArrivals(selectedBizkaibusStop.id)}
                                            disabled={isLoadingBizkaibus}
                                            className="p-2 rounded-lg bg-green-100 hover:bg-green-200 text-green-600 transition-colors"
                                        >
                                            <Loader2 className={`w-5 h-5 ${isLoadingBizkaibus ? 'animate-spin' : ''}`} />
                                        </button>
                                    </div>
                                </div>

                                {/* Arrivals */}
                                {isLoadingBizkaibus ? (
                                    <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                                        <Loader2 className="w-8 h-8 animate-spin text-green-500 mx-auto mb-2" />
                                        <p className="text-slate-500">Cargando llegadas...</p>
                                    </div>
                                ) : bizkaibusArrivals.length > 0 ? (
                                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                        <div className="p-4 border-b border-slate-100 bg-green-50">
                                            <h3 className="font-semibold text-green-800 flex items-center gap-2">
                                                <Bus className="w-4 h-4" />
                                                Próximos buses
                                            </h3>
                                        </div>
                                        <div className="divide-y divide-slate-100">
                                            {bizkaibusArrivals.map((arrival, idx) => (
                                                <div 
                                                    key={`${arrival.lineId}-${arrival.destination}-${idx}`}
                                                    className={`p-4 flex items-center justify-between ${idx === 0 ? 'bg-green-50' : ''}`}
                                                >
                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                        <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 ${
                                                            idx === 0 ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-600'
                                                        }`}>
                                                            <span className="text-lg font-bold leading-none">{arrival.etaMinutes}</span>
                                                            <span className="text-[10px] font-medium">min</span>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="px-2 py-0.5 rounded bg-green-600 text-white text-xs font-bold">
                                                                    {arrival.lineId}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm text-slate-700 truncate mt-0.5">{arrival.destination}</p>
                                                        </div>
                                                    </div>
                                                    {arrival.nextEtaMinutes && (
                                                        <div className="text-right shrink-0 ml-3">
                                                            <p className="text-xs text-slate-400">Siguiente</p>
                                                            <p className="text-sm font-medium text-slate-600">{arrival.nextEtaMinutes} min</p>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                                        <Bus className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                        <p className="text-slate-600 font-medium">No hay buses disponibles</p>
                                        <p className="text-sm text-slate-400 mt-1">Intenta con otra parada o más tarde</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <div className="w-20 h-20 rounded-2xl bg-green-100 mx-auto mb-4 flex items-center justify-center">
                                    <MapPin className="w-10 h-10 text-green-500" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 mb-2">Busca una parada</h3>
                                <p className="text-slate-500 text-sm max-w-xs mx-auto">
                                    Introduce el nombre o número de una parada de Bizkaibus para ver los próximos buses
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Renfe - Coming Soon */}
            {activeTransport === 'renfe' && renderComingSoon('Renfe Cercanías', 'bg-purple-500')}

            {/* Bottom Navigation */}
            <BottomNav 
                activeTransport={activeTransport} 
                onTransportChange={setActiveTransport} 
            />
        </div>
    );
}

