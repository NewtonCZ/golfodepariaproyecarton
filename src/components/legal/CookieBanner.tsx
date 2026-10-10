import React, { useState, useEffect } from 'react';
import { Cookie, X, Settings, Check } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';

const COOKIE_CONSENT_KEY = 'tusupercarton_cookie_consent_v1';
const COOKIE_EXPIRATION_MONTHS = 12;

interface CookiePreferences {
  essential: boolean;
  performance: boolean;
  functionality: boolean;
  thirdParty: boolean;
  acceptedAt: string;
  expiresAt: string;
  version: string;
}

export const CookieBanner: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showConfig, setShowConfig] = useState(false);

  // ✅ FIX: Todo desactivado por defecto excepto esenciales
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    performance: false,
    functionality: false,
    thirdParty: false,
    acceptedAt: '',
    expiresAt: '',
    version: '1.0',
  });

  // ✅ FIX: Escuchar evento para reabrir configuración desde el footer
  useEffect(() => {
    const handleOpenConfig = () => {
      setShowBanner(true);
      setShowConfig(true);
    };
    window.addEventListener('open-cookie-config', handleOpenConfig);
    return () => window.removeEventListener('open-cookie-config', handleOpenConfig);
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (!saved) {
        setShowBanner(true);
        return;
      }

      const parsed: CookiePreferences = JSON.parse(saved);
      const expiresAt = parsed.expiresAt ? new Date(parsed.expiresAt).getTime() : 0;

      // Si no tiene expiresAt (versión vieja) o ya expiró → mostrar banner
      if (!expiresAt || Date.now() > expiresAt) {
        localStorage.removeItem(COOKIE_CONSENT_KEY);
        setShowBanner(true);
        return;
      }

      // Consentimiento válido → cargar preferencias guardadas
      setPreferences(parsed);
    } catch {
      setShowBanner(true);
    }
  }, []);

  const handleAcceptAll = () => {
    const prefs: CookiePreferences = {
      essential: true,
      performance: true,
      functionality: true,
      thirdParty: true,
      acceptedAt: new Date().toISOString(),
      expiresAt: getExpirationDate(),
      version: '1.0',
    };
    savePreferences(prefs);
  };

  const handleRejectNonEssential = () => {
    const prefs: CookiePreferences = {
      essential: true,
      performance: false,
      functionality: false,
      thirdParty: false,
      acceptedAt: new Date().toISOString(),
      expiresAt: getExpirationDate(),
      version: '1.0',
    };
    savePreferences(prefs);
  };

  const handleSaveConfig = () => {
    const prefs: CookiePreferences = {
      ...preferences,
      essential: true, // Siempre true
      acceptedAt: new Date().toISOString(),
      expiresAt: getExpirationDate(),
      version: '1.0',
    };
    savePreferences(prefs);
  };

  const getExpirationDate = (): string => {
    const expirationMs = COOKIE_EXPIRATION_MONTHS * 30 * 24 * 60 * 60 * 1000;
    return new Date(Date.now() + expirationMs).toISOString();
  };

   const savePreferences = async (prefs: CookiePreferences) => {
    // 1. Guardar siempre en localStorage (para visitantes anónimos)
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(prefs));
    } catch (e) {
      console.warn('[CookieBanner] Error guardando en localStorage:', e);
    }

    // 2. Si hay usuario logueado, persistir también en Supabase
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (userId) {
        const { data, error } = await supabase.functions.invoke('record-consent', {
          body: {
            cookies_accepted: true,
            cookies_version: prefs.version,
          },
        });

        if (error || !data?.success) {
          console.warn('[CookieBanner] Error edge function:', error || data);
        } else {
          console.log('[CookieBanner] Consent actualizado con IP:', data.ip);
        }
      }
    } catch (e) {
      console.warn('[CookieBanner] Excepción persistiendo en Supabase:', e);
    }

    // 3. UI
    setShowBanner(false);
    setShowConfig(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4 animate-in slide-in-from-bottom duration-300">
      <div className="max-w-4xl mx-auto bg-slate-900 border-2 border-indigo-500/60 rounded-2xl shadow-2xl p-4 sm:p-5">
        {!showConfig ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center shrink-0">
                <Cookie className="w-5 h-5 text-indigo-300" />
              </div>
              <div>
                <h3 className="font-black text-white text-sm sm:text-base">
                  🍪 Usamos cookies
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Utilizamos cookies para mejorar tu experiencia y analizar el tráfico.
                  Podés aceptar todas, rechazar las no esenciales o configurar tus preferencias.
                  Las cookies no esenciales <strong>no se cargan hasta que las aceptes</strong>.
                  {' '}
                  <a
                    href="/politica-cookies"
                    className="text-amber-400 underline hover:text-amber-300"
                  >
                    Ver Política de Cookies
                  </a>
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setShowConfig(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Configurar</span>
              </button>
              <button
                onClick={handleRejectNonEssential}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
              >
                Rechazar
              </button>
              <button
                onClick={handleAcceptAll}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-indigo-950 shadow-md transition-all cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Aceptar todas</span>
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-white text-base">
                ⚙️ Configurar cookies
              </h3>
              <button
                onClick={() => setShowConfig(false)}
                className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 mb-4">
              <div className="bg-slate-950 rounded-xl p-3 border border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-white text-sm">Cookies esenciales</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Necesarias para el funcionamiento del sitio. No se pueden desactivar.
                    </p>
                  </div>
                  <div className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-bold">
                    Siempre activas
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 rounded-xl p-3 border border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-white text-sm">Cookies de rendimiento</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Nos ayudan a analizar cómo usás el sitio.
                    </p>
                  </div>
                  <button
                    onClick={() => setPreferences({ ...preferences, performance: !preferences.performance })}
                    className={`w-12 h-6 rounded-full transition-all cursor-pointer ${
                      preferences.performance ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}
                    aria-label="Activar cookies de rendimiento"
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-all ${
                        preferences.performance ? 'translate-x-6' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="bg-slate-950 rounded-xl p-3 border border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-white text-sm">Cookies de funcionalidad</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Recuerdan tus preferencias (idioma, región).
                    </p>
                  </div>
                  <button
                    onClick={() => setPreferences({ ...preferences, functionality: !preferences.functionality })}
                    className={`w-12 h-6 rounded-full transition-all cursor-pointer ${
                      preferences.functionality ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}
                    aria-label="Activar cookies de funcionalidad"
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-all ${
                        preferences.functionality ? 'translate-x-6' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="bg-slate-950 rounded-xl p-3 border border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-white text-sm">Cookies de terceros</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Servicios externos (analíticas, marketing).
                    </p>
                  </div>
                  <button
                    onClick={() => setPreferences({ ...preferences, thirdParty: !preferences.thirdParty })}
                    className={`w-12 h-6 rounded-full transition-all cursor-pointer ${
                      preferences.thirdParty ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}
                    aria-label="Activar cookies de terceros"
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-all ${
                        preferences.thirdParty ? 'translate-x-6' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleRejectNonEssential}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
              >
                Rechazar no esenciales
              </button>
              <button
                onClick={handleSaveConfig}
                className="flex-1 px-4 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-indigo-950 shadow-md transition-all cursor-pointer"
              >
                Guardar preferencias
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
