import { Suspense } from "react";
import MetroHome from "@/components/metro/MetroHome";

export default function Page() {
    return (
        <Suspense fallback={<div className="min-h-dvh" style={{ background: "var(--bg)" }} />}>
            <MetroHome />
        </Suspense>
    );
}
