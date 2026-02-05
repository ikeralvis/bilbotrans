'use client';

import { X, Bus, Train, TramFront } from 'lucide-react';
import { TransportType } from '@/components/shared/BottomNav';

interface TransportSelectorModalProps {
    readonly isOpen: boolean;
    readonly onClose: () => void;
    readonly onSelectTransport: (transport: TransportType) => void;
    readonly activeTransport: TransportType;
}

const transports: Array<{
    id: TransportType;
    name: string;
    icon: React.ReactNode;
    color: string;
    bgColor: string;
    logo?: string;
}> = [
    {
        id: 'metro',
        name: 'Metro Bilbao',
        icon: <TramFront className="w-8 h-8" />,
        color: '#f14e2d',
        bgColor: '#373737',
        logo: '/logoMetro.svg'
    },
    {
        id: 'bilbobus',
        name: 'Bilbobus',
        icon: <Bus className="w-8 h-8" />,
        color: '#dc2626',
        bgColor: '#dc2626',
    },
    {
        id: 'bizkaibus',
        name: 'Bizkaibus',
        icon: <Bus className="w-8 h-8" />,
        color: '#22533d',
        bgColor: '#22533d',
        logo: '/logoBizkaibus.png'
    },
    {
        id: 'renfe',
        name: 'Renfe',
        icon: <Train className="w-8 h-8" />,
        color: '#7c3aed',
        bgColor: '#7c3aed',
        logo: '/Cercanias_Logo.svg.png'
    }
];

export function TransportSelectorModal({
    isOpen,
    onClose,
    onSelectTransport,
    activeTransport
}: TransportSelectorModalProps) {
    if (!isOpen) return null;

    const handleSelectTransport = (transport: TransportType) => {
        onSelectTransport(transport);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <button
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
                aria-label="Cerrar modal"
            />

            {/* Modal */}
            <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full animate-slideUp">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-900">Elige tu transporte</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                        aria-label="Cerrar"
                    >
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Transport Options */}
                <div className="grid grid-cols-2 gap-3 p-6">
                    {transports.map((transport) => {
                        const isActive = activeTransport === transport.id;
                        return (
                            <button
                                key={transport.id}
                                onClick={() => handleSelectTransport(transport.id)}
                                className={`relative overflow-hidden rounded-2xl p-4 transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                                    isActive
                                        ? 'ring-2 ring-offset-2 ring-slate-900 shadow-lg'
                                        : 'hover:shadow-md'
                                }`}
                                style={{ backgroundColor: transport.bgColor }}
                            >
                                {/* Background gradient overlay */}
                                <div className="absolute inset-0 bg-linear-to-br from-white/0 to-black/10" />

                                {/* Content */}
                                <div className="relative flex flex-col items-center gap-3">
                                    {/* Logo or Icon */}
                                    {transport.logo ? (
                                        <img
                                            src={transport.logo}
                                            alt={transport.name}
                                            className="h-12 object-contain rounded-lg bg-white/20 p-2"
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                            }}
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center text-white">
                                            {transport.icon}
                                        </div>
                                    )}

                                    {/* Name */}
                                    <span className="text-sm font-bold text-white text-center leading-tight">
                                        {transport.name}
                                    </span>

                                    {/* Active indicator */}
                                    {isActive && (
                                        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white" />
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 text-center text-xs text-slate-500">
                    Cambia entre transportes en cualquier momento
                </div>
            </div>
        </div>
    );
}
