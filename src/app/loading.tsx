/** Carga entre pantallas: solo una barra fina de movimiento arriba (nada que pintar ni descargar). */
export default function Loading() {
    return (
        <div className="min-h-dvh" style={{ background: 'var(--bg)' }} aria-busy="true">
            <div className="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden" role="progressbar" aria-label="Cargando">
                <span className="bt-card-bar block h-full" style={{ color: 'var(--accent, var(--metro))' }} />
            </div>
        </div>
    );
}
