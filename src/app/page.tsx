import { Suspense } from "react";
import HomeClient from "@/components/home/HomeClient";
import MetroHome from "@/components/metro/MetroHome";

/** Transportes activos. Con solo "metro" se muestra la home nueva; el resto del código queda intacto. */
const ENABLED = (process.env.NEXT_PUBLIC_ENABLED_TRANSPORTS ?? "metro")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

export default function Page() {
    const metroOnly = ENABLED.length === 1 && ENABLED[0] === "metro";
    return (
        <Suspense fallback={<div className="min-h-dvh" style={{ background: "var(--bg)" }} />}>
            {metroOnly ? <MetroHome /> : <HomeClient />}
        </Suspense>
    );
}
