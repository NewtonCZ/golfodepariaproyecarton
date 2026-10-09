import React from 'react';

export const PoliticaPrivacidad: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 text-slate-200">
      <h1 className="text-3xl font-black text-white mb-2">Política de Privacidad</h1>
      <p className="text-sm text-slate-400 mb-8">
        Última actualización: 09/10/2026 · Versión 1.0
      </p>

      <div className="prose prose-invert max-w-none space-y-6 text-sm leading-relaxed">

        <section>
          <h2 className="text-xl font-black text-white mb-3">1. Responsable del Tratamiento</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Razón social:</strong> Grupo Agro Cajigal, S.A.</li>
            <li><strong>RIF:</strong> J-50769027-0</li>
            <li><strong>Domicilio:</strong> Av. Sucre de Yaguaraparo, Local Nro. S/N, Zona Yaguaraparo, Yaguaraparo, Sucre, Zona 6155.</li>
            <li><strong>Correo:</strong> grupoagrocajigalsa@gmail.com</li>
            <li><strong>Teléfono:</strong> 0424-5156225</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-black text-white mb-3">2. Datos que Recopilamos</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Nombre y apellido</li>
            <li>Correo electrónico</li>
            <li>Cédula de identidad venezolana</li>
            <li>Teléfono de contacto</li>
            <li>Datos de transacciones (recargas y retiros)</li>
            <li>Dirección IP y datos del dispositivo (para seguridad)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-black text-white mb-3">3. Finalidad del Tratamiento</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Verificar identidad (KYC) y edad (+18).</li>
            <li>Gestionar la cuenta y las participaciones en sorteos.</li>
            <li>Procesar pagos, recargas y retiros.</li>
            <li>Prevenir fraude y lavado de dinero.</li>
            <li>Cumplir con obligaciones legales y regulatorias.</li>
            <li>Enviar comunicaciones relacionadas con el servicio.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-black text-white mb-3">4. Base Legal</h2>
          <p>
            El tratamiento se basa en el <strong>consentimiento expreso</strong> del usuario, en la ejecución
            del contrato de servicio y en el cumplimiento de obligaciones legales aplicables en Venezuela.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-white mb-3">5. Conservación de Datos</h2>
          <p>
            Los datos se conservan mientras la cuenta esté activa y durante el plazo legal requerido para
            cumplir con obligaciones fiscales, contables y regulatorias. Luego se eliminan o anonimizan.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-white mb-3">6. Compartición con Terceros</h2>
          <p>Los datos pueden ser compartidos con:</p>
          <ul className="list-disc pl-6 space-y-1 mt-1">
            <li><strong>Supabase</strong> — almacenamiento seguro de base de datos.</li>
            <li><strong>Render</strong> — infraestructura en la nube.</li>
            <li><strong>Cloudflare</strong> — seguridad y CDN.</li>
            <li><strong>Pasarelas de pago</strong> — para procesar recargas y retiros.</li>
            <li><strong>Autoridades competentes</strong> — cuando sea requerido por ley.</li>
          </ul>
          <p className="mt-2">No vendemos ni alquilamos datos personales a terceros.</p>
        </section>

        <section>
          <h2 className="text-xl font-black text-white mb-3">7. Uso de Inteligencia Artificial</h2>
          <p>
            En Grupo Agro Cajigal, S.A. utilizamos sistemas de inteligencia artificial (IA)
            <strong> desarrollados internamente</strong> para las siguientes finalidades:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>
              <strong>Generación y gestión de sorteos:</strong> algoritmo propio que distribuye
              fichas y genera cartones de bingo de forma automatizada y aleatoria.
            </li>
            <li>
              <strong>Moderación automática de contenido:</strong> sistema que revisa y filtra
              contenido generado por usuarios para garantizar el cumplimiento de nuestras normas
              y la seguridad de la plataforma.
            </li>
          </ul>
          <p className="mt-3">
            <strong>Datos procesados:</strong> El algoritmo de sorteos opera exclusivamente con
            <strong> datos anónimos</strong> (fichas y códigos de registro), sin acceder a datos
            personales como nombre, cédula o correo. El sistema de moderación procesa el contenido
            generado por los usuarios y guarda los resultados para fines de auditoría interna.
          </p>
          <p className="mt-3">
            <strong>Decisiones automatizadas:</strong> El algoritmo de sorteos opera de forma
            aleatoria y no toma decisiones que produzcan efectos jurídicos significativos sobre
            usted. Los resultados no se almacenan asociados a su identidad.
          </p>
          <p className="mt-3">
            <strong>Sin transferencia a terceros:</strong> Actualmente <strong>no compartimos sus
            datos con proveedores externos de IA</strong>. Todos los sistemas de IA utilizados son
            desarrollados y operados internamente.
          </p>
          <p className="mt-3">
            <strong>Evolución futura:</strong> Podemos incorporar en el futuro sistemas de IA de
            terceros para atención al cliente u otras funciones. En tal caso, actualizaremos esta
            política y le informaremos oportunamente.
          </p>
          <p className="mt-3">
            <strong>Derechos:</strong> Usted puede solicitar información sobre el uso de IA o
            ejercer sus derechos escribiendo a grupoagrocajigalsa@gmail.com.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-white mb-3">8. Derechos del Usuario (ARCO)</h2>
          <p>El usuario puede ejercer:</p>
          <ul className="list-disc pl-6 space-y-1 mt-1">
            <li><strong>Acceso:</strong> consultar qué datos tenemos.</li>
            <li><strong>Rectificación:</strong> corregir datos inexactos.</li>
            <li><strong>Cancelación / Supresión:</strong> solicitar eliminación definitiva.</li>
            <li><strong>Oposición:</strong> limitar el uso para fines específicos.</li>
            <li><strong>Portabilidad:</strong> recibir copia en formato estructurado.</li>
          </ul>
          <p className="mt-2">
            Las solicitudes se envían a <strong>grupoagrocajigalsa@gmail.com</strong> con asunto
            "Solicitud ARCO" y se responderán en un plazo máximo de <strong>15 días hábiles</strong>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-white mb-3">9. Seguridad</h2>
          <p>
            Aplicamos medidas técnicas y organizativas razonables para proteger los datos: cifrado en tránsito,
            control de acceso, autenticación y monitoreo. Ningún sistema es 100% infalible, pero trabajamos
            para minimizar riesgos.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-white mb-3">10. Menores de Edad</h2>
          <p>
            No recopilamos conscientemente datos de menores de 18 años. Si detectamos una cuenta de un menor,
            procedemos a su cancelación y eliminación de datos.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-white mb-3">11. Cambios a esta Política</h2>
          <p>
            Podemos actualizar esta Política. Notificaremos cambios relevantes por correo o dentro de la
            Plataforma con <strong>15 días de antelación</strong>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-white mb-3">12. Contacto</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Email:</strong> grupoagrocajigalsa@gmail.com</li>
            <li><strong>Teléfono:</strong> 0424-5156225</li>
            <li><strong>Dirección:</strong> Av. Sucre de Yaguaraparo, Local Nro. S/N, Zona Yaguaraparo, Yaguaraparo, Sucre, Zona 6155.</li>
          </ul>
        </section>

      </div>
    </div>
  );
};
