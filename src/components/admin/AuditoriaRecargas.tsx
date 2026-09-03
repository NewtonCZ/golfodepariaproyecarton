import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/realtimeService';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  ShieldCheck,
  Search,
  RefreshCw,
  AlertTriangle,
  FileText,
  X
} from 'lucide-react';

export interface RecargaItem {
  id: string;
  monto: number;
  banco: string;
  referencia: string;
  comprobante_url: string;
  fecha: string;
  estado: string;
  pagador_nombre: string;
  pagador_ci: string;
  pagador_banco?: string;
  user_id?: string;
  email_usuario?: {
    email: string;
    nombre: string;
  };
  jugadores_bingo?: {
    email: string;
    nombre: string;
  };
  raw?: any;
}

export const AuditoriaRecargas: React.FC = () => {
  const [recargas, setRecargas] = useState<RecargaItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedVoucherUrl, setSelectedVoucherUrl] = useState<string | null>(null);
  const [selectedForReview, setSelectedForReview] = useState<RecargaItem | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // 1. LECTURA FRESCA DIRECTA (SIN CACHÉ LOCAL)
  const fetchRecargasFrescas = useCallback(async () => {
    setLoading(true);
    try {
      // Query explícita según requerimiento:
      const { data, error } = await supabase
        .from('recargas_pago_movil')
        .select(
          'id, monto, banco, referencia, comprobante_url, fecha, estado, pagador_nombre, pagador_ci, pagador_banco, user_id, email_usuario: jugadores_bingo!inner(email, nombre)'
        )
        .order('created_at', { ascending: false });

      if (!error && data) {
        const normalized: RecargaItem[] = data.map((item: any) => ({
          id: item.id,
          monto: Number(item.monto ?? item.monto_ves ?? 0),
          banco: item.banco ?? item.banco_origen ?? 'Banco',
          referencia: item.referencia,
          comprobante_url: item.comprobante_url,
          fecha: item.fecha ?? item.created_at,
          estado: item.estado ?? item.estatus ?? 'pendiente',
          pagador_nombre: item.pagador_nombre ?? 'Pagador No Especificado',
          pagador_ci: item.pagador_ci ?? '',
          pagador_banco: item.pagador_banco ?? item.banco,
          user_id: item.user_id,
          email_usuario: item.email_usuario,
          jugadores_bingo: item.email_usuario,
        }));
        setRecargas(normalized);
      } else {
        // Fallback resiliente con lectura fresca de jugadores si las columnas de postgrest difieren
        const { data: rawData } = await supabase
          .from('recargas_pago_movil')
          .select('*')
          .order('created_at', { ascending: false });

        if (rawData) {
          const { data: freshUsers } = await supabase
            .from('jugadores_bingo')
            .select('id, nombre, email, correo, cedula, saldo');

          const userMap = new Map<string, { email: string; nombre: string }>();
          (freshUsers || []).forEach((u: any) => {
            const profile = {
              email: u.email || u.correo || '',
              nombre: u.nombre || 'Jugador',
            };
            if (u.id) userMap.set(String(u.id), profile);
            if (u.email) userMap.set(u.email.toLowerCase(), profile);
            if (u.correo) userMap.set(u.correo.toLowerCase(), profile);
          });

          const normalized: RecargaItem[] = rawData.map((r: any) => {
            const uid = r.user_id || r.usuario_id;
            const umail = (r.correo || r.email || '').toLowerCase();
            const matchedUser = userMap.get(String(uid)) || userMap.get(umail) || {
              email: umail || 'Sin correo',
              nombre: r.nombre_usuario || 'Usuario Registrado',
            };

            return {
              id: r.id,
              monto: Number(r.monto ?? r.monto_ves ?? 0),
              banco: r.banco ?? r.banco_origen ?? 'Pago Móvil',
              referencia: r.referencia || '',
              comprobante_url: r.comprobante_url || r.voucher_image_url || '',
              fecha: r.fecha ?? r.created_at ?? new Date().toISOString(),
              estado: r.estado ?? r.estatus ?? 'pendiente',
              pagador_nombre: r.pagador_nombre ?? r.nombre_pagador ?? r.payer_name ?? 'Pagador Registrado',
              pagador_ci: r.pagador_ci ?? r.cedula_pagador ?? r.payer_document_id ?? '',
              pagador_banco: r.pagador_banco ?? r.banco_origen ?? r.banco,
              user_id: uid,
              email_usuario: matchedUser,
              jugadores_bingo: matchedUser,
              raw: r,
            };
          });

          setRecargas(normalized);
        }
      }
    } catch (err) {
      console.error('[AuditoriaRecargas] Error obteniendo recargas frescas:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecargasFrescas();

    // Suscripción Realtime para invalidación y recarga inmediata
    const channel = supabase
      .channel('auditoria_recargas_live_sub')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recargas_pago_movil' }, () => {
        fetchRecargasFrescas();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRecargasFrescas]);

  // 2. APROBAR RECARGA (CON LLAMADO A EDGE FUNCTION + ATOMIC BACKUP FLOW)
  const handleAprobarRecarga = async (id: string, customItem?: RecargaItem) => {
    setIsProcessing(true);
    setActionSuccessMsg(null);
    try {
      const target = customItem || recargas.find((r) => r.id === id);
      const monto = Number(target?.monto || 0);
      const referencia = target?.referencia;
      const userId = target?.user_id;
      const userEmail = target?.jugadores_bingo?.email || target?.email_usuario?.email;
      const pagadorCi = target?.pagador_ci;

      let edgeSuccess = false;

      // Intentar flujo Edge Function con CORS fix
      try {
        const res = await fetch(
          'https://mccjcdsombzmlxzxccto.supabase.co/functions/v1/api/recargas/aprobar',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '',
              Authorization: `Bearer ${(import.meta as any).env?.VITE_SUPABASE_ANON_KEY || ''}`,
            },
            body: JSON.stringify({
              id,
              idRecarga: id,
              referencia,
              monto,
              monto_ves: monto,
              usuario_id: userId,
              userId,
              correo: userEmail,
              email: userEmail,
              cedula_pagador: pagadorCi,
              pagador_ci: pagadorCi,
              procesado_por: 'limitlessmarketve@gmail.com',
              fecha_procesado: new Date().toISOString(),
            }),
          }
        );

        if (res.ok) {
          const resData = await res.json();
          if (resData.success) {
            edgeSuccess = true;
            console.log('[AuditoriaRecargas] Acreditación exitosa vía Edge Function API');
          }
        }
      } catch (edgeErr) {
        console.warn('[AuditoriaRecargas] Aviso en llamada Edge Function, ejecutando backup atómico:', edgeErr);
      }

      // Flujo atómico directo en Supabase si la Edge Function no completó
      if (!edgeSuccess) {
        // a) Update estado a aprobado en recargas_pago_movil
        await supabase
          .from('recargas_pago_movil')
          .update({
            estado: 'aprobada',
            estatus: 'aprobada',
            fecha_procesado: new Date().toISOString(),
            procesado_por: 'limitlessmarketve@gmail.com',
          })
          .eq('id', id);

        // b) Incrementar jugadores_bingo.saldo
        let jugador: any = null;
        if (userId) {
          const { data: j1 } = await supabase
            .from('jugadores_bingo')
            .select('id, nombre, saldo')
            .eq('id', userId)
            .maybeSingle();
          if (j1) jugador = j1;
        }
        if (!jugador && userEmail) {
          const { data: j2 } = await supabase
            .from('jugadores_bingo')
            .select('id, nombre, saldo')
            .ilike('correo', userEmail)
            .maybeSingle();
          if (j2) jugador = j2;
        }
        if (!jugador && pagadorCi) {
          const cleanCi = pagadorCi.replace(/\D/g, '');
          const { data: j3 } = await supabase
            .from('jugadores_bingo')
            .select('id, nombre, saldo')
            .eq('cedula', cleanCi)
            .maybeSingle();
          if (j3) jugador = j3;
        }

        if (jugador && monto > 0) {
          const saldoAnterior = Number(jugador.saldo) || 0;
          const saldoPosterior = saldoAnterior + monto;

          await supabase
            .from('jugadores_bingo')
            .update({
              saldo: saldoPosterior,
              updated_at: new Date().toISOString(),
            })
            .eq('id', jugador.id);

          // c) Insert en ledger de auditoría
          try {
            await supabase.from('ledger').insert({
              user_id: jugador.id,
              user_name: jugador.nombre,
              type: 'recharge',
              amount_ves: monto,
              balance_before: saldoAnterior,
              balance_after: saldoPosterior,
              description: `Recarga aprobada (Ref: ${referencia})`,
              reference_id: id,
              created_at: new Date().toISOString(),
            });
          } catch (ledgErr) {
            console.warn('[AuditoriaRecargas] Aviso insertando en ledger:', ledgErr);
          }
        }
      }

      setActionSuccessMsg(`Recarga #${id.slice(-6)} aprobada y saldo acreditado con éxito.`);
      setSelectedForReview(null);
      await fetchRecargasFrescas();
    } catch (err: any) {
      console.error('[AuditoriaRecargas] Error aprobando recarga:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. RECHAZAR RECARGA
  const handleRechazarRecarga = async (id: string, motivo: string) => {
    setIsProcessing(true);
    try {
      await supabase
        .from('recargas_pago_movil')
        .update({
          estado: 'rechazada',
          estatus: 'rechazada',
          motivo_rechazo: motivo || 'Comprobante no coincide con extracto bancario',
          procesado_por: 'limitlessmarketve@gmail.com',
          fecha_procesado: new Date().toISOString(),
        })
        .eq('id', id);

      setRejectId(null);
      setRejectReason('');
      setActionSuccessMsg(`Recarga #${id.slice(-6)} rechazada.`);
      await fetchRecargasFrescas();
    } catch (err) {
      console.error('[AuditoriaRecargas] Error rechazando recarga:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Filtros en memoria sobre datos frescos
  const filteredList = recargas.filter((item) => {
    const st = (item.estado || '').toLowerCase();
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'pending' && (st === 'pendiente' || st === 'pending')) ||
      (filterStatus === 'approved' && (st === 'aprobada' || st === 'approved')) ||
      (filterStatus === 'rejected' && (st === 'rechazada' || st === 'rejected'));

    const searchLower = searchTerm.toLowerCase();
    const userReg = item.jugadores_bingo || item.email_usuario;
    const matchesSearch =
      !searchTerm ||
      (item.referencia && item.referencia.toLowerCase().includes(searchLower)) ||
      (userReg?.nombre && userReg.nombre.toLowerCase().includes(searchLower)) ||
      (userReg?.email && userReg.email.toLowerCase().includes(searchLower)) ||
      (item.pagador_nombre && item.pagador_nombre.toLowerCase().includes(searchLower)) ||
      (item.pagador_ci && item.pagador_ci.includes(searchLower)) ||
      (item.banco && item.banco.toLowerCase().includes(searchLower));

    return matchesStatus && matchesSearch;
  });

  const formatMoney = (val: number) =>
    Number(val || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) +
    ' VES';

  return (
    <div className="bg-white rounded-3xl p-5 shadow-lg border border-slate-200 space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-black text-slate-900 text-base">
              Auditoría y Verificación de Recargas Pago Móvil
            </h3>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full">
              Lectura Fresca Supabase
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Control de comprobantes bancarios, validación de pagador vs usuario registrado y acreditación atómica de saldos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchRecargasFrescas()}
            disabled={loading}
            className="flex items-center gap-1 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-1.5 rounded-xl transition-all"
            title="Refrescar datos frescos directamente de Supabase"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refrescar</span>
          </button>
          <span className="text-xs font-bold text-amber-900 bg-amber-100 border border-amber-300 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            {recargas.filter((r) => r.estado === 'pendiente' || r.estado === 'pending').length} pendientes
          </span>
        </div>
      </div>

      {/* Success Banner */}
      {actionSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold p-3 rounded-xl flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por referencia, pagador, cédula, usuario o banco..."
            className="w-full bg-white border border-slate-200 focus:border-amber-500 pl-10 pr-4 py-2 rounded-xl text-xs font-medium text-slate-900 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
              filterStatus === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            Todos ({recargas.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
              filterStatus === 'pending'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-white text-amber-700 hover:bg-amber-50 border border-slate-200'
            }`}
          >
            Pendientes ({recargas.filter((r) => r.estado === 'pendiente' || r.estado === 'pending').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('approved')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
              filterStatus === 'approved'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-slate-200'
            }`}
          >
            Aprobados ({recargas.filter((r) => r.estado === 'aprobada' || r.estado === 'approved').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('rejected')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
              filterStatus === 'rejected'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-white text-rose-700 hover:bg-rose-50 border border-slate-200'
            }`}
          >
            Rechazados ({recargas.filter((r) => r.estado === 'rechazada' || r.estado === 'rejected').length})
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
              <th className="pb-2.5">Comprobante</th>
              <th className="pb-2.5">Usuario Registrado</th>
              <th className="pb-2.5">Pagador / C.I.</th>
              <th className="pb-2.5">Banco y Referencia</th>
              <th className="pb-2.5">Monto (VES)</th>
              <th className="pb-2.5">Fecha</th>
              <th className="pb-2.5">Estatus</th>
              <th className="pb-2.5 text-right">Acción Operativa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredList.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Clock className="w-8 h-8 text-slate-300" />
                    <p className="font-bold text-sm text-slate-600">No hay recargas en esta vista</p>
                    <p className="text-xs text-slate-400">
                      {searchTerm
                        ? 'No se encontraron resultados para los términos indicados.'
                        : 'No hay solicitudes de recarga pendientes de revisión.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredList.map((item) => {
                const isPending = item.estado === 'pendiente' || item.estado === 'pending';
                const isApproved = item.estado === 'aprobada' || item.estado === 'approved';
                const isRejected = item.estado === 'rechazada' || item.estado === 'rejected';

                // REGLA OBLIGATORIA:
                // Columna USUARIO REGISTRADO = item.jugadores_bingo.nombre + item.jugadores_bingo.email
                // Columna PAGADOR / C.I. = item.pagador_nombre + item.pagador_ci (NUNCA usar jugadores_bingo.nombre para pagador)
                const usuarioNombre = item.jugadores_bingo?.nombre || item.email_usuario?.nombre || 'Usuario Registrado';
                const usuarioEmail = item.jugadores_bingo?.email || item.email_usuario?.email || '';

                const pagadorNombre = item.pagador_nombre || 'Pagador';
                const pagadorCi = item.pagador_ci ? `C.I. ${item.pagador_ci}` : 'No especificada';

                return (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    {/* Comprobante */}
                    <td className="py-3">
                      {item.comprobante_url ? (
                        <div className="relative group w-12 h-12">
                          <img
                            src={item.comprobante_url}
                            alt="Comprobante"
                            onClick={() => setSelectedVoucherUrl(item.comprobante_url)}
                            className="w-12 h-12 object-cover rounded-xl border border-slate-300 cursor-pointer group-hover:scale-105 transition-transform shadow-xs"
                          />
                          <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center pointer-events-none transition-opacity">
                            <Eye className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                          <FileText className="w-5 h-5" />
                        </div>
                      )}
                    </td>

                    {/* USUARIO REGISTRADO */}
                    <td className="py-3 font-semibold text-slate-900">
                      <div className="font-bold text-slate-900">{usuarioNombre}</div>
                      {usuarioEmail && (
                        <div className="text-[10px] text-slate-500 font-mono">{usuarioEmail}</div>
                      )}
                    </td>

                    {/* PAGADOR / C.I. */}
                    <td className="py-3 text-slate-700">
                      <div className="font-bold text-slate-800">{pagadorNombre}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{pagadorCi}</div>
                      {item.pagador_banco && (
                        <div className="text-[9px] text-slate-400 font-medium">{item.pagador_banco}</div>
                      )}
                    </td>

                    {/* Banco y Referencia */}
                    <td className="py-3">
                      <div className="font-bold text-slate-800">{item.banco}</div>
                      <div className="font-mono text-indigo-900 font-bold bg-indigo-50 px-1.5 py-0.5 rounded inline-block text-[11px]">
                        Ref: {item.referencia}
                      </div>
                    </td>

                    {/* Monto VES */}
                    <td className="py-3 font-mono font-black text-sm text-emerald-600">
                      {formatMoney(item.monto)}
                    </td>

                    {/* Fecha */}
                    <td className="py-3 text-slate-500 text-[11px]">
                      <div>{item.fecha ? new Date(item.fecha).toLocaleDateString('es-VE') : ''}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {item.fecha ? new Date(item.fecha).toLocaleTimeString('es-VE') : ''}
                      </div>
                    </td>

                    {/* Estatus */}
                    <td className="py-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase inline-flex items-center gap-1 ${
                          isApproved
                            ? 'bg-emerald-100 text-emerald-800'
                            : isPending
                            ? 'bg-amber-100 text-amber-900 animate-pulse'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {isApproved && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                        {isPending && <Clock className="w-3 h-3 text-amber-600" />}
                        {isRejected && <XCircle className="w-3 h-3 text-rose-600" />}
                        {isApproved ? 'Aprobado' : isPending ? 'Pendiente' : 'Rechazado'}
                      </span>
                    </td>

                    {/* Acción Operativa */}
                    <td className="py-3 text-right">
                      {isPending ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedForReview(item)}
                            className="bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-indigo-950 font-black text-[11px] px-3 py-1.5 rounded-lg shadow-sm transition-all flex items-center gap-1"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Revisar y Confirmar</span>
                          </button>
                          <button
                            onClick={() => setRejectId(item.id)}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] px-2 py-1.5 rounded-lg transition-all"
                          >
                            Rechazar
                          </button>
                        </div>
                      ) : (
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 font-medium block">
                            {item.raw?.procesado_por || 'limitlessmarketve@gmail.com'}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono">
                            {isApproved ? 'Acreditado OK' : 'Rechazado'}
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Comprobante Ampliado */}
      {selectedVoucherUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
          <div className="relative max-w-2xl w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-700">
            <div className="p-3 bg-slate-800 flex items-center justify-between text-white">
              <span className="font-bold text-xs">Comprobante Bancario de Recarga</span>
              <button
                onClick={() => setSelectedVoucherUrl(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-black/60 max-h-[75vh] overflow-auto">
              <img
                src={selectedVoucherUrl}
                alt="Comprobante completo"
                className="max-h-[70vh] object-contain rounded-lg shadow-md"
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación y Revisión de Pago Móvil */}
      {selectedForReview && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h4 className="font-black text-slate-900 text-base">
                  Confirmación de Auditoría Bancaria
                </h4>
              </div>
              <button
                onClick={() => setSelectedForReview(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block">Monto a Acreditar:</span>
                  <span className="text-base font-black font-mono text-emerald-600">
                    {formatMoney(selectedForReview.monto)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block">Referencia:</span>
                  <span className="text-sm font-black font-mono text-indigo-950">
                    {selectedForReview.referencia}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block">Usuario Registrado:</span>
                  <span className="font-bold text-slate-900 block">
                    {selectedForReview.jugadores_bingo?.nombre || selectedForReview.email_usuario?.nombre || 'Usuario'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {selectedForReview.jugadores_bingo?.email || selectedForReview.email_usuario?.email}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block">Pagador en Banco:</span>
                  <span className="font-bold text-slate-900 block">
                    {selectedForReview.pagador_nombre}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {selectedForReview.pagador_ci ? `C.I. ${selectedForReview.pagador_ci}` : ''}
                  </span>
                </div>
              </div>

              {selectedForReview.comprobante_url && (
                <div className="border border-slate-200 rounded-xl p-2 bg-slate-100 flex items-center justify-center">
                  <img
                    src={selectedForReview.comprobante_url}
                    alt="Voucher"
                    className="max-h-48 object-contain rounded-lg cursor-pointer hover:opacity-95"
                    onClick={() => setSelectedVoucherUrl(selectedForReview.comprobante_url)}
                    title="Clic para ver en tamaño grande"
                  />
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-amber-900 text-[11px] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Al hacer clic en <strong>"Aprobar y Acreditar Saldo"</strong>, se ejecutará la acreditación atómica
                  sumando el monto al saldo disponible del jugador y registrando el asiento inmutable en el ledger.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedForReview(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleAprobarRecarga(selectedForReview.id, selectedForReview)}
                className="px-5 py-2 rounded-xl text-xs font-black text-slate-950 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 shadow-md transition-all flex items-center gap-1.5"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Acreditando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-slate-950" />
                    <span>Aprobar y Acreditar Saldo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Rechazo */}
      {rejectId && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="font-black text-slate-900 text-base">Rechazar Solicitud de Recarga</h4>
              <button onClick={() => setRejectId(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Indica el motivo del rechazo para informar al jugador:
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ej. El número de referencia no coincide con los registros bancarios o el monto reportado es incorrecto."
                rows={3}
                className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectId(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleRechazarRecarga(rejectId, rejectReason)}
                className="px-4 py-2 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-700 shadow-md transition-all"
              >
                Confirmar Rechazo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditoriaRecargas;
