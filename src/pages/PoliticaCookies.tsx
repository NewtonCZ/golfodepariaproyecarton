import React from 'react';

export const PoliticaCookies: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 text-slate-200">
      <h1 className="text-3xl font-black text-white mb-6">Política de Cookies</h1>
      <p className="text-sm text-slate-400 mb-8">
        Última actualización: 08/10/2026 · Versión 1.0
      </p>

      <div className="prose prose-invert max-w-none space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-xl font-black text-white mb-3">1. ¿Qué son las cookies?</h2>
          <p>
            Las cookies son pequeños archivos de texto que se almacenan en su dispositivo cuando visita un sitio web.
            Permiten que el sitio recuerde sus acciones y preferencias durante un período de tiempo.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-white mb-3">2. ¿Qué tipos de cookies usamos?</h2>

          <h3 className="text-base font-bold text-amber-300 mt-4 mb-2">2.1. Cookies esenciales (obligatorias)</h3>
          <p>Necesarias para el funcionamiento básico: inicio de sesión, carrito de compras, seguridad.</p>

          <h3 className="text-base font-bold text-amber-300 mt-4 mb-2">2.2. Cookies de rendimiento</h3>
          <p>Recopilan información sobre cómo los usuarios usan el sitio.</p>

          <h3 className="text-base font-bold text-amber-300 mt-4 mb-2">2.3. Cookies de funcionalidad</h3>
          <p>Recuerdan sus preferencias (idioma, región, tamaño de fuente).</p>

          <h3 className="text-base font-bold text-amber-300 mt-4 mb-2">2.4. Cookies de terceros</h3>
          <p>Supabase, Render, Cloudflare.</p>
        </section>

        <section>
          <h2 className="text-xl font-black text-white mb-3">3. ¿Cómo gestionar las cookies?</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Aceptar todas las cookies</li>
            <li>Rechazar las no esenciales</li>
            <li>Configurar preferencias por tipo</li>
            <li>Eliminar cookies desde el navegador</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-black text-white mb-3">4. Consentimiento</h2>
          <p>
            Al hacer clic en "Aceptar todas las cookies", usted otorga su consentimiento.
            Puede retirarlo en cualquier momento escribiendo a grupoagrocajigalsa@gmail.com.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-white mb-3">5. Contacto</h2>
          <p>
            <strong>Grupo Agro Cajigal, S.A.</strong><br />
            RIF: J-50769027-0<br />
            Av. Sucre de Yaguaraparo, Local Nro. S/N, Zona Yaguaraparo, Yaguaraparo, Sucre, Zona 6155<br />
            Correo: grupoagrocajigalsa@gmail.com<br />
            Teléfono: 0424-5156225
          </p>
        </section>
      </div>
    </div>
  );
};
