import { Suspense } from "react";
import RenfeRouteClient from "./RenfeRouteClient";
import { Train } from "lucide-react";

export default function RenfeRoutePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gradient-to-b from-purple-50 to-red-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-red-500 flex items-center justify-center mx-auto mb-4 animate-pulse">
                        <Train className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-slate-600 font-medium">Cargando trenes...</p>
                </div>
            </div>
        }>
            <RenfeRouteClient />
        </Suspense>
    );
}
