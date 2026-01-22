'use client';

// Navigation hooks reserved for future use
import { Train, Bus, TrainFront } from 'lucide-react';

type TransportType = 'metro' | 'bilbobus' | 'bizkaibus' | 'renfe';

interface NavItem {
    id: TransportType;
    label: string;
    icon: React.ElementType;
    color: string;
    bgColor: string;
    available: boolean;
}

const navItems: NavItem[] = [
    {
        id: 'metro',
        label: 'Metro',
        icon: Train,
        color: 'text-orange-600',
        bgColor: 'bg-orange-100',
        available: true
    },
    {
        id: 'bizkaibus',
        label: 'Bizkaibus',
        icon: Bus,
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        available: true
    },
    {
        id: 'bilbobus',
        label: 'Bilbobus',
        icon: Bus,
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        available: true
    },
    {
        id: 'renfe',
        label: 'Renfe',
        icon: TrainFront,
        color: 'text-purple-600',
        bgColor: 'bg-purple-100',
        available: true
    },
];

interface BottomNavProps {
    activeTransport: TransportType;
    onTransportChange: (transport: TransportType) => void;
}

export function BottomNav({ activeTransport, onTransportChange }: BottomNavProps) {
    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-3 safe-area-bottom">
            <div className="max-w-lg mx-auto">
                <div className="flex items-center justify-around py-2 px-1 rounded-2xl bg-white/70 border border-white/40 shadow-[0_10px_30px_rgba(15,23,42,0.12)] backdrop-blur-xl">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTransport === item.id;

                        return (
                            <button
                                key={item.id}
                                onClick={() => item.available && onTransportChange(item.id)}
                                disabled={!item.available}
                                className={`
                                    flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl
                                    transition-all duration-200 min-w-18
                                    ${isActive
                                        ? `bg-white/70 ${item.color} shadow-sm`
                                        : item.available
                                            ? 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                                            : 'text-slate-300 cursor-not-allowed'
                                    }
                                `}
                            >
                                <div className={`
                                    relative w-6 h-6
                                    ${isActive ? 'scale-110' : ''}
                                    transition-transform duration-200
                                `}>
                                    <Icon className="w-6 h-6" />
                                    {!item.available && (
                                        <span className="absolute -top-1 -right-2 text-[8px] font-bold bg-slate-200 text-slate-500 px-1 rounded">
                                            Soon
                                        </span>
                                    )}
                                </div>
                                <span className={`
                                    text-[10px] font-semibold
                                    
                                `}>
                                    {item.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
}

export type { TransportType };
