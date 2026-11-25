'use client';

import { Bell, BellOff, Loader2, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { useOneSignal } from '@/hooks/useOneSignal';
import { useLanguage } from '@/context/LanguageContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function MetroAlertsConfig({ isOpen, onClose }: Props) {
  const { language } = useLanguage();
  const { isInitialized, isSubscribed, isLoading, error, subscribe, unsubscribe } = useOneSignal();

  if (!isOpen) return null;

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const translations = {
    es: {
      title: 'Alertas de Metro Bilbao',
      description: 'Recibe notificaciones sobre avisos importantes del Metro',
      howItWorks: '¿Cómo funciona?',
      point1: 'Recibirás notificaciones push en tu dispositivo',
      point2: 'Solo se envían avisos de servicio importantes',
      point3: 'Funciona aunque no tengas la app abierta',
      point4: 'Puedes desactivarlas en cualquier momento',
      enableButton: 'Activar alertas',
      disableButton: 'Desactivar alertas',
      enabled: 'Alertas activadas',
      disabled: 'Alertas desactivadas',
      loading: 'Cargando...',
      notConfigured: 'Las notificaciones no están configuradas en este momento',
    },
    eu: {
      title: 'Metrobilbaoko Abisuak',
      description: 'Jaso Metroaren abisu garrantzitsuei buruzko jakinarazpenak',
      howItWorks: 'Nola funtzionatzen du?',
      point1: 'Push jakinarazpenak jasoko dituzu zure gailuan',
      point2: 'Zerbitzuko abisu garrantzitsuak bakarrik bidaltzen dira',
      point3: 'Aplikazioa ireki gabe funtzionatzen du',
      point4: 'Edozein unetan desaktiba ditzakezu',
      enableButton: 'Aktibatu abisuak',
      disableButton: 'Desaktibatu abisuak',
      enabled: 'Abisuak aktibatuta',
      disabled: 'Abisuak desaktibatuta',
      loading: 'Kargatzen...',
      notConfigured: 'Jakinarazpenak ez daude konfiguratuta oraingoz',
    },
  };

  const t = translations[language as keyof typeof translations] || translations.es;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-50 animate-fadeIn"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-0 bottom-0 z-50 animate-slideUp">
        <div className="bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-4 flex items-center justify-between rounded-t-3xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                <Bell className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">{t.title}</h2>
                <p className="text-xs text-slate-500">{t.description}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Estado actual */}
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                <span className="ml-3 text-slate-600">{t.loading}</span>
              </div>
            ) : error || !isInitialized ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-900">
                      {t.notConfigured}
                    </p>
                    {error && (
                      <p className="text-xs text-amber-700 mt-1">{error}</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Estado de suscripción */}
                <div className={`rounded-xl p-4 border-2 ${
                  isSubscribed
                    ? 'bg-green-50 border-green-200'
                    : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center gap-3">
                    {isSubscribed ? (
                      <>
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                        <div>
                          <p className="font-semibold text-green-900">{t.enabled}</p>
                          <p className="text-sm text-green-700">
                            Recibirás notificaciones de avisos importantes
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <BellOff className="w-6 h-6 text-slate-400" />
                        <div>
                          <p className="font-semibold text-slate-900">{t.disabled}</p>
                          <p className="text-sm text-slate-600">
                            Activa las alertas para recibir notificaciones
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Cómo funciona */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {t.howItWorks}
                  </h3>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-sm text-blue-800">
                      <span className="text-blue-500 mt-0.5">•</span>
                      {t.point1}
                    </li>
                    <li className="flex items-start gap-2 text-sm text-blue-800">
                      <span className="text-blue-500 mt-0.5">•</span>
                      {t.point2}
                    </li>
                    <li className="flex items-start gap-2 text-sm text-blue-800">
                      <span className="text-blue-500 mt-0.5">•</span>
                      {t.point3}
                    </li>
                    <li className="flex items-start gap-2 text-sm text-blue-800">
                      <span className="text-blue-500 mt-0.5">•</span>
                      {t.point4}
                    </li>
                  </ul>
                </div>

                {/* Botón de acción */}
                <button
                  onClick={handleToggle}
                  className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all ${
                    isSubscribed
                      ? 'bg-slate-500 hover:bg-slate-600'
                      : 'bg-orange-500 hover:bg-orange-600'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    {isSubscribed ? (
                      <>
                        <BellOff className="w-5 h-5" />
                        {t.disableButton}
                      </>
                    ) : (
                      <>
                        <Bell className="w-5 h-5" />
                        {t.enableButton}
                      </>
                    )}
                  </div>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
