'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FavoriteStopCard } from '@/components/shared/FavoriteStopCard';
import { NearbyStops } from '@/components/shared/NearbyStops';
import { MetroIncidents } from '@/components/metro/MetroIncidents';
import { MetroAlertsConfig } from '@/components/metro/MetroAlertsConfig';
import { BottomNav, TransportType } from '@/components/shared/BottomNav';
import { useFavorites } from '@/context/FavoritesContext';
import { useGeolocation } from '@/context/GeolocationContext';
import { useLanguage } from '@/context/LanguageContext';
import { getNearbyStops, getAllBilbobusLines } from '@/app/actions';
import { searchStops } from '@/lib/shared/stopSearch';
import { searchBizkaibusStops, type BizkaibusStopResult } from '@/lib/bizkaibus/search';
import { Heart, Navigation, Loader2, Search, ArrowUpDown, X, Bus, MapPin, Map, AlertTriangle, Plus, Bell } from 'lucide-react';
import { BilbobusLine, BilbobusStop } from '@/lib/bilbobus/api';
import { StopLocation } from '@/types/transport';
import { useLastSearch } from '@/hooks/useLastSearch';
import dynamic from 'next/dynamic';
import FavoriteConfigModal from '@/components/bilbobus/FavoriteConfigModal';

const RenfeSection = dynamic(() => import('@/components/renfe/RenfeSection').then(m => m.RenfeSection), { ssr: false });

