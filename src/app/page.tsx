import { Suspense } from "react";
import HomeClient from "@/components/HomeClient";

export default function Page() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-orange-500 to-red-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
                        <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5z"/></svg>
                    </div>
                    <p className="text-slate-600">Cargando inicio</p>
                </div>
            </div>
        }>
            <HomeClient />
        </Suspense>
    );
}
