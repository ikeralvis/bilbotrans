'use client';

import { useEffect } from 'react';
import { refreshMetroLive } from '@/lib/metro/hooks';
import { refreshBizkaibusLive } from '@/lib/bizkaibus/hooks';
import { refreshBilbobusLive } from '@/lib/bilbobus/hooks';

/** Si la app estuvo oculta más de esto, al volver se pide dato nuevo (sin esperar al foco, que en iOS no siempre llega). */
const AWAY_MS = 15_000;

/**
 * Una PWA instalada en iOS se «congela» al irse a segundo plano y al volver conserva lo último que pintó.
 * Al volver se refresca todo lo que esté en pantalla (saltándose la caché del CDN), tanto con `visibilitychange`
 * como con `pageshow` (restauración desde la caché de páginas).
 */
export function ResumeRefresh() {
    useEffect(() => {
        let hiddenAt = 0;
        const refresh = () => {
            void refreshMetroLive();
            void refreshBizkaibusLive();
            void refreshBilbobusLive();
        };
        const onVisibility = () => {
            if (document.visibilityState === 'hidden') {
                hiddenAt = Date.now();
                return;
            }
            if (hiddenAt && Date.now() - hiddenAt > AWAY_MS) refresh();
            hiddenAt = 0;
        };
        const onPageShow = (e: PageTransitionEvent) => {
            if (e.persisted) refresh();
        };
        document.addEventListener('visibilitychange', onVisibility);
        window.addEventListener('pageshow', onPageShow);
        return () => {
            document.removeEventListener('visibilitychange', onVisibility);
            window.removeEventListener('pageshow', onPageShow);
        };
    }, []);
    return null;
}
