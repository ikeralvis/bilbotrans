import { Suspense } from 'react';
import { RouteContent } from './route-content';
import { PageLoading } from '@/components/shared/PageLoading';

export default function RoutePage() {
    return (
        <Suspense fallback={<PageLoading label="Cargando ruta" />}>
            <RouteContent />
        </Suspense>
    );
}
