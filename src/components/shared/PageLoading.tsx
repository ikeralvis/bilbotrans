/** Carga de pantalla completa: fondo de la app y una barra fina de movimiento arriba (nada que descargar ni pintar). */
export function PageLoading({ label = 'Cargando' }: { label?: string }) {
    return (
        <div className="min-h-dvh" style={{ background: 'var(--bg)' }} aria-busy="true">
            <div className="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden" role="progressbar" aria-label={label}>
                <span className="bt-card-bar block h-full" style={{ color: 'var(--accent, var(--metro))' }} />
            </div>
        </div>
    );
}
