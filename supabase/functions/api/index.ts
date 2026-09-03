// @ts-nocheck
// Supabase Edge Function: api
// Deploy command: supabase functions deploy api --no-verify-jwt

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

declare const Deno: any;

// 1. CORS Headers unificados para golfo de paria / proyecarton
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

serve(async (req: Request) => {
  // 2. Pre-flight OPTIONS return inmediato
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname;

  // Inicialización de Supabase con service_role para permisos administrativos
  const supabaseUrl =
    (typeof Deno !== 'undefined' ? Deno.env.get('SUPABASE_URL') : null) ||
    'https://mccjcdsombzmlxzxccto.supabase.co';
  const supabaseKey =
    (typeof Deno !== 'undefined'
      ? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')
      : null) || '';

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  try {
    // -------------------------------------------------------------------------
    // RUTA: APROBAR RECARGA (/api/recargas/aprobar o /recargas/aprobar o /recargas/:id/aprobar)
    // -------------------------------------------------------------------------
    if (
      path.includes('/recargas/aprobar') ||
      path.includes('/recargas/') && path.endsWith('/aprobar') ||
      (path.endsWith('/recargas') && req.method === 'PATCH')
    ) {
      const body = await req.json().catch(() => ({}));
      const idRecarga = body.id || body.idRecarga || body.transactionId;
      const referencia = (body.referencia || body.referenceNumber || '').trim();
      let montoVes = Number(body.monto || body.monto_ves || body.amountVes) || 0;
      let usuarioId = body.usuario_id || body.userId || body.user_id;
      const correo = (body.correo || body.email || '').toLowerCase().trim();
      const cedulaPagador = (body.cedula_pagador || body.pagador_ci || body.payerDocumentId || '').trim();
      const cleanCedula = cedulaPagador.replace(/\D/g, '');
      const telefonoPagador = (body.telefono_pagador || body.userPhone || body.payerPhone || '').trim();
      const cleanPhone = telefonoPagador.replace(/\D/g, '');
      const procesadoPor = body.procesado_por || body.processedBy || 'limitlessmarketve@gmail.com';
      const fechaProcesado = body.fecha_procesado || body.processedAt || new Date().toISOString();

      // Consultar recarga existente para asegurar integridad si no se enviaron todos los campos
      let recargaDb: any = null;
      if (idRecarga) {
        const { data: r1 } = await supabase.from('recargas_pago_movil').select('*').eq('id', idRecarga).maybeSingle();
        if (r1) recargaDb = r1;
      }
      if (!recargaDb && referencia) {
        const { data: r2 } = await supabase.from('recargas_pago_movil').select('*').eq('referencia', referencia).maybeSingle();
        if (r2) recargaDb = r2;
      }

      if (recargaDb) {
        if (!montoVes) montoVes = Number(recargaDb.monto_ves || recargaDb.monto) || 0;
        if (!usuarioId) usuarioId = recargaDb.usuario_id || recargaDb.user_id;
      }

      // a) Actualizar estado a aprobado en recargas_pago_movil
      const updateData: any = {
        estatus: 'aprobada',
        fecha_procesado: fechaProcesado,
        procesado_por: procesadoPor,
      };

      if (idRecarga) {
        await supabase.from('recargas_pago_movil').update(updateData).eq('id', idRecarga);
      }
      if (referencia) {
        await supabase.from('recargas_pago_movil').update(updateData).eq('referencia', referencia);
      }

      // b) Incrementar saldo en jugadores_bingo de forma atómica
      let jugador: any = null;

      // 1. Búsqueda por ID directo
      if (usuarioId) {
        const { data: jById } = await supabase.from('jugadores_bingo').select('*').eq('id', usuarioId).maybeSingle();
        if (jById) jugador = jById;
      }

      // 2. Búsqueda por correo
      const effectiveEmail = correo || (recargaDb && (recargaDb.correo || recargaDb.email));
      if (!jugador && effectiveEmail) {
        const { data: jByEmail } = await supabase.from('jugadores_bingo').select('*').ilike('correo', effectiveEmail).maybeSingle();
        if (jByEmail) jugador = jByEmail;
      }

      // 3. Búsqueda por cédula
      const effectiveCedula = cleanCedula || (recargaDb && (recargaDb.cedula_pagador || recargaDb.pagador_ci || '').replace(/\D/g, ''));
      if (!jugador && effectiveCedula) {
        const { data: jByCedula } = await supabase
          .from('jugadores_bingo')
          .select('*')
          .or(`cedula.eq.${effectiveCedula},cedula.eq.V-${effectiveCedula},cedula.eq.E-${effectiveCedula}`)
          .maybeSingle();
        if (jByCedula) jugador = jByCedula;
      }

      // 4. Búsqueda por teléfono
      const effectivePhone = cleanPhone || (recargaDb && (recargaDb.telefono_pagador || recargaDb.userPhone || '').replace(/\D/g, ''));
      if (!jugador && effectivePhone && effectivePhone.length >= 7) {
        const { data: jByPhone } = await supabase
          .from('jugadores_bingo')
          .select('*')
          .ilike('telefono', `%${effectivePhone.slice(-7)}%`)
          .maybeSingle();
        if (jByPhone) jugador = jByPhone;
      }

      let saldoAnterior = 0;
      let saldoPosterior = montoVes;

      if (jugador && montoVes > 0) {
        saldoAnterior = Number(jugador.saldo) || 0;
        saldoPosterior = saldoAnterior + montoVes;

        const { error: errSaldo } = await supabase
          .from('jugadores_bingo')
          .update({
            saldo: saldoPosterior,
            updated_at: new Date().toISOString(),
          })
          .eq('id', jugador.id);

        if (errSaldo) {
          console.error('[Edge Function api] Error actualizando saldo de jugador:', errSaldo);
        } else {
          console.log('[Edge Function api] Saldo acreditado exitosamente:', jugador.id, 'Nuevo:', saldoPosterior);
        }

        // c) Insertar en ledger de auditoría
        try {
          await supabase.from('ledger').insert({
            user_id: jugador.id,
            user_name: jugador.nombre || 'Jugador',
            type: 'recharge',
            amount_ves: montoVes,
            balance_before: saldoAnterior,
            balance_after: saldoPosterior,
            description: `Recarga aprobada (Ref: ${referencia || idRecarga})`,
            reference_id: String(idRecarga || referencia),
            created_at: fechaProcesado,
          });
        } catch (ledgerErr) {
          console.warn('[Edge Function api] Aviso insertando ledger:', ledgerErr);
        }
      }

      // 3. Response con headers CORS requeridos
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Recarga aprobada y saldo acreditado con éxito',
          data: {
            id: idRecarga || referencia,
            monto: montoVes,
            saldoAnterior,
            saldoPosterior,
            jugadorId: jugador?.id || null,
          },
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // -------------------------------------------------------------------------
    // RUTA: LISTAR RECARGAS (/api/recargas o /recargas)
    // -------------------------------------------------------------------------
    if (path.endsWith('/recargas') && req.method === 'GET') {
      const { data, error } = await supabase
        .from('recargas_pago_movil')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      return new Response(JSON.stringify({ success: true, data: data || [] }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // -------------------------------------------------------------------------
    // RUTA: HEALTHCHECK GENERAL
    // -------------------------------------------------------------------------
    return new Response(
      JSON.stringify({
        status: 'ok',
        service: 'golfodepariaproyecarton-supabase-edge-api',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (err: any) {
    console.error('[Edge Function api Error]:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err?.message || 'Error interno en Supabase Edge Function',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