export default function HomeClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useLanguage();
    const { favorites, isLoading: favLoading } = useFavorites();
    const { location, requestLocation, isLoading: geoLoading } = useGeolocation();
    const [nearbyStops, setNearbyStops] = useState<StopLocation[]>([]);
    const [isLoadingNearby, setIsLoadingNearby] = useState(false);
    const [activeTab, setActiveTab] = useState<'favorites' | 'nearby'>('favorites');
    const [activeTransport, setActiveTransport] = useState<TransportType>('metro');
    const [showIncidentsModal, setShowIncidentsModal] = useState(false);
    const [showAlertsConfig, setShowAlertsConfig] = useState(false);
    const [showBilbobusFavModal, setShowBilbobusFavModal] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Hooks para guardar las últimas búsquedas
    const { lastSearch: lastMetroSearch, saveSearch: saveMetroSearch } = useLastSearch<{ origin: StopLocation, dest: StopLocation }>('metro');
    const { lastSearch: lastBilbobusSearch, saveSearch: saveBilbobusSearch } = useLastSearch<string>('bilbobus');

    // Handle URL tab parameter to set active transport
    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab && ['metro', 'bilbobus', 'bizkaibus', 'renfe'].includes(tab)) {
            setActiveTransport(tab as TransportType);
        }
    }, [searchParams]);

    // Function to change transport and update URL
    const handleTransportChange = (transport: TransportType) => {
        setActiveTransport(transport);
        router.push(`/?tab=${transport}`);
    };

    // Pre-fill Metro from last search
    useEffect(() => {
        if (lastMetroSearch && activeTransport === 'metro') {
            if (!selectedOrigin && !selectedDest && origin === '' && destination === '') {
                setSelectedOrigin(lastMetroSearch.origin);
                setOrigin(lastMetroSearch.origin.name);
                setSelectedDest(lastMetroSearch.dest);
                setDestination(lastMetroSearch.dest.name);
            }
        }
    }, [lastMetroSearch, activeTransport]);

    // Pre-fill Bilbobus from last search
    useEffect(() => {
        if (lastBilbobusSearch && activeTransport === 'bilbobus' && bilbobusSearch === '') {
            setBilbobusSearch(lastBilbobusSearch);
        }
    }, [lastBilbobusSearch, activeTransport]);

    // Search inputs state
    const [origin, setOrigin] = useState('');
    const [destination, setDestination] = useState('');
    const [originResults, setOriginResults] = useState<StopLocation[]>([]);
    const [destResults, setDestResults] = useState<StopLocation[]>([]);
    const [selectedOrigin, setSelectedOrigin] = useState<StopLocation | null>(null);
    const [selectedDest, setSelectedDest] = useState<StopLocation | null>(null);
    const [showOriginDropdown, setShowOriginDropdown] = useState(false);
    const [showDestDropdown, setShowDestDropdown] = useState(false);

    // Bilbobus state
    const [bilbobusLines, setBilbobusLines] = useState<BilbobusLine[]>([]);
    const [bilbobusSearch, setBilbobusSearch] = useState('');
    const [bilbobusResults, setBilbobusResults] = useState<BilbobusStop[]>([]);

    // Bizkaibus state
    const [bizkaibusSearch, setBizkaibusSearch] = useState('');
    const [bizkaibusResults, setBizkaibusResults] = useState<BizkaibusStopResult[]>([]);
    const [showBizkaibusDropdown, setShowBizkaibusDropdown] = useState(false);

    // Swipe to refresh handler
    const handleRefresh = useCallback(async () => {
        if (isRefreshing) return;
        setIsRefreshing(true);

        // Forzar recarga de favoritos/cercanas
        if (activeTab === 'nearby' && location) {
            setIsLoadingNearby(true);
            try {
                const results = await getNearbyStops(location.lat, location.lon, 2);
                setNearbyStops(results.map(r => ({
                    id: r.id,
                    name: r.name,
                    agency: r.agency || 'metro',
                    lat: r.lat || 0,
                    lon: r.lon || 0
                })));
            } catch (err) {
                console.error('Error refreshing nearby stops:', err);
            } finally {
                setIsLoadingNearby(false);
            }
        }

        setTimeout(() => setIsRefreshing(false), 500);
    }, [isRefreshing, activeTab, location]);

    // Load Bilbobus lines - solo cuando se necesite
    useEffect(() => {
        if (activeTransport === 'bilbobus' && bilbobusLines.length === 0) {
            const loadLines = async () => {
                try {
                    const lines = await getAllBilbobusLines();
                    setBilbobusLines([...lines].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true })));
                } catch (err) {
                    console.error('Error loading Bilbobus lines:', err);
                }
            };
            loadLines();
        }
    }, [activeTransport, bilbobusLines.length]);

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
                        agency: r.agency,
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

    // Buscar origen - solo paradas de metro en búsqueda de metro
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (origin.length >= 1 && !selectedOrigin) {
                const data = await searchStops(origin);
                // Filtrar solo paradas de metro cuando estamos en tab de metro
                const metroOnly = activeTransport === 'metro'
                    ? data.filter(r => r.agency === 'metro')
                    : data;
                setOriginResults(metroOnly.map(r => ({
                    id: r.id,
                    name: r.name,
                    agency: r.agency as any,
                    lat: r.lat || 0,
                    lon: r.lon || 0
                })));
                setShowOriginDropdown(true);
            } else {
                setOriginResults([]);
                setShowOriginDropdown(false);
            }
        }, 300);  // Reducido a 300ms para mejor respuesta
        return () => clearTimeout(delayDebounceFn);
    }, [origin, selectedOrigin, activeTransport]);

    // Buscar destino - solo paradas de metro en búsqueda de metro
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (destination.length >= 1 && !selectedDest) {
                const data = await searchStops(destination);
                // Filtrar solo paradas de metro cuando estamos en tab de metro
                const metroOnly = activeTransport === 'metro'
                    ? data.filter(r => r.agency === 'metro')
                    : data;
                setDestResults(metroOnly.map(r => ({
                    id: r.id,
                    name: r.name,
                    agency: r.agency as any,
                    lat: r.lat || 0,
                    lon: r.lon || 0
                })));
                setShowDestDropdown(true);
            } else {
                setDestResults([]);
                setShowDestDropdown(false);
            }
        }, 500);  // Aumentado a 500ms para reducir requests
        return () => clearTimeout(delayDebounceFn);
    }, [destination, selectedDest, activeTransport]);

    // Buscar paradas de Bilbobus - BÚSQUEDA LOCAL (sin BD)
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (bilbobusSearch.length >= 2 && activeTransport === 'bilbobus') {
                // Búsqueda LOCAL en el JSON
                const { searchBilbobusStops } = require('@/lib/bilbobus/client-search');
                const results = searchBilbobusStops(bilbobusSearch, 15);
                setBilbobusResults(results);
            } else {
                setBilbobusResults([]);
            }
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [bilbobusSearch, activeTransport]);

    // Buscar paradas de Bizkaibus - BÚSQUEDA LOCAL (sin BD)
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (bizkaibusSearch.length >= 2 && activeTransport === 'bizkaibus') {
                // Búsqueda LOCAL en el JSON (no usa BD ni API)
                const results = searchBizkaibusStops(bizkaibusSearch, 15);
                setBizkaibusResults(results);
                setShowBizkaibusDropdown(true);
            } else {
                setBizkaibusResults([]);
                setShowBizkaibusDropdown(false);
            }
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [bizkaibusSearch, activeTransport]);

    // Cargar llegadas cuando se selecciona una parada
    const handleStopSelect = useCallback((stopId: string, agency: string) => {
        if (agency === 'bilbobus' && bilbobusSearch) {
            saveBilbobusSearch(bilbobusSearch);
        }
        // Redirigir a la ruta específica de cada transporte
        if (agency === 'metro') {
            router.push(`/metro/station/${stopId}`);
        } else if (agency === 'bilbobus') {
            router.push(`/bilbobus/stop/${stopId}`);
        } else if (agency === 'bizkaibus') {
            router.push(`/bizkaibus/stop/${stopId}`);
        } else {
            router.push(`/metro/station/${stopId}?agency=${agency}`);
        }
    }, [router, bilbobusSearch, saveBilbobusSearch]);

    const handleSearch = useCallback(() => {
        if (selectedOrigin && selectedDest) {
            // Guardar búsqueda para la próxima vez
            saveMetroSearch({ origin: selectedOrigin, dest: selectedDest });
            router.push(`/metro/route?origin=${selectedOrigin.id}&originAgency=${selectedOrigin.agency}&dest=${selectedDest.id}&destAgency=${selectedDest.agency}`);
        }
    }, [selectedOrigin, selectedDest, router, saveMetroSearch]);

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
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${stop.agency === 'metro' ? 'bg-orange-100' : 'bg-red-100'
                }`}>
                {stop.agency === 'metro' ? (
                    <img src="/logoMetro.svg" alt="Metro Bilbao" className="w-6 h-6 object-contain" />
                ) : (
                    <Bus className="w-4 h-4 text-red-600" />
                )}
            </div>
            <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-slate-900 truncate">{stop.name}</div>
                <div className="text-xs text-slate-500">
                    {stop.agency === 'metro' && 'Metro Bilbao'}
                    {stop.agency === 'bilbobus' && 'Bilbobus'}
                    {stop.agency === 'bizkaibus' && 'Bizkaibus'}
                    {stop.agency === 'renfe' && 'Renfe'}
                </div>
            </div>
        </button>
    );

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

    const renderFavorites = () => {
        const favList = favorites.filter(f => f.agency === activeTransport);

        if (favList.length === 0) {
            return (
                <div className="bg-white rounded-xl p-8 text-center border border-slate-100">
                    <Heart className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-600 font-medium">Sin favoritos</p>
                    <p className="text-sm text-slate-400 mt-1">Busca un trayecto y guarda tus estaciones</p>
                </div>
            );
        }

        // Cuadrícula para Metro, lista para otros
        if (activeTransport === 'metro') {
            return (
                <div className="grid grid-cols-2 gap-2">
                    {favList.map((fav) => (
                        <FavoriteStopCard
                            key={fav.id}
                            stopId={fav.stopId}
                            name={fav.name || fav.stopName || 'Parada sin nombre'}
                            agency={fav.agency}
                            lat={fav.lat}
                            lon={fav.lon}
                            onTap={() => handleStopSelect(fav.stopId, fav.agency)}
                        />
                    ))}
                </div>
            );
        }

        return (
            <div className="space-y-3">
                {favList.map((fav) => (
                    <FavoriteStopCard
                        key={fav.id}
                        stopId={fav.stopId}
                        name={fav.name || fav.stopName || 'Parada sin nombre'}
                        agency={fav.agency}
                        lat={fav.lat}
                        lon={fav.lon}
                        onTap={() => handleStopSelect(fav.stopId, fav.agency)}
                    />
                ))}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Metro Content */}
            {activeTransport === 'metro' && (
                <div className="animate-fadeIn">
                    {/* Orange Background Container with rounded bottom corners */}
                    <div className="relative" style={{ backgroundColor: '#373737', height: '250px', borderBottomLeftRadius: '30px', borderBottomRightRadius: '30px' }}>
                        {/* Header with Logo */}
                        <div className="px-4 sm:px-6 lg:px-8 pt-3">
                            <div className="max-w-lg mx-auto flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <img src="/logoMetro.svg" alt="Metro Bilbao" className="h-10 object-contain" />
                                    <span className="font-extrabold text-white text-lg">Metro Bilbao</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setShowAlertsConfig(true)}
                                        className="p-2 rounded-lg hover:bg-white/20 transition-colors"
                                        aria-label="Configurar alertas"
                                        title="Configurar alertas"
                                    >
                                        <Bell className="w-5 h-5 text-white" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Floating White Search Panel */}
                    <div className="px-4 sm:px-6 lg:px-8 relative" style={{ marginTop: '-150px', zIndex: 10 }}>
                        <div className="max-w-lg mx-auto bg-white rounded-[30px] p-6 shadow-xl">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mr-4">Planifica tu ruta</h2>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => router.push('/metro/map')}
                                        className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center"
                                        aria-label="Ver mapa del metro"
                                        title="Ver mapa del metro"
                                    >
                                        <Map className="w-4 h-4 text-slate-600" />
                                    </button>
                                    <button
                                        onClick={() => setShowIncidentsModal(true)}
                                        className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center"
                                        aria-label="Ver incidencias"
                                        title="Ver incidencias"
                                    >
                                        <AlertTriangle className="w-4 h-4 text-slate-600" />
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-3">
                                {/* Origin */}
                                <div className="relative">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="text"
                                            value={origin}
                                            onChange={(e) => {
                                                setOrigin(e.target.value);
                                                if (selectedOrigin) setSelectedOrigin(null);
                                            }}
                                            onFocus={() => origin.length >= 1 && !selectedOrigin && setShowOriginDropdown(true)}
                                            placeholder={t('whereFrom')}
                                            className="flex-1 py-3 px-5 text-base rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 border border-slate-200 focus:border-[#f14e2d] focus:ring-2 focus:ring-orange-100 outline-none transition-all font-medium"
                                            style={{ fontSize: 16 }}
                                        />
                                        {(origin || selectedOrigin) && (
                                            <button
                                                onClick={() => { setOrigin(''); setSelectedOrigin(null); setShowOriginDropdown(false); }}
                                                className="p-2 rounded-full hover:bg-slate-200 text-slate-400 transition-colors"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>

                                    {showOriginDropdown && originResults.length > 0 && (
                                        <>
                                            {renderDropdownOverlay(() => setShowOriginDropdown(false))}
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-40 max-h-64 overflow-y-auto text-slate-900">
                                                {originResults.map((stop) => renderDropdownItem(stop, 'origin'))}
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Divider with Swap */}
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 h-px bg-slate-200" />
                                    <button
                                        onClick={handleSwap}
                                        disabled={!selectedOrigin && !selectedDest}
                                        className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-30"
                                    >
                                        <ArrowUpDown className="w-4 h-4 text-slate-600" />
                                    </button>
                                    <div className="flex-1 h-px bg-slate-200" />
                                </div>

                                {/* Destination */}
                                <div className="relative">
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="text"
                                            value={destination}
                                            onChange={(e) => {
                                                setDestination(e.target.value);
                                                if (selectedDest) setSelectedDest(null);
                                            }}
                                            onFocus={() => destination.length >= 1 && !selectedDest && setShowDestDropdown(true)}
                                            placeholder={t('whereTo')}
                                            className="flex-1 py-3 px-5 text-base rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 border border-slate-200 focus:border-[#f14e2d] focus:ring-2 focus:ring-orange-100 outline-none transition-all font-medium"
                                            style={{ fontSize: 16 }}
                                        />
                                        {(destination || selectedDest) && (
                                            <button
                                                onClick={() => { setDestination(''); setSelectedDest(null); setShowDestDropdown(false); }}
                                                className="p-2 rounded-full hover:bg-slate-200 text-slate-400 transition-colors"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>

                                    {showDestDropdown && destResults.length > 0 && (
                                        <>
                                            {renderDropdownOverlay(() => setShowDestDropdown(false))}
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-40 max-h-64 overflow-y-auto text-slate-900">
                                                {destResults.map((stop) => renderDropdownItem(stop, 'dest'))}
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Search Button */}
                                <button
                                    onClick={handleSearch}
                                    disabled={!selectedOrigin || !selectedDest}
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl hover:bg-orange-600 disabled:bg-slate-200 text-white font-semibold text-base transition-all active:scale-[0.98] disabled:cursor-not-allowed shadow-sm"
                                    style={{ backgroundColor: '#f14e2d' }}
                                >
                                    <Search className="w-4 h-4" />
                                    {t('searchRoute')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bilbobus Content */}
            {activeTransport === 'bilbobus' && (
                <div className="animate-fadeIn">
                    {/* Red Background Container with rounded bottom corners */}
                    <div className="relative" style={{ backgroundColor: '#dc2626', height: '200px', borderBottomLeftRadius: '30px', borderBottomRightRadius: '30px' }}>
                        {/* Header with Logo */}
                        <div className="px-4 sm:px-6 lg:px-8 pt-3">
                            <div className="max-w-lg mx-auto flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                                        <Bus className="w-6 h-6 text-white" />
                                    </div>
                                    <span className="font-extrabold text-white text-lg">Bilbobus</span>
                                </div>
                                <button
                                    onClick={() => router.push('/bilbobus/lineas')}
                                    className="p-2 rounded-lg hover:bg-white/20 transition-colors"
                                    aria-label="Ver todas las líneas"
                                >
                                    <Bus className="w-5 h-5 text-white mr-2" />
                                    <span className="font-semibold text-white">Líneas</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Floating White Search Panel */}
                    <div className="px-4 sm:px-6 lg:px-8 relative" style={{ marginTop: '-125px', zIndex: 10 }}>
                        <div className="max-w-lg mx-auto bg-white rounded-[30px] p-6 shadow-xl">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Buscar parada o línea</h2>
                            </div>

                            {/* Search Input */}
                            <div className="relative mb-4">
                                <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3 border border-slate-200 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-100 transition-all">
                                    <Search className="w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        value={bilbobusSearch}
                                        onChange={(e) => setBilbobusSearch(e.target.value)}
                                        placeholder="Nombre de parada, línea..."
                                        className="flex-1 text-base text-slate-900 bg-transparent border-none focus:outline-none placeholder:text-slate-400 font-medium"
                                        style={{ fontSize: 16 }}
                                    />
                                    {bilbobusSearch && (
                                        <button onClick={() => setBilbobusSearch('')} className="text-slate-400 hover:text-slate-600">
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                {/* Results Dropdown */}
                                {bilbobusSearch.length >= 2 && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-40 max-h-80 overflow-y-auto">
                                        {bilbobusResults.length > 0 ? (
                                            bilbobusResults.map((stop) => (
                                                <button
                                                    key={stop.id}
                                                    onClick={() => handleStopSelect(stop.id, 'bilbobus')}
                                                    className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-center gap-3 border-b border-slate-100 last:border-0"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                                                        <MapPin className="w-4 h-4 text-red-600" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="text-sm font-medium text-slate-900 truncate">{stop.name}</div>
                                                        <div className="text-xs text-slate-500">Parada {stop.id}</div>
                                                    </div>
                                                </button>
                                            ))
                                        ) : (
                                            <div className="p-4 text-center text-slate-500 text-sm italic">
                                                No se encontraron paradas
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Search Button */}
                            <button
                                onClick={() => bilbobusSearch.length >= 2 && bilbobusResults.length > 0 && handleStopSelect(bilbobusResults[0].id, 'bilbobus')}
                                disabled={bilbobusSearch.length < 2 || bilbobusResults.length === 0}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-slate-200 text-white font-semibold text-base transition-all active:scale-[0.98] disabled:cursor-not-allowed shadow-sm"
                            >
                                Buscar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Common Tabs Section - Solo para Metro y Bilbobus */}
            {(activeTransport === 'metro' || activeTransport === 'bilbobus') && (
                <main className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
                    {isRefreshing && (
                        <div className="flex justify-center py-2 animate-fadeIn">
                            <Loader2 className="w-5 h-5 animate-spin text-[#f14e2d]" />
                        </div>
                    )}

                    {/* Metro: Solo mostrar Favoritos */}
                    {activeTransport === 'metro' && (
                        <>
                            {/* Section Title */}
                            <div className="mt-0.5 mb-2">
                                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Favoritos</h3>
                            </div>

                            {/* Tab Content */}
                            <div className="animate-fadeIn">
                                {favLoading ? (
                                    <div className="py-8 text-center">
                                        <Loader2 className="w-5 h-5 animate-spin text-slate-300 mx-auto" />
                                    </div>
                                ) : (
                                    renderFavorites()
                                )}
                            </div>
                        </>
                    )}

                    {/* Bilbobus: Mostrar Favoritos y Cercanas con tabs */}
                    {activeTransport === 'bilbobus' && (
                        <>
                            {/* Section Title with Add Button */}
                            <div className="mt-1 mb-2 flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Favoritos</h3>
                                <button
                                    onClick={() => setShowBilbobusFavModal(true)}
                                    className="flex items-center gap-1 px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    Añadir
                                </button>
                            </div>

                            {/* Quick Tabs */}
                            <div className="flex gap-2">
                                {[
                                    { id: 'favorites', icon: Heart, label: t('favorites'), count: favorites.filter(f => f.agency === activeTransport).length },
                                    { id: 'nearby', icon: Navigation, label: t('nearby') },
                                ].map((tab) => {
                                    const Icon = tab.icon;
                                    const isActive = activeTab === tab.id;
                                    let activeColor = 'bg-red-600';
                                    let badgeColor = 'bg-red-100 text-red-600';

                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id as typeof activeTab)}
                                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive
                                                ? `${activeColor} text-white shadow-sm`
                                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                                }`}
                                        >
                                            <Icon className={`w-4 h-4 ${isActive && tab.id === 'favorites' ? 'fill-current' : ''}`} />
                                            <span>{tab.label}</span>
                                            {tab.count !== undefined && tab.count > 0 && (
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${isActive ? 'bg-white/20 text-white' : badgeColor
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
                        </>
                    )}

                </main>
            )}

            {/* Bizkaibus Content */}
            {activeTransport === 'bizkaibus' && (
                <div className="animate-fadeIn">
                    {/* Green Background Container with rounded bottom corners */}
                    <div className="relative" style={{ backgroundColor: '#22533d', height: '200px', borderBottomLeftRadius: '30px', borderBottomRightRadius: '30px' }}>
                        {/* Header with Logo */}
                        <div className="px-4 sm:px-6 lg:px-8 pt-3">
                            <div className="max-w-lg mx-auto flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <img
                                        src="/logoBizkaibus.png"
                                        alt="Bizkaibus"
                                        className="h-10 object-contain rounded-xl bg-white/20"
                                        onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                        }}
                                    />
                                    <span className="font-extrabold text-white text-lg">Bizkaibus</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Floating White Search Panel */}
                    <div className="px-4 sm:px-6 lg:px-8 relative" style={{ marginTop: '-125px', zIndex: 10 }}>
                        <div className="max-w-lg mx-auto bg-white rounded-[30px] p-6 shadow-xl">
                            <h2 className="text-sm font-bold text-green-800 uppercase tracking-wide mb-4">BUSCAR PARADA</h2>

                            <div className="relative">
                                <input
                                    type="text"
                                    value={bizkaibusSearch}
                                    onChange={(e) => setBizkaibusSearch(e.target.value)}
                                    onFocus={() => bizkaibusSearch.length >= 2 && bizkaibusResults.length > 0 && setShowBizkaibusDropdown(true)}
                                    placeholder="Nombre o número de parada..."
                                    className="w-full py-4 px-5 text-base rounded-[25px] bg-slate-100 text-slate-900 placeholder-slate-400 border-0 focus:ring-2 focus:ring-[#a5ca71] outline-none transition-all font-medium mb-4"
                                    style={{ fontSize: 16 }}
                                />

                                {/* Search Button */}
                                <button
                                    onClick={() => {
                                        if (bizkaibusSearch.length >= 2 && bizkaibusResults.length > 0) {
                                            handleStopSelect(bizkaibusResults[0].id, 'bizkaibus');
                                        }
                                    }}
                                    className="w-full py-4 px-6 rounded-xl font-semibold text-white transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
                                    style={{ backgroundColor: '#22533d' }}
                                >
                                    Buscar parada
                                </button>

                                {bizkaibusSearch && (
                                    <button
                                        onClick={() => {
                                            setBizkaibusSearch('');
                                            setBizkaibusResults([]);
                                            setShowBizkaibusDropdown(false);
                                        }}
                                        className="absolute right-4 top-4 p-1 rounded-full hover:bg-slate-200 transition-colors"
                                    >
                                        <X className="w-5 h-5 text-slate-400" />
                                    </button>
                                )}

                                {/* Results Dropdown */}
                                {showBizkaibusDropdown && bizkaibusResults.length > 0 && (
                                    <>
                                        {renderDropdownOverlay(() => setShowBizkaibusDropdown(false))}
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-[25px] shadow-lg border border-slate-200 max-h-80 overflow-y-auto z-40 animate-slideUp">
                                            {bizkaibusResults.map((stop) => (
                                                <button
                                                    key={`${stop.id}-${stop.agency}`}
                                                    onClick={() => {
                                                        setBizkaibusSearch(stop.name);
                                                        setShowBizkaibusDropdown(false);
                                                    }}
                                                    className="w-full text-left px-4 py-3 flex items-center gap-3 border-b border-slate-100 last:border-b-0 first:rounded-t-[25px] last:rounded-b-[25px] hover:bg-green-50 transition-colors"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                                                        <Bus className="w-4 h-4 text-green-600" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="text-sm font-medium text-slate-900 truncate">{stop.name}</div>
                                                        <div className="text-xs text-slate-500">Bizkaibus · ID: {stop.id}</div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}

                                {/* No results */}
                                {showBizkaibusDropdown && bizkaibusSearch.length >= 2 && bizkaibusResults.length === 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-[25px] shadow-lg border border-slate-200 p-4 z-40 animate-slideUp">
                                        <p className="text-sm text-slate-500 text-center">No se encontraron paradas</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Tabs de favoritos y cercanos (debajo de la búsqueda) */}
                    <main className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-4">
                        {isRefreshing && (
                            <div className="flex justify-center py-2 animate-fadeIn">
                                <Loader2 className="w-5 h-5 animate-spin text-green-600" />
                            </div>
                        )}

                        {/* Section Title */}
                        <div className="mt-1 mb-2">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">MIS PARADAS</h3>
                        </div>

                        {/* Quick Tabs */}
                        <div className="flex gap-2">
                            {[
                                { id: 'favorites', icon: Heart, label: t('favorites'), count: favorites.filter(f => f.agency === activeTransport).length },
                                { id: 'nearby', icon: Navigation, label: t('nearby') },
                            ].map((tab) => {
                                const Icon = tab.icon;
                                const isActive = activeTab === tab.id;

                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as typeof activeTab)}
                                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isActive
                                            ? 'bg-green-600 text-white shadow-sm'
                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                            }`}
                                    >
                                        <Icon className={`w-4 h-4 ${isActive && tab.id === 'favorites' ? 'fill-current' : ''}`} />
                                        <span>{tab.label}</span>
                                        {tab.count !== undefined && tab.count > 0 && (
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-green-100 text-green-600'
                                                }`}>
                                                {tab.count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Tab Content */}
                        {activeTab === 'favorites' && (() => {
                            let content;
                            if (favLoading) {
                                content = (
                                    <div className="py-12 text-center">
                                        <Loader2 className="w-6 h-6 animate-spin text-green-600 mx-auto mb-2" />
                                        <p className="text-sm text-slate-500">Cargando favoritos...</p>
                                    </div>
                                );
                            } else if (favorites.filter((f) => f.agency === 'bizkaibus').length === 0) {
                                content = (
                                    <div className="text-center py-12">
                                        <Heart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                        <p className="text-slate-500 text-sm">{t('noFavorites')}</p>
                                        <p className="text-slate-400 text-xs mt-1">Busca una parada y márcala como favorita</p>
                                    </div>
                                );
                            } else {
                                content = favorites
                                    .filter((f) => f.agency === 'bizkaibus')
                                    .map((fav) => (
                                        <FavoriteStopCard
                                            key={`${fav.agency}-${fav.stopId}`}
                                            stopId={fav.stopId}
                                            name={fav.name || fav.stopName || 'Parada sin nombre'}
                                            agency={fav.agency}
                                            lat={fav.lat}
                                            lon={fav.lon}
                                            onTap={() => handleStopSelect(fav.stopId, fav.agency)}
                                        />
                                    ));
                            }
                            return <div className="space-y-3 animate-fadeIn">{content}</div>;
                        })()}

                        {activeTab === 'nearby' && (
                            <NearbyStops
                                stops={nearbyStops.filter(s => s.agency === 'bizkaibus')}
                                onSelectStop={handleStopSelect}
                                isLoading={isLoadingNearby}
                            />
                        )}
                    </main>
                </div>
            )}

            {/* Renfe */}
            {activeTransport === 'renfe' && (
                <div className="flex-1 flex flex-col">
                    {/* Use RenfeSection component */}
                    <div className="max-w-3xl w-full mx-auto">
                        <RenfeSection />
                    </div>
                </div>
            )}

            {/* Bottom Navigation */}
            <BottomNav
                activeTransport={activeTransport}
                onTransportChange={handleTransportChange}
            />

            {/* Incidents Modal */}
            {showIncidentsModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => setShowIncidentsModal(false)}
                    />
                    <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden animate-slideUp">
                        <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-900">Avisos Metro Bilbao</h2>
                            <button
                                onClick={() => setShowIncidentsModal(false)}
                                className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto max-h-[calc(80vh-60px)]">
                            <MetroIncidents isEmbedded />
                        </div>
                    </div>
                </div>
            )}

            {/* Metro Alerts Configuration Modal */}
            <MetroAlertsConfig
                isOpen={showAlertsConfig}
                onClose={() => setShowAlertsConfig(false)}
            />

            {/* Bilbobus Favorites Modal */}
            <FavoriteConfigModal
                isOpen={showBilbobusFavModal}
                onClose={() => setShowBilbobusFavModal(false)}
            />
        </div>
    );
}
