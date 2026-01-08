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
    
    // Metro, Bilbobus, Bizkaibus state

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
    // useEffect(() => {
    //     const delayDebounceFn = setTimeout(async () => {
    //         if (bizkaibusSearch.length >= 2 && !selectedBizkaibusStop) {
    //             await searchBizkaibusStops(bizkaibusSearch);
    //         }
    //     }, 300);
    //     return () => clearTimeout(delayDebounceFn);
    // }, [bizkaibusSearch, selectedBizkaibusStop]);

    // Cargar llegadas de Bizkaibus cuando se selecciona una parada
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

    const renderFavorites = () => {
        if (favorites.length === 0) {
            return (
                <div className="bg-white rounded-xl p-8 text-center border border-slate-100">
                    <Heart className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-600 font-medium">Sin favoritos</p>
                    <p className="text-sm text-slate-400 mt-1">Busca un trayecto y guarda tus estaciones</p>
                </div>
            );
        }
        return favorites.map((fav) => (
            <FavoriteStopCard
                key={fav.id}
                stopId={fav.stopId}
                name={fav.name}
                agency={fav.agency}
                lat={fav.lat}
                lon={fav.lon}
                onTap={() => handleStopSelect(fav.stopId, fav.agency)}
            />
        ));
    };

    // Corrección de accesibilidad
    const renderDropdownOverlay = (onClick: () => void) => (
        <button
            className="fixed inset-0 z-30"
            onClick={onClick}
            aria-label="Cerrar dropdown"
        />
    );

    const renderNearbyStops = () => {
        if (!location) {
            return (
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
            );
        }
        return (
            <NearbyStops
                stops={nearbyStops}
                onSelectStop={handleStopSelect}
                isLoading={isLoadingNearby}
            />
        );
    };

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
                    <div className="flex items-center gap-2">
                        <LanguageSwitcher />
                        <button
                            onClick={() => router.push('/user')}
                            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center"
                            title="Mi cuenta"
                        >
                            👤
                        </button>
                    </div>
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
                                            style={{ fontSize: 16 }}
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
                                            {renderDropdownOverlay(() => setShowOriginDropdown(false))}
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
                                            style={{ fontSize: 16 }}
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
                                            {renderDropdownOverlay(() => setShowDestDropdown(false))}
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

                                {/* Metro Map Button */}
                                <button
                                    onClick={() => router.push('/metros')}
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl 
                                             bg-slate-100 hover:bg-slate-200
                                             text-slate-700 font-semibold text-sm
                                             transition-all active:scale-[0.98]"
                                >
                                    🗺️ Ver mapa del metro
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
                                ) : (
                                    renderFavorites()
                                )}
                            </div>
                        )}

                        {activeTab === 'nearby' && (
                            <div className="animate-fadeIn">
                                {renderNearbyStops()}
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
                    <div className="bg-linear-to-r from-green-500 to-emerald-600 text-white px-4 py-6">
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
                        </div>
                    </div>

                    {/* Results */}
                    <div className="flex-1 max-w-lg mx-auto w-full px-4 py-6">
                        <div className="text-center py-12">
                            <div className="w-20 h-20 rounded-2xl bg-green-100 mx-auto mb-4 flex items-center justify-center">
                                <MapPin className="w-10 h-10 text-green-500" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">Busca una parada</h3>
                            <p className="text-slate-500 text-sm max-w-xs mx-auto">
                                Introduce el nombre o número de una parada de Bizkaibus para ver los próximos buses
                            </p>
                        </div>
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

