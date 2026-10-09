import React from 'react';

export const PoliticaCookies: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 text-slate-200">
      <h1 className="text-3xl font-black text-white mb-6">Política de Cookies</h1>
      <p className="text-sm text-slate-400 mb-8">
        Última actualización: 09/10/2026 · Versión 1.0
      </p>

      <div className="prose prose-invert max-w-none space-y-6 text-sm leading-relaxed">
        {/* 1. ¿Qué son las cookies? */}
        <section>
          <h2 className="text-xl font-black text-white mb-3">1. ¿Qué son las cookies?</h2>
          <p>
            Las cookies son pequeños archivos de texto que se almacenan en su dispositivo cuando visita un sitio web.
            Permiten que el sitio recuerde sus acciones y preferencias durante un período de tiempo, facilitando
            su uso y mejorando su experiencia de navegación.
          </p>
          <p className="mt-3">
            Además de cookies, podemos usar tecnologías similares como <strong>localStorage</strong> y{' '}
            <strong>sessionStorage</strong> para guardar información en su navegador. Esta política cubre todas ellas.
          </p>
        </section>

        {/* 2. Tipos de cookies que usamos */}
        <section>
          <h2 className="text-xl font-black text-white mb-3">2. ¿Qué tipos de cookies usamos?</h2>

          <h3 className="text-base font-bold text-amber-300 mt-4 mb-2">2.1. Cookies esenciales (obligatorias)</h3>
          <p>
            Son necesarias para el funcionamiento básico del sitio: inicio de sesión, seguridad, procesamiento
            de pagos y prevención de fraudes. Sin estas cookies, el servicio no puede funcionar correctamente.
            <strong> No requieren su consentimiento</strong> porque son imprescindibles para prestar el servicio.
          </p>

          <h3 className="text-base font-bold text-amber-300 mt-4 mb-2">2.2. Cookies de rendimiento (opcionales)</h3>
          <p>
            Recopilan información anónima sobre cómo los usuarios usan el sitio (páginas visitadas, tiempo de
            permanencia, errores). Nos ayudan a mejorar el funcionamiento. <strong>Requieren su consentimiento.</strong>
          </p>

          <h3 className="text-base font-bold text-amber-300 mt-4 mb-2">2.3. Cookies de funcionalidad (opcionales)</h3>
          <p>
            Recuerdan sus preferencias (idioma, región, tamaño de fuente, configuración de cookies).
            <strong> Requieren su consentimiento.</strong>
          </p>

          <h3 className="text-base font-bold text-amber-300 mt-4 mb-2">2.4. Cookies de terceros</h3>
          <p>
            Son establecidas por servicios externos que usamos (Supabase, Render, Cloudflare).
            Pueden ser esenciales o de rendimiento según su finalidad.
          </p>
        </section>

        {/* 3. Tabla detallada de cookies */}
        <section>
          <h2 className="text-xl font-black text-white mb-3">3. Tabla detallada de cookies</h2>
          <p className="mb-3">
            A continuación, el detalle de las cookies y tecnologías similares que utilizamos:
          </p>

          <div className="overflow-x-auto rounded-lg border border-slate-700">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800 text-slate-200">
                <tr>
                  <th className="px-3 py-2 font-bold">Nombre</th>
                  <th className="px-3 py-2 font-bold">Tipo</th>
                  <th className="px-3 py-2 font-bold">Finalidad</th>
                  <th className="px-3 py-2 font-bold">Duración</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                <tr className="bg-slate-900/40">
                  <td className="px-3 py-2 font-mono text-amber-300">sb-auth-token</td>
                  <td className="px-3 py-2">Esencial</td>
                  <td className="px-3 py-2">Autenticación de la sesión del usuario</td>
                  <td className="px-3 py-2">Sesión</td>
                </tr>
                <tr className="bg-slate-900/40">
                  <td className="px-3 py-2 font-mono text-amber-300">sb-refresh-token</td>
                  <td className="px-3 py-2">Esencial</td>
                  <td className="px-3 py-2">Renovación automática de la sesión</td>
                  <td className="px-3 py-2">7 días</td>
                </tr>
                <tr className="bg-slate-900/40">
                  <td className="px-3 py-2 font-mono text-amber-300">cookie_consent</td>
                  <td className="px-3 py-2">Esencial</td>
                  <td className="px-3 py-2">Guardar sus preferencias de cookies</td>
                  <td className="px-3 py-2">1 año</td>
                </tr>
                <tr className="bg-slate-900/40">
                  <td className="px-3 py-2 font-mono text-amber-300">sb-local-storage</td>
                  <td className="px-3 py-2">Esencial</td>
                  <td className="px-3 py-2">Almacenamiento local de datos de sesión</td>
                  <td className="px-3 py-2">Persistente</td>
                </tr>
                <tr className="bg-slate-900/40">
                  <td className="px-3 py-2 font-mono text-amber-300">_ga</td>
                  <td className="px-3 py-2">Rendimiento</td>
                  <td className="px-3 py-2">Google Analytics — distinguir usuarios</td>
                  <td className="px-3 py-2">2 años</td>
                </tr>
                <tr className="bg-slate-900/40">
                  <td className="px-3 py-2 font-mono text-amber-300">_gid</td>
                  <td className="px-3 py-2">Rendimiento</td>
                  <td className="px-3 py-2">Google Analytics — distinguir usuarios</td>
                  <td className="px-3 py-2">24 horas</td>
                </tr>
                <tr className="bg-slate-900/40">
                  <td className="px-3 py-2 font-mono text-amber-300">cf_clearance</td>
                  <td className="px-3 py-2">Esencial</td>
                  <td className="px-3 py-2">Cloudflare — seguridad y anti-bot</td>
                  <td className="px-3 py-2">30 minutos</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-slate-400">
            <strong>Nota:</strong> Las cookies marcadas como "Rendimiento" solo se cargan si usted las acepta
            expresamente. Las cookies "Esenciales" son necesarias para el funcionamiento del sitio y no requieren
            consentimiento previo.
          </p>
        </section>

        {/* 4. Cómo gestionar las cookies */}
        <section>
          <h2 className="text-xl font-black text-white mb-3">4. ¿Cómo gestionar las cookies?</h2>
          <p className="mb-3">
            Usted puede gestionar sus preferencias de cookies en cualquier momento:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Desde nuestro sitio:</strong> usando el botón "Configurar cookies" en el pie de página.
            </li>
            <li>
              <strong>Desde su navegador:</strong> puede eliminar o bloquear cookies siguiendo las instrucciones de:
              <ul className="list-disc pl-6 mt-1 space-y-1">
                <li>Google Chrome: Configuración → Privacidad y seguridad → Cookies</li>
                <li>Mozilla Firefox: Opciones → Privacidad y seguridad → Cookies</li>
                <li>Safari: Preferencias → Privacidad → Cookies</li>
                <li>Microsoft Edge: Configuración → Cookies y permisos del sitio</li>
              </ul>
            </li>
          </ul>
          <p className="mt-3">
            <strong>Importante:</strong> Si bloquea o elimina las cookies esenciales, es posible que algunas
            funcionalidades del sitio (como iniciar sesión o participar en sorteos) dejen de funcionar.
          </p>
        </section>

        {/* 5. Consentimiento y retiro */}
        <section>
          <h2 className="text-xl font-black text-white mb-3">5. Consentimiento y cómo retirarlo</h2>
          <p>
            Al registrarse o al configurar sus preferencias en el banner de cookies, usted otorga su consentimiento
            para las cookies no esenciales que haya aceptado. Las cookies esenciales no requieren consentimiento
            porque son imprescindibles para el servicio.
          </p>
          <p className="mt-3">
            <strong>Puede retirar su consentimiento en cualquier momento</strong> de las siguientes formas:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>Usando el botón "Configurar cookies" en el pie de página del sitio.</li>
            <li>Usando el botón "Eliminar mis datos" en el pie de página.</li>
            <li>Escribiendo a <strong>grupoagrocajigalsa@gmail.com</strong>.</li>
          </ul>
          <p className="mt-3">
            La retirada del consentimiento no afecta a la licitud del tratamiento basado en el consentimiento
            previo a su retirada.
          </p>
        </section>

        {/* 6. Actualizaciones */}
        <section>
          <h2 className="text-xl font-black text-white mb-3">6. Actualizaciones de esta política</h2>
          <p>
            Podemos actualizar esta Política de Cookies para reflejar cambios en las cookies que usamos o por
            motivos legales. La fecha de "Última actualización" al inicio del documento indica cuándo fue revisada
            por última vez. Le recomendamos revisarla periódicamente.
          </p>
        </section>

        {/* 7. Contacto */}
        <section>
          <h2 className="text-xl font-black text-white mb-3">7. Contacto</h2>
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
