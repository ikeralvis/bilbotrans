import { Suspense } from 'react';
import { RouteContent } from './route-content';
import { Train, Loader2 } from 'lucide-react';

function RouteFallback() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center">
            <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-orange-500 to-red-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
                    <Train className="w-8 h-8 text-white" />
                </div>
                <Loader2 className="w-6 h-6 animate-spin text-orange-500 mx-auto mb-3" />
                <p className="text-slate-600 font-medium">Cargando ruta...</p>
            </div>
        </div>
    );
}

export default function RoutePage() {
    return (
        <Suspense fallback={<RouteFallback />}>
            <RouteContent />
        </Suspense>
    );
}
