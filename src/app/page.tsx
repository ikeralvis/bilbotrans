'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FavoriteStopCard } from '@/components/FavoriteStopCard';
import { NearbyStops } from '@/components/NearbyStops';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { MetroIncidents } from '@/components/MetroIncidents';
import { BottomNav, TransportType } from '@/components/BottomNav';
import { useFavorites } from '@/context/FavoritesContext';
import { useGeolocation } from '@/context/GeolocationContext';
import { useLanguage } from '@/context/LanguageContext';
import { getNearbyStops, searchBilbobusStops, getAllBilbobusLines } from '@/app/actions';
import { searchStops } from '@/lib/shared/stopSearch';
import { Heart, Navigation, Loader2, Search, ArrowUpDown, X, Bus, Construction, MapPin, List } from 'lucide-react';
import { BilbobusLine, BilbobusStop } from '@/lib/bilbobus/api';
import { StopLocation } from '@/types/transport';
import { useLastSearch } from '@/hooks/useLastSearch';
import dynamic from 'next/dynamic';

const RenfeSection = dynamic(() => import('@/components/RenfeSection').then(m => m.RenfeSection), { ssr: false });


// Local StopLocation interface removed in favor of shared type

export default function Home() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useLanguage();
    const { favorites, isLoading: favLoading } = useFavorites();
    const { location, requestLocation, isLoading: geoLoading } = useGeolocation();
    const [nearbyStops, setNearbyStops] = useState<StopLocation[]>([]);
    const [isLoadingNearby, setIsLoadingNearby] = useState(false);
    const [activeTab, setActiveTab] = useState<'favorites' | 'nearby'>('favorites');
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

    // Bilbobus state
    const [bilbobusLines, setBilbobusLines] = useState<BilbobusLine[]>([]);
    const [bilbobusSearch, setBilbobusSearch] = useState('');
    const [bilbobusResults, setBilbobusResults] = useState<BilbobusStop[]>([]);

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
    }, [lastMetroSearch, activeTransport, selectedOrigin, selectedDest, origin, destination]);

    // Pre-fill Bilbobus from last search
    useEffect(() => {
        if (lastBilbobusSearch && activeTransport === 'bilbobus' && bilbobusSearch === '') {
            setBilbobusSearch(lastBilbobusSearch);
        }
    }, [lastBilbobusSearch, activeTransport, bilbobusSearch]);

    // Load Bilbobus lines
    useEffect(() => {
        const loadLines = async () => {
            try {
                const lines = await getAllBilbobusLines();
                setBilbobusLines([...lines].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true })));
            } catch (err) {
                console.error('Error loading Bilbobus lines:', err);
            }
        };
        loadLines();
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
            if (origin.length >= 2 && !selectedOrigin) {
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
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [origin, selectedOrigin, activeTransport]);

    // Buscar destino - solo paradas de metro en búsqueda de metro
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (destination.length >= 2 && !selectedDest) {
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
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [destination, selectedDest, activeTransport]);

    // Buscar paradas Bilbobus
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (bilbobusSearch.length >= 2) {
                const data = await searchBilbobusStops(bilbobusSearch);
                setBilbobusResults(data);
            } else {
                setBilbobusResults([]);
            }
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [bilbobusSearch]);

    // Cargar llegadas de Bizkaibus cuando se selecciona una parada
    const handleStopSelect = useCallback((stopId: string, agency: string) => {
        if (agency === 'bilbobus' && bilbobusSearch) {
            saveBilbobusSearch(bilbobusSearch);
        }
        router.push(`/station/${stopId}?agency=${agency}`);
    }, [router, bilbobusSearch, saveBilbobusSearch]);

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
    }, [lastMetroSearch, activeTransport, selectedOrigin, selectedDest, origin, destination]);

    const handleSearch = useCallback(() => {
        if (selectedOrigin && selectedDest) {
            // Guardar búsqueda para la próxima vez
            saveMetroSearch({ origin: selectedOrigin, dest: selectedDest });
            router.push(`/route?origin=${selectedOrigin.id}&originAgency=${selectedOrigin.agency}&dest=${selectedDest.id}&destAgency=${selectedDest.agency}`);
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
        return favorites
            .filter(f => f.agency === activeTransport)
            .map((fav) => (
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
            {/* Header - Minimalista sin margin */}
            <header className="bg-white border-b border-slate-100 sticky top-0 z-40">
                <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center">
                            <img src="/logo.png" alt="BilboTrans" className="w-7 h-7 object-contain" />
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
                <div className="animate-fadeIn px-4 sm:px-6 lg:px-8">
                    {/* Search Card - Minimalista estilo Apple con borde naranja */}
                    <div className="bg-white text-slate-900 rounded-3xl shadow-sm mb-6 border-2 mt-2 border-orange-500">
                        <div className="max-w-lg mx-auto p-6">
                            <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-4">Planifica tu ruta</h2>
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
                                            onFocus={() => origin.length >= 2 && !selectedOrigin && setShowOriginDropdown(true)}
                                            placeholder={t('whereFrom')}
                                            className="flex-1 py-3 px-5 text-base rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all font-medium"
                                            style={{ fontSize: 16 }}
                                        />
                                        {selectedOrigin && (
                                            <button
                                                onClick={() => { setOrigin(''); setSelectedOrigin(null); }}
                                                className="p-1 rounded-full hover:bg-slate-200 text-slate-400 transition-colors"
                                            >
                                                <X className="w-4 h-4" />
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
                                            onFocus={() => destination.length >= 2 && !selectedDest && setShowDestDropdown(true)}
                                            placeholder={t('whereTo')}
                                            className="flex-1 py-3 px-5 text-base rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all font-medium"
                                            style={{ fontSize: 16 }}
                                        />
                                        {selectedDest && (
                                            <button
                                                onClick={() => { setDestination(''); setSelectedDest(null); }}
                                                className="p-1 rounded-full hover:bg-slate-200 text-slate-400 transition-colors"
                                            >
                                                <X className="w-4 h-4" />
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
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 text-white disabled:text-slate-400 font-semibold text-base transition-all active:scale-[0.98] disabled:cursor-not-allowed shadow-sm"
                                >
                                    <Search className="w-4 h-4" />
                                    {t('searchRoute')}
                                </button>

                                {/* Metro Map Button */}
                                <button
                                    onClick={() => router.push('/metro-map')}
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold text-base transition-all active:scale-[0.98] shadow-sm"
                                >
                                    <MapPin className="w-4 h-4" />
                                    Ver mapa del metro
                                </button>

                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bilbobus Content */}
            {activeTransport === 'bilbobus' && (
                <div className="animate-fadeIn">
                    <div className="bg-red-600 text-white px-4 sm:px-6 lg:px-8 py-6 shadow-md">
                        <div className="max-w-lg mx-auto">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                                    <Bus className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">Bilbobus</h2>
                                    <p className="text-red-100 text-sm">Autobuses de Bilbao</p>
                                </div>
                            </div>

                            {/* Search Input */}
                            <div className="relative">
                                <div className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-1 border border-white/20 focus-within:bg-white/20 transition-all">
                                    <Search className="w-4 h-4 text-red-100" />
                                    <input
                                        type="text"
                                        value={bilbobusSearch}
                                        onChange={(e) => setBilbobusSearch(e.target.value)}
                                        placeholder="Busca una parada o línea..."
                                        className="flex-1 py-2 text-sm text-white bg-transparent border-none focus:outline-none placeholder:text-red-100/50"
                                        style={{ fontSize: 16 }}
                                    />
                                    {bilbobusSearch && (
                                        <button onClick={() => setBilbobusSearch('')} className="text-red-100">
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

                            {/* Line List Quick Links */}
                            <div className="mt-4 overflow-x-auto pb-2 scrollbar-hide">
                                <div className="flex gap-2">
                                    {bilbobusLines.slice(0, 10).map(line => (
                                        <button
                                            key={line.id}
                                            onClick={() => router.push(`/lines/bilbobus/${line.id}`)}
                                            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors shrink-0 flex items-center gap-1.5 border border-white/5"
                                        >
                                            <span className="w-5 h-5 rounded bg-white text-red-600 flex items-center justify-center text-[10px]">
                                                {line.id}
                                            </span>
                                            {line.id}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => router.push('/lines/bilbobus')}
                                        className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors shrink-0 flex items-center gap-1"
                                    >
                                        <List className="w-3 h-3" /> Ver todas
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Common Tabs Section */}
            {(activeTransport === 'metro' || activeTransport === 'bilbobus') && (
                <main className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
                    {activeTransport === 'metro' && <MetroIncidents />}

                    {/* Section Title */}
                    <div className="mt-2 mb-3">
                        <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Mis estaciones</h3>
                    </div>

                    {/* Quick Tabs */}
                    <div className="flex gap-2">
                        {[
                            { id: 'favorites', icon: Heart, label: t('favorites'), count: favorites.filter(f => f.agency === activeTransport).length },
                            { id: 'nearby', icon: Navigation, label: t('nearby') },
                        ].map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            const isMetro = activeTransport === 'metro';
                            const activeColor = isMetro ? 'bg-orange-500' : 'bg-red-600';
                            const badgeColor = isMetro ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600';

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

                </main>
            )}

            {/* Bizkaibus - Functional */}
            {activeTransport === 'bizkaibus' && (
                <div className="flex-1 flex flex-col">
                    <div className="bg-linear-to-r from-green-500 to-emerald-600 text-white px-4 sm:px-6 lg:px-8 py-6">
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
                onTransportChange={setActiveTransport}
            />
        </div>
    );
}
