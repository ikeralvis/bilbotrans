'use client';

import { ArrowLeft, Bus, MapPin, Loader2, Heart, ArrowRight, ArrowRightLeft, ChevronDown } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { useFavorites } from '@/context/FavoritesContext';
import { 
    getBilbobusLineById, 
    getBilbobusVariantStops,
    getBilbobusLineVariants
} from '@/lib/bilbobus/client-search';
import { BilbobusLine, BilbobusStop, RouteVariant } from '@/lib/bilbobus/api';

export default function BilbobusLinePage() {
    const router = useRouter();
    const params = useParams();
    const lineId = params.id as string;
    const { favorites, addFavorite, removeFavorite } = useFavorites();

    const [line, setLine] = useState<BilbobusLine | null>(null);
    const [variants, setVariants] = useState<RouteVariant[]>([]);
    const [selectedVariant, setSelectedVariant] = useState<RouteVariant | null>(null);
    const [stops, setStops] = useState<BilbobusStop[]>([]);
    const [loading, setLoading] = useState(true);
    const [showVariantSelector, setShowVariantSelector] = useState(false);

    const lineFavorite = favorites.find(
        fav => fav.stopId === lineId && fav.agency === 'bilbobus' && !fav.lineId
    );
    const isFavorite = !!lineFavorite;

    // Group variants by direction
    const variantsByDirection = useMemo(() => {
        const ida = variants.filter(v => v.direction === 'IDA');
        const vuelta = variants.filter(v => v.direction === 'VUELTA');
        const other = variants.filter(v => v.direction === 'OTHER');
        return { ida, vuelta, other };
    }, [variants]);

    useEffect(() => {
        const loadLine = async () => {
            try {
                const lineData = getBilbobusLineById(lineId);
                if (!lineData) {
                    setLine(null);
                } else {
                    setLine(lineData);
                    const lineVariants = getBilbobusLineVariants(lineId);
                    setVariants(lineVariants);
                    
                    // Select first IDA variant by default, or first available
                    const defaultVariant = lineVariants.find(v => v.direction === 'IDA') || lineVariants[0];
                    if (defaultVariant) {
                        setSelectedVariant(defaultVariant);
                        const stopsData = getBilbobusVariantStops(lineId, defaultVariant.id);
                        setStops(stopsData);
                    }
                }
            } catch (error) {
                console.error('Error loading line:', error);
                setLine(null);
            } finally {
                setLoading(false);
            }
        };

        loadLine();
    }, [lineId]);

    const handleVariantChange = (variant: RouteVariant) => {
        setSelectedVariant(variant);
        const stopsData = getBilbobusVariantStops(lineId, variant.id);
        setStops(stopsData);
        setShowVariantSelector(false);
    };

    const handleToggleFavorite = async () => {
        if (isFavorite && lineFavorite) {
            await removeFavorite(lineFavorite.id);
        } else {
            await addFavorite({
                stopId: lineId,
                name: line?.name || `Línea ${lineId}`,
                agency: 'bilbobus'
            });
        }
    };

    // Quick switch between IDA and VUELTA
    const handleQuickSwitch = () => {
        if (!selectedVariant) return;
        
        const targetDirection = selectedVariant.direction === 'IDA' ? 'VUELTA' : 'IDA';
        const targetVariants = targetDirection === 'IDA' ? variantsByDirection.ida : variantsByDirection.vuelta;
        
        if (targetVariants.length > 0) {
            handleVariantChange(targetVariants[0]);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-red-600" />
            </div>
        );
    }

    if (!line) {
        return (
            <div className="min-h-screen bg-slate-50 p-4">
                <div className="max-w-lg mx-auto">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-red-600 hover:text-red-700 mb-8 pt-4"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Atrás
                    </button>
                    <div className="text-center py-16">
                        <Bus className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                        <p className="text-slate-500 font-medium">Línea no encontrada</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-24">
            {/* Header */}
            <div className="bg-white border-b border-slate-100 sticky top-0 z-40">
                <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-red-600 hover:text-red-700"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex-1 text-center">
                        <p className="text-sm text-slate-500">Línea Bilbobus</p>
                        <h1 className="font-bold text-slate-900">{lineId}</h1>
                    </div>
                    <button
                        onClick={handleToggleFavorite}
                        className={`p-2 rounded-lg transition-colors ${
                            isFavorite
                                ? 'bg-red-100 text-red-600'
                                : 'bg-slate-100 text-slate-400'
                        }`}
                    >
                        <Heart className="w-5 h-5" fill={isFavorite ? 'currentColor' : 'none'} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
                {/* Line Info Card */}
                <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-2xl p-6 text-white">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                            <p className="text-red-100 text-sm">Línea</p>
                            <h2 className="text-4xl font-bold">{lineId}</h2>
                        </div>
                        <Bus className="w-12 h-12 text-white/50" />
                    </div>
                    
                    {/* Route Name */}
                    {selectedVariant && (
                        <div className="bg-white/10 rounded-xl p-3 mb-3">
                            <p className="text-sm text-red-100 mb-1">Recorrido</p>
                            <p className="font-medium text-white">
                                {selectedVariant.name.split(' - ')[0]}
                            </p>
                        </div>
                    )}
                    
                    <p className="text-red-100 text-sm">
                        {stops.length} parada{stops.length === 1 ? '' : 's'} • {variants.length} variante{variants.length === 1 ? '' : 's'}
                    </p>
                </div>

                {/* Direction Selector */}
                <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-slate-900">Dirección</h3>
                        {(variantsByDirection.ida.length > 0 && variantsByDirection.vuelta.length > 0) && (
                            <button
                                onClick={handleQuickSwitch}
                                className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700 font-medium"
                            >
                                <ArrowRightLeft className="w-4 h-4" />
                                Cambiar
                            </button>
                        )}
                    </div>
                    
                    {/* Quick Direction Buttons */}
                    <div className="flex gap-2 mb-3">
                        {variantsByDirection.ida.length > 0 && (
                            <button
                                onClick={() => handleVariantChange(variantsByDirection.ida[0])}
                                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                                    selectedVariant?.direction === 'IDA'
                                        ? 'bg-red-600 text-white'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <ArrowRight className="w-4 h-4" />
                                    IDA
                                </div>
                            </button>
                        )}
                        {variantsByDirection.vuelta.length > 0 && (
                            <button
                                onClick={() => handleVariantChange(variantsByDirection.vuelta[0])}
                                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                                    selectedVariant?.direction === 'VUELTA'
                                        ? 'bg-red-600 text-white'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <ArrowLeft className="w-4 h-4" />
                                    VUELTA
                                </div>
                            </button>
                        )}
                    </div>

                    {/* Variant Selector (for lines with multiple variants per direction) */}
                    {variants.length > 2 && (
                        <div className="relative">
                            <button
                                onClick={() => setShowVariantSelector(!showVariantSelector)}
                                className="w-full flex items-center justify-between p-3 bg-slate-50 rounded-xl text-left hover:bg-slate-100 transition-colors"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-slate-500 mb-0.5">Variante seleccionada</p>
                                    <p className="text-sm font-medium text-slate-900 truncate">
                                        {selectedVariant?.id}
                                    </p>
                                </div>
                                <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${showVariantSelector ? 'rotate-180' : ''}`} />
                            </button>
                            
                            {showVariantSelector && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg z-10 max-h-64 overflow-y-auto">
                                    {variants.map(variant => (
                                        <button
                                            key={variant.id}
                                            onClick={() => handleVariantChange(variant)}
                                            className={`w-full text-left p-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 ${
                                                selectedVariant?.id === variant.id ? 'bg-red-50' : ''
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                    variant.direction === 'IDA' 
                                                        ? 'bg-green-100 text-green-700' 
                                                        : variant.direction === 'VUELTA'
                                                            ? 'bg-blue-100 text-blue-700'
                                                            : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                    {variant.direction}
                                                </span>
                                                <span className="font-medium text-slate-900">{variant.id}</span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1 truncate">
                                                {variant.name.split(' - ').slice(1).join(' - ')}
                                            </p>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                {variant.stops.length} paradas
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Stops List */}
                <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-4">
                        Paradas ({stops.length})
                    </h3>
                    <div className="space-y-2">
                        {stops.map((stop, index) => (
                            <button
                                key={stop.id}
                                onClick={() => router.push(`/bilbobus/stop/${stop.id}`)}
                                className="w-full text-left bg-white rounded-lg p-4 border border-slate-100 hover:border-red-300 hover:shadow-md transition-all active:scale-[0.98]"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                                        {index + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-slate-900 truncate">
                                            {stop.name}
                                        </h4>
                                        <p className="text-sm text-slate-500 mt-1">
                                            ID: {stop.id}
                                        </p>
                                    </div>
                                    <MapPin className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                                </div>
                            </button>
                        ))}
                        
                        {stops.length === 0 && (
                            <div className="text-center py-8">
                                <MapPin className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                <p className="text-slate-500">No hay paradas para esta variante</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
