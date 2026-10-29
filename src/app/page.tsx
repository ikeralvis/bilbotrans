import { Suspense } from "react";
import HubHome from "@/components/home/HubHome";

export default function Page() {
    return (
        <Suspense fallback={<div className="min-h-dvh" style={{ background: "var(--bg)" }} />}>
            <HubHome />
        </Suspense>
    );
}
