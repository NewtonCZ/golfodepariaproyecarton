import React from 'react';

export const TerminosCondiciones: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4 text-slate-200">
      <h1 className="text-3xl font-black text-white mb-2">Términos y Condiciones</h1>
      <p className="text-sm text-slate-400 mb-8">
        Última actualización: 09/10/2026 · Versión 1.0
      </p>

      <div className="prose prose-invert max-w-none space-y-6 text-sm leading-relaxed">

        <section>
          <h2 className="text-xl font-black text-white mb-3">1. Identificación del Prestador</h2>
          <p>La plataforma <strong>Tú SúperCartón</strong> es operada por:</p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li><strong>Razón social:</strong> Grupo Agro Cajigal, S.A.</li>
            <li><strong>RIF:</strong> J-50769027-0</li>
            <li><strong>Domicilio fiscal:</strong> Av. Sucre de Yaguaraparo, Local Nro. S/N, Zona Yaguaraparo, Yaguaraparo, Sucre, Zona 6155, Venezuela.</li>
            <li><strong>Correo:</strong> grupoagrocajigalsa@gmail.com</li>
            <li><strong>Teléfono:</strong> 0424-5156225</li>
            <li><strong>Autorización:</strong> [Número CONALOT — completar]</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-black text-white mb-3">2. Aceptación de los Términos</h2>
          <p>
            El acceso, registro o uso de la Plataforma, así como la participación en los sorteos digitales,
            implican la <strong>aceptación plena, expresa e incondicional</strong> de estos Términos y Condiciones,
            de la Política de Privacidad y de la Política de Cookies. Si el usuario no está de acuerdo,
            debe abstenerse de usar la Plataforma.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-white mb-3">3. Elegibilidad y Restricciones de Edad</h2>
          <p>
            Los servicios están dirigidos <strong>exclusivamente a personas mayores de 18 años</strong> conforme
            a la legislación de la República Bolivariana de Venezuela. El registro requiere verificación KYC
            y validación del número y patrón numérico de la cédula de identidad venezolana.
          </p>
          <p className="mt-2">
            Si se detecta una cuenta operada por un menor, será <strong>suspendida y cancelada de inmediato</strong>,
            y los fondos serán retenidos hasta que se identifique al titular legítimo.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-white mb-3">4. Naturaleza del Servicio</h2>
          <p>
            La Plataforma ofrece un entorno virtual para <strong>sorteos y loterías de carácter recreativo y digital</strong>,
            regulados por la normativa venezolana aplicable. La participación es <strong>voluntaria</strong> y el usuario
            reconoce que se trata de una actividad de azar, sin garantía de ganancia.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-white mb-3">5. Registro, Cuenta y Seguridad</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>El usuario es el único responsable de la veracidad de sus datos.</li>
            <li>El usuario es responsable de custodiar sus credenciales.</li>
            <li>La empresa puede suspender o cancelar cuentas con indicios de fraude, multicuenta o datos falsos.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-black text-white mb-3">6. Pagos, Recargas, Retiros y Reembolsos</h2>
          <p><strong>Recargas:</strong> se acreditan una vez confirmado el pago en la pasarela habilitada.</p>
          <p className="mt-2"><strong>Retiros:</strong> requieren verificación de identidad (KYC) previa. El usuario debe ser titular del método de retiro.</p>
          <p className="mt-2">
            <strong>Reembolsos:</strong> proceden únicamente en casos de cargos duplicados o erróneos por falla
            técnica comprobada, servicios no prestados por causa imputable a la empresa, o los demás casos
            previstos en la Ley de Protección al Consumidor venezolana. Plazo de reclamo: 30 días hábiles.
          </p>
          <p className="mt-2">
            <strong>No hay reembolso</strong> por pérdidas en sorteos, saldo no utilizado por decisión del usuario,
            o cuentas canceladas por incumplimiento.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-white mb-3">7. Sorteos y Transparencia</h2>
          <p>
            Los sorteos se realizan conforme a las reglas publicadas antes de cada uno. La empresa puede auditar,
            suspender o repetir un sorteo si detecta fraude, error técnico o manipulación.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-white mb-3">8. Uso de Inteligencia Artificial</h2>
          <p>
            El servicio utiliza sistemas de inteligencia artificial desarrollados internamente para:
          </p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>La generación y distribución aleatoria de fichas y cartones de bingo.</li>
            <li>La moderación automática de contenido generado por los usuarios.</li>
          </ul>
          <p className="mt-3">
            Estos sistemas operan con datos anónimos y conforme a nuestra Política de Privacidad.
            El usuario acepta que su participación en el servicio implique el uso de estas tecnologías.
          </p>
          <p className="mt-3">
            Nos reservamos el derecho de incorporar en el futuro sistemas de IA de terceros para
            otras funciones (como atención al cliente), lo que será informado mediante la
            actualización de estas políticas.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-white mb-3">9. Privacidad, Datos y Derechos ARCO</h2>
          <p>
            El tratamiento de datos cumple con la normativa venezolana de protección de datos. Los datos se
            almacenan en <strong>Supabase</strong> y se gestionan con <strong>Render</strong> y <strong>Cloudflare</strong>.
          </p>
          <p className="mt-2">El usuario tiene derecho a:</p>
          <ul className="list-disc pl-6 space-y-1 mt-1">
            <li><strong>Acceso:</strong> consultar sus datos.</li>
            <li><strong>Rectificación:</strong> corregir datos inexactos.</li>
            <li><strong>Cancelación / Supresión:</strong> solicitar la eliminación definitiva.</li>
            <li><strong>Oposición:</strong> limitar el uso para fines específicos.</li>
            <li><strong>Portabilidad:</strong> solicitar copia de sus datos.</li>
          </ul>
          <p className="mt-2">
            Las solicitudes se canalizan a <strong>grupoagrocajigalsa@gmail.com</strong> y se responderán en un
            plazo máximo de 15 días hábiles.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-white mb-3">10. Propiedad Intelectual</h2>
          <p>
            Todos los activos gráficos, textos, software, algoritmos, marcas y el nombre <strong>"Tú SúperCartón"</strong>
            son propiedad exclusiva de la empresa y están protegidos por las leyes de propiedad intelectual
            venezolanas e internacionales. Queda prohibida su reproducción sin autorización escrita.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-white mb-3">11. Limitación de Responsabilidad</h2>
          <p>
            La empresa no será responsable por interrupciones ajenas a su control, uso indebido de la cuenta,
            ni daños indirectos. <strong>Esta limitación no aplica en casos de dolo o culpa grave</strong> de la
            empresa, ni cuando la ley aplicable prohíba dicha limitación.
          </p>
          <p className="mt-2">
            La responsabilidad máxima de la empresa, en cualquier caso, se limita al monto efectivamente
            recargado por el usuario en los últimos 90 días.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-white mb-3">12. Prohibiciones</h2>
          <p>El usuario se obliga a no:</p>
          <ul className="list-disc pl-6 space-y-1 mt-1">
            <li>Usar bots, scripts o automatizaciones.</li>
            <li>Manipular sorteos o resultados.</li>
            <li>Crear multicuentas.</li>
            <li>Usar la Plataforma para lavado de dinero.</li>
            <li>Suplantar identidad.</li>
            <li>Realizar ingeniería inversa o extraer código.</li>
          </ul>
          <p className="mt-2">
            El incumplimiento faculta a la empresa a cancelar la cuenta, retener fondos y denunciar ante
            las autoridades.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-white mb-3">13. Modificaciones</h2>
          <p>
            La empresa puede modificar estos Términos en cualquier momento. Los cambios se notificarán por
            correo o dentro de la Plataforma con <strong>15 días de antelación</strong>. El uso continuado implica
            aceptación. Si el usuario no acepta, puede solicitar la cancelación de su cuenta.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-white mb-3">14. Resolución de Disputas</h2>
          <p>
            Las partes intentarán resolver cualquier controversia de buena fe mediante negociación directa.
            Si no hay acuerdo, se somete a mediación ante un centro reconocido en Venezuela. En última
            instancia, a los tribunales competentes del domicilio fiscal de la empresa, conforme a las
            leyes de la República Bolivariana de Venezuela.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-black text-white mb-3">15. Contacto</h2>
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
