import React, { useState, useEffect, useMemo } from 'react';
import { getJugadores, getJugadoresSync, JugadorBingo, deleteJugador, saveJugador } from '../../services/playerStorage';
import { supabase } from '../../services/supabaseClient';
import { realtimeService } from '../../services/realtimeService';
import {
  Users,
  Search,
  RefreshCw,
  Calendar,
  Phone,
  CreditCard,
  UserCheck,
  ArrowLeft,
  Trash2,
  Sparkles,
  ShieldCheck,
  Mail,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  DollarSign,
  Receipt,
  Wallet,
  ExternalLink,
  Clock,
  X,
} from 'lucide-react';

export interface RecargaAdminItem {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  amountVes: number;
  payerPhone: string;
  payerName: string;
  payerDocumentId: string;
  bankOrigin: string;
  referenceNumber: string;
  voucherImageUrl: string;
  status: string;
  createdAt: string;
  processedAt?: string;
  processedBy?: string;
  rejectionReason?: string;
}

interface AdminPlayersViewProps {
  onBackToGame?: () => void;
}

export const AdminPlayersView: React.FC<AdminPlayersViewProps> = ({ onBackToGame }) => {
  const [jugadores, setJugadores] = useState<JugadorBingo[]>(() => getJugadoresSync());
  const [recargas, setRecargas] = useState<RecargaAdminItem[]>([]);
  const [activeTab, setActiveTab] = useState<'jugadores' | 'recargas'>('jugadores');
  const [searchTerm, setSearchTerm] = useState('');
  const [recargaFilterStatus, setRecargaFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modales
  const [selectedVoucherModal, setSelectedVoucherModal] = useState<string | null>(null);
  const [selectedRecargaModal, setSelectedRecargaModal] = useState<RecargaAdminItem | null>(null);
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('Comprobante no coincide con extracto bancario');

  // Recarga en tiempo real usando Supabase directamente
  const refreshList = async () => {
    setIsLoading(true);
    try {
      // 1. Usar supabase.from().select() directo para jugadores_bingo
      const { data: dbData, error: sbError } = await supabase
        .from('jugadores_bingo')
        .select('*')
        .order('fecha_registro', { ascending: false });

      if (sbError) {
        console.log('[AdminPlayersView] Supabase jugadores_bingo error:', sbError);
        // Fallback a tabla alternativa 'jugadores'
        const { data: altData, error: altError } = await supabase
          .from('jugadores')
          .select('*')
          .order('created_at', { ascending: false });

        if (altError) {
          console.log('[AdminPlayersView] Supabase jugadores error:', altError);
          const localData = await getJugadores();
          setJugadores(localData);
        } else if (Array.isArray(altData) && altData.length > 0) {
          const mappedAlt: JugadorBingo[] = altData.map((item: any) => ({
            id: String(item.id || `jug-${Date.now()}`),
            nombre: (item.nombre || item.name || item.first_name || item.firstName || '').trim() || 'Jugador',
            apellido: (item.apellido || item.last_name || item.lastName || '').trim(),
            cedula: String(item.cedula || item.document_id || item.documentId || '').trim().toUpperCase(),
            correo: String(item.correo || item.email || '').trim().toLowerCase(),
            telefono: String(item.telefono || item.phone || '0412-0000000').trim(),
            fechaNacimiento: String(item.fecha_nacimiento || item.fechaNacimiento || item.birth_date || item.birthDate || '').trim(),
            fechaRegistro:
              item.fecha_registro ||
              item.fechaRegistro ||
              item.created_at ||
              new Date().toLocaleDateString('es-VE', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              }),
            saldo: Number(item.saldo ?? item.available_balance ?? item.balance ?? 0),
          }));
          setJugadores(mappedAlt);
        } else {
          const localData = await getJugadores();
          setJugadores(localData);
        }
      } else if (Array.isArray(dbData) && dbData.length > 0) {
        const mapped: JugadorBingo[] = dbData.map((item: any) => ({
          id: String(item.id || `jug-${Date.now()}`),
          nombre: (item.nombre || item.name || item.first_name || item.firstName || '').trim() || 'Jugador',
          apellido: (item.apellido || item.last_name || item.lastName || '').trim(),
          cedula: String(item.cedula || item.document_id || item.documentId || '').trim().toUpperCase(),
          correo: String(item.correo || item.email || '').trim().toLowerCase(),
          telefono: String(item.telefono || item.phone || '0412-0000000').trim(),
          fechaNacimiento: String(item.fecha_nacimiento || item.fechaNacimiento || item.birth_date || item.birthDate || '').trim(),
          fechaRegistro:
            item.fecha_registro ||
            item.fechaRegistro ||
            item.created_at ||
            new Date().toLocaleDateString('es-VE', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            }),
          saldo: Number(item.saldo ?? item.available_balance ?? item.balance ?? 0),
        }));
        setJugadores(mapped);
      } else {
        const localData = await getJugadores();
        setJugadores(localData);
      }

      // 2. Cargar recargas desde Supabase (recharges y recargas_pago_movil)
      try {
        const { data: recData } = await supabase
          .from('recharges')
          .select('*')
          .order('created_at', { ascending: false });

        const { data: rpmData } = await supabase
          .from('recargas_pago_movil')
          .select('*')
          .order('created_at', { ascending: false });

        const recMap = new Map<string, RecargaAdminItem>();

        if (Array.isArray(rpmData)) {
          rpmData.forEach((item: any) => {
            const id = String(item.id);
            recMap.set(id, {
              id,
              userId: item.user_id || item.usuario_id || item.userId || '',
              userName: item.usuario_nombre || item.nombre_usuario || item.userName || 'Jugador',
              userPhone: item.telefono || item.telefono_pagador || '',
              amountVes: Number(item.monto_ves ?? item.monto ?? item.amount_ves ?? 0),
              payerPhone: item.telefono_pagador || item.telefono || '',
              payerName: item.pagador_nombre || item.nombre_pagador || '',
              payerDocumentId: item.pagador_ci || item.cedula_pagador || item.cedula || '',
              bankOrigin: item.banco || item.banco_origen || 'Pago Móvil',
              referenceNumber: String(item.referencia || item.reference_number || ''),
              voucherImageUrl: item.comprobante_url || item.voucher_image_url || '',
              status: (item.estado || item.estatus || 'pendiente').toLowerCase(),
              createdAt: item.created_at || item.fecha || new Date().toISOString(),
              processedAt: item.fecha_procesado || item.processed_at || '',
              processedBy: item.procesado_por || item.processed_by || '',
              rejectionReason: item.motivo_rechazo || item.rejection_reason || '',
            });
          });
        }

        if (Array.isArray(recData)) {
          recData.forEach((item: any) => {
            const id = String(item.id);
            const prev = recMap.get(id);
            recMap.set(id, {
              id,
              userId: item.user_id || item.userId || prev?.userId || '',
              userName: item.user_name || item.userName || prev?.userName || 'Jugador',
              userPhone: item.user_phone || item.userPhone || prev?.userPhone || '',
              amountVes: Number(item.amount_ves ?? item.amountVes ?? item.monto_ves ?? prev?.amountVes ?? 0),
              payerPhone: item.payer_phone || item.payerPhone || prev?.payerPhone || '',
              payerName: item.payer_name || item.payerName || prev?.payerName || '',
              payerDocumentId: item.payer_document_id || item.payerDocumentId || prev?.payerDocumentId || '',
              bankOrigin: item.bank_origin || item.bankOrigin || prev?.bankOrigin || 'Pago Móvil',
              referenceNumber: String(item.reference_number || item.referenceNumber || prev?.referenceNumber || ''),
              voucherImageUrl: item.voucher_image_url || item.voucherImageUrl || prev?.voucherImageUrl || '',
              status: (item.status || item.estado || prev?.status || 'pending').toLowerCase(),
              createdAt: item.created_at || prev?.createdAt || new Date().toISOString(),
              processedAt: item.processed_at || prev?.processedAt || '',
              processedBy: item.processed_by || prev?.processedBy || '',
              rejectionReason: item.rejection_reason || prev?.rejectionReason || '',
            });
          });
        }

        setRecargas(Array.from(recMap.values()));
      } catch (recErr) {
        console.warn('[AdminPlayersView] Error al cargar recargas:', recErr);
      }

      // 3. Sincronización secundaria opcional por fetch con validación estricta de JSON
      try {
        const response = await fetch(`/api/players?_nocache=${Date.now()}`);
        if (!response.ok) {
          const errorText = await response.text();
          console.log('[AdminPlayersView] Response error:', errorText);
          throw new Error(`HTTP error ${response.status}: ${errorText}`);
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          const text = await response.text();
          console.log('[AdminPlayersView] Non-JSON response (HTML):', text);
          throw new Error(`Expected JSON but received ${contentType}`);
        }

        const result = await response.json();
        if (result && result.success && Array.isArray(result.data)) {
          for (const serverUser of result.data) {
            const cleanDoc = (serverUser.documentId || serverUser.cedula || '').trim();
            if (cleanDoc) {
              await saveJugador({
                id: serverUser.id,
                nombre: serverUser.name || `${serverUser.firstName || ''} ${serverUser.lastName || ''}`.trim() || 'Jugador',
                apellido: serverUser.lastName || '',
                cedula: cleanDoc,
                correo: serverUser.email || serverUser.correo || '',
                telefono: serverUser.phone || serverUser.telefono || '0412-0000000',
                fechaNacimiento: serverUser.birthDate || serverUser.fechaNacimiento || '',
                fechaRegistro: serverUser.fechaRegistro || new Date(serverUser.createdAt || Date.now()).toLocaleDateString('es-VE', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                }),
                saldo: Number(serverUser.availableBalance ?? serverUser.saldo ?? 0),
              });
            }
          }
          const updated = await getJugadores();
          setJugadores(updated);
        }
      } catch (fetchErr) {
        // Safe catch
      }
    } catch (e) {
      console.warn('[AdminPlayersView] Error en refreshList:', e);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 1. APROBAR RECARGA
   * 1. Cuando estado pasa a APROBADO:
   *    haz `supabase.from('jugadores_bingo').select('saldo').eq('id', jugador_id).single()`
   *    luego `supabase.from('jugadores_bingo').update({ saldo: saldo_actual + monto_recarga }).eq('id', jugador_id)`
   * 3. Después de aprobar, llama a `refreshList()` para que la UI se actualice.
   */
  const aprobarRecarga = async (
    recargaIdOrObj: any,
    maybeJugadorId?: string,
    maybeMonto?: number
  ) => {
    setIsLoading(true);
    setActionFeedback(null);
    try {
      const recargaId = typeof recargaIdOrObj === 'string' ? recargaIdOrObj : recargaIdOrObj?.id;
      let jugador_id =
        maybeJugadorId ||
        (typeof recargaIdOrObj === 'object'
          ? recargaIdOrObj?.userId ||
            recargaIdOrObj?.user_id ||
            recargaIdOrObj?.usuario_id ||
            recargaIdOrObj?.jugador_id ||
            recargaIdOrObj?.jugadorId
          : undefined);

      const monto_recarga = Number(
        maybeMonto ??
          (typeof recargaIdOrObj === 'object'
            ? recargaIdOrObj?.amountVes ??
              recargaIdOrObj?.amount_ves ??
              recargaIdOrObj?.monto ??
              recargaIdOrObj?.monto_ves
            : 0)
      );

      // Si no tenemos jugador_id directo, vincular mediante cédula o correo del pagador
      if (!jugador_id && typeof recargaIdOrObj === 'object') {
        const doc = (
          recargaIdOrObj?.payerDocumentId ||
          recargaIdOrObj?.payer_document_id ||
          recargaIdOrObj?.pagador_ci ||
          recargaIdOrObj?.cedula ||
          ''
        ).trim().toUpperCase();

        const email = (
          recargaIdOrObj?.usuario_email ||
          recargaIdOrObj?.email ||
          recargaIdOrObj?.correo ||
          ''
        ).trim().toLowerCase();

        if (doc) {
          const found = jugadores.find((j) => j.cedula.toUpperCase() === doc);
          if (found) jugador_id = found.id;
        }
        if (!jugador_id && email) {
          const found = jugadores.find((j) => (j.correo || '').toLowerCase() === email);
          if (found) jugador_id = found.id;
        }
      }

      const nowIso = new Date().toISOString();

      // 1. Cuando estado pasa a APROBADO:
      // a) Actualizar estado en tabla 'recharges'
      try {
        await supabase
          .from('recharges')
          .update({
            status: 'approved',
            processed_at: nowIso,
            processed_by: 'Admin',
          })
          .eq('id', recargaId);
      } catch (errRec) {
        console.warn('[AdminPlayersView] recharges update error:', errRec);
      }

      // b) Actualizar estado en tabla 'recargas_pago_movil'
      try {
        await supabase
          .from('recargas_pago_movil')
          .update({
            estado: 'aprobada',
            estatus: 'aprobada',
            fecha_procesado: nowIso,
            procesado_por: 'Admin',
          })
          .eq('id', recargaId);
      } catch (errRpm) {
        console.warn('[AdminPlayersView] recargas_pago_movil update error:', errRpm);
      }

      // c) Cuando estado pasa a APROBADO, haz:
      // supabase.from('jugadores_bingo').select('saldo').eq('id', jugador_id).single()
      // luego supabase.from('jugadores_bingo').update({ saldo: saldo_actual + monto_recarga }).eq('id', jugador_id)
      if (jugador_id) {
        const { data: jugadorData, error: errSelect } = await supabase
          .from('jugadores_bingo')
          .select('saldo')
          .eq('id', jugador_id)
          .single();

        if (errSelect) {
          console.warn('[AdminPlayersView] select saldo jugadores_bingo error:', errSelect);
        }

        const saldo_actual = Number(jugadorData?.saldo || 0);

        const { error: errUpdate } = await supabase
          .from('jugadores_bingo')
          .update({ saldo: saldo_actual + monto_recarga })
          .eq('id', jugador_id);

        if (errUpdate) {
          console.error('[AdminPlayersView] update saldo jugadores_bingo error:', errUpdate);
        }

        // Respaldo en tabla alternativa 'jugadores' y 'users' si aplican
        try {
          await supabase
            .from('jugadores')
            .update({ saldo: saldo_actual + monto_recarga })
            .eq('id', jugador_id);
        } catch {}

        try {
          await supabase
            .from('users')
            .update({ available_balance: saldo_actual + monto_recarga })
            .eq('id', jugador_id);
        } catch {}
      }

      // 3. Después de aprobar, llama a refreshList() para que la UI se actualice
      await refreshList();

      setActionFeedback({
        type: 'success',
        text: `Recarga #${recargaId.slice(-6)} aprobada exitosamente. Se acreditaron ${monto_recarga.toFixed(2)} Bs. al saldo del jugador.`,
      });
      setSelectedRecargaModal(null);
    } catch (e: any) {
      console.error('[AdminPlayersView] Error en aprobarRecarga:', e);
      setActionFeedback({
        type: 'error',
        text: e?.message || 'Error al aprobar recarga.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 2. RECHAZAR RECARGA
   * 2. Asegúrate que `rechazarRecarga` solo cambie estado, no toque saldo.
   * 3. Después de rechazar, llama a `refreshList()` para que la UI se actualice.
   */
  const rechazarRecarga = async (
    recargaIdOrObj: any,
    motivo: string = 'Comprobante no coincide con extracto bancario'
  ) => {
    setIsLoading(true);
    setActionFeedback(null);
    try {
      const recargaId = typeof recargaIdOrObj === 'string' ? recargaIdOrObj : recargaIdOrObj?.id;
      const nowIso = new Date().toISOString();

      // 2. Solo cambia estado, NO toca saldo
      try {
        await supabase
          .from('recharges')
          .update({
            status: 'rejected',
            rejection_reason: motivo,
            processed_at: nowIso,
            processed_by: 'Admin',
          })
          .eq('id', recargaId);
      } catch (errRec) {
        console.warn('[AdminPlayersView] recharges reject error:', errRec);
      }

      try {
        await supabase
          .from('recargas_pago_movil')
          .update({
            estado: 'rechazada',
            estatus: 'rechazada',
            motivo_rechazo: motivo,
            fecha_procesado: nowIso,
            procesado_por: 'Admin',
          })
          .eq('id', recargaId);
      } catch (errRpm) {
        console.warn('[AdminPlayersView] recargas_pago_movil reject error:', errRpm);
      }

      // 3. Después de rechazar, llama a refreshList() para que la UI se actualice
      await refreshList();

      setActionFeedback({
        type: 'success',
        text: `Recarga #${recargaId.slice(-6)} rechazada. El saldo del jugador no fue alterado.`,
      });
      setRejectModalId(null);
      setSelectedRecargaModal(null);
    } catch (e: any) {
      console.error('[AdminPlayersView] Error en rechazarRecarga:', e);
      setActionFeedback({
        type: 'error',
        text: e?.message || 'Error al rechazar recarga.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshList();

    const handleUpdate = async () => {
      const current = await getJugadores();
      setJugadores(current);
    };

    window.addEventListener('jugadores_bingo_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    // Escuchar WebSocket en tiempo real para nuevos registros
    const unsubUser = realtimeService.on('user_registered', async (data: any) => {
      const u = data?.user || data;
      if (u) {
        await saveJugador({
          id: u.id || `usr-${Date.now()}`,
          nombre: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Nuevo Jugador',
          apellido: u.lastName || '',
          cedula: u.documentId || u.cedula || '',
          correo: u.email || u.correo || '',
          telefono: u.phone || u.telefono || '0412-0000000',
          fechaNacimiento: u.birthDate || u.fechaNacimiento || '',
          fechaRegistro: new Date().toLocaleDateString('es-VE', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          }),
          saldo: Number(u.availableBalance ?? u.saldo ?? 0),
        });
        const updated = await getJugadores();
        setJugadores(updated);
      }
    });

    const unsubPlayer = realtimeService.on('player_registered', async (data: any) => {
      const p = data?.player || data;
      if (p) {
        await saveJugador({
          id: p.id || `usr-${Date.now()}`,
          nombre: p.name || p.nombre || 'Nuevo Jugador',
          apellido: p.apellido || p.lastName || '',
          cedula: p.documentId || p.cedula || '',
          correo: p.email || p.correo || '',
          telefono: p.phone || p.telefono || '0412-0000000',
          fechaNacimiento: p.birthDate || p.fechaNacimiento || '',
          fechaRegistro: new Date().toLocaleDateString('es-VE', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          }),
          saldo: Number(p.availableBalance ?? p.saldo ?? 0),
        });
        const updated = await getJugadores();
        setJugadores(updated);
      }
    });

    const unsubPostgres = realtimeService.on('postgres_changes', async (payload: any) => {
      if (
        payload?.table === 'users' ||
        payload?.table === 'jugadores' ||
        payload?.table === 'jugadores_bingo' ||
        payload?.table === 'recharges' ||
        payload?.table === 'recargas_pago_movil'
      ) {
        refreshList();
      }
    });

    return () => {
      window.removeEventListener('jugadores_bingo_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      unsubUser();
      unsubPlayer();
      unsubPostgres();
    };
  }, []);

  const filteredJugadores = useMemo(() => {
    if (!searchTerm.trim()) return jugadores;
    const term = searchTerm.toLowerCase().trim();
    return jugadores.filter(
      (j) =>
        j.nombre.toLowerCase().includes(term) ||
        (j.apellido && j.apellido.toLowerCase().includes(term)) ||
        j.cedula.toLowerCase().includes(term) ||
        (j.correo && j.correo.toLowerCase().includes(term)) ||
        j.telefono.toLowerCase().includes(term)
    );
  }, [jugadores, searchTerm]);

  const pendingRecargasCount = useMemo(() => {
    return recargas.filter((r) => {
      const st = (r.status || '').toLowerCase();
      return st === 'pending' || st === 'pendiente';
    }).length;
  }, [recargas]);

  const filteredRecargas = useMemo(() => {
    return recargas.filter((item) => {
      const st = (item.status || '').toLowerCase();
      const isPending = st === 'pending' || st === 'pendiente';
      const isApproved = st === 'approved' || st === 'aprobada';
      const isRejected = st === 'rejected' || st === 'rechazada';

      const matchesStatus =
        recargaFilterStatus === 'all' ||
        (recargaFilterStatus === 'pending' && isPending) ||
        (recargaFilterStatus === 'approved' && isApproved) ||
        (recargaFilterStatus === 'rejected' && isRejected);

      if (!matchesStatus) return false;

      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase().trim();
      return (
        item.referenceNumber.toLowerCase().includes(term) ||
        item.userName.toLowerCase().includes(term) ||
        item.payerName.toLowerCase().includes(term) ||
        item.payerDocumentId.toLowerCase().includes(term) ||
        item.bankOrigin.toLowerCase().includes(term) ||
        item.payerPhone.toLowerCase().includes(term)
      );
    });
  }, [recargas, recargaFilterStatus, searchTerm]);

  // Mapa de recargas pendientes por jugador (usando user_id, cédula o correo)
  const pendingRecargasByJugador = useMemo(() => {
    const map = new Map<string, RecargaAdminItem[]>();
    recargas.forEach((r) => {
      const st = (r.status || '').toLowerCase();
      if (st === 'pending' || st === 'pendiente') {
        // Vincular por ID
        if (r.userId) {
          const arr = map.get(r.userId) || [];
          arr.push(r);
          map.set(r.userId, arr);
        }
        // Vincular por Cédula
        if (r.payerDocumentId) {
          const docClean = r.payerDocumentId.trim().toUpperCase();
          const arr = map.get(docClean) || [];
          arr.push(r);
          map.set(docClean, arr);
        }
      }
    });
    return map;
  }, [recargas]);

  const totalSaldoEnCirculacion = useMemo(() => {
    return jugadores.reduce((acc, j) => acc + Number(j.saldo || 0), 0);
  }, [jugadores]);

  const handleDelete = async (id: string, nombre: string) => {
    if (window.confirm(`¿Estás seguro de eliminar el registro de ${nombre}?`)) {
      const updated = await deleteJugador(id);
      setJugadores(updated);
    }
  };

  const getInitials = (nombre: string, apellido?: string) => {
    if (apellido && apellido.trim()) {
      return `${nombre.trim().charAt(0)}${apellido.trim().charAt(0)}`.toUpperCase();
    }
    const parts = nombre.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return (parts[0]?.charAt(0) || 'J').toUpperCase();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 py-4">
      {/* Feedback Banner */}
      {actionFeedback && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-bold transition-all shadow-lg ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-950/80 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span>{actionFeedback.text}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="p-1 hover:bg-white/10 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Panel de Administración • Jugadores y Recargas
              </h1>
              <span className="text-[10px] font-mono font-black uppercase bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2.5 py-0.5 rounded-full">
                /admin
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Gestión de jugadores y flujo de aprobación de recargas en <code className="font-mono text-amber-300 bg-slate-800 px-1.5 py-0.5 rounded">Supabase (jugadores_bingo)</code>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={refreshList}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer border border-slate-700 disabled:opacity-50"
            title="Refrescar lista"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>

          {onBackToGame && (
            <button
              onClick={onBackToGame}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
              <span>Volver al Bingo</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Jugadores
            </span>
            <span className="text-2xl font-black text-amber-400 font-mono">
              {jugadores.length}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div
          onClick={() => setActiveTab('recargas')}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:border-amber-500/40 transition-all group"
        >
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Recargas Pendientes
            </span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-emerald-400 font-mono">
                {pendingRecargasCount}
              </span>
              {pendingRecargasCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                  Por Aprobar
                </span>
              )}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Saldo en Circulación
            </span>
            <span className="text-2xl font-black text-indigo-400 font-mono">
              {totalSaldoEnCirculacion.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Wallet className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Selector de Vistas y Búsqueda */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Tab Buttons */}
        <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveTab('jugadores')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'jugadores'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Directorio de Jugadores ({jugadores.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('recargas')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer relative ${
              activeTab === 'recargas'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Auditoría de Recargas</span>
            {pendingRecargasCount > 0 && (
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-black ${
                  activeTab === 'recargas'
                    ? 'bg-slate-950 text-amber-400'
                    : 'bg-amber-500 text-slate-950'
                }`}
              >
                {pendingRecargasCount}
              </span>
            )}
          </button>
        </div>

        {/* Search Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2.5 flex items-center gap-2.5 flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 ml-2 shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              activeTab === 'jugadores'
                ? 'Buscar por Nombre, Cédula o Teléfono...'
                : 'Buscar por Referencia, Pagador, Cédula o Banco...'
            }
            className="w-full bg-transparent border-none text-white text-xs font-medium focus:outline-none placeholder-slate-500 pr-2"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded-lg cursor-pointer"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* VISTA 1: TABLA DE JUGADORES */}
      {/* ======================================================== */}
      {activeTab === 'jugadores' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-white">Tabla de Jugadores</h2>
              <p className="text-xs text-slate-400">
                {filteredJugadores.length} {filteredJugadores.length === 1 ? 'jugador registrado' : 'jugadores registrados'} con balances sincronizados
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-bold uppercase text-[11px] tracking-wider">
                  <th className="py-3.5 px-4 sm:px-6 w-16">Perfil</th>
                  <th className="py-3.5 px-4 sm:px-6">Nombre y Apellido</th>
                  <th className="py-3.5 px-4 sm:px-6">Cédula</th>
                  <th className="py-3.5 px-4 sm:px-6">Teléfono</th>
                  <th className="py-3.5 px-4 sm:px-6">Saldo Disponible</th>
                  <th className="py-3.5 px-4 sm:px-6">Fecha Registro</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right w-24">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-medium">
                {filteredJugadores.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Users className="w-8 h-8 text-slate-600" />
                        <p className="text-sm font-bold text-slate-300">
                          {searchTerm ? 'No se encontraron jugadores que coincidan con la búsqueda' : 'No hay jugadores registrados aún'}
                        </p>
                        <p className="text-xs text-slate-500">
                          Los nuevos jugadores que se registren aparecerán aquí de forma inmediata.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredJugadores.map((jugador) => {
                    const pendingForPlayer =
                      pendingRecargasByJugador.get(jugador.id) ||
                      pendingRecargasByJugador.get(jugador.cedula.toUpperCase()) ||
                      [];

                    return (
                      <tr
                        key={jugador.id}
                        className="hover:bg-slate-800/50 transition-colors group"
                      >
                        {/* 1. Círculo con Iniciales */}
                        <td className="py-3 px-4 sm:px-6">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center shadow-md shadow-amber-500/20 select-none border border-amber-300/40">
                            {getInitials(jugador.nombre, jugador.apellido)}
                          </div>
                        </td>

                        {/* 2. Nombre */}
                        <td className="py-3 px-4 sm:px-6">
                          <div className="font-bold text-white text-sm">
                            {jugador.nombre} {jugador.apellido ? jugador.apellido : ''}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 flex items-center gap-2">
                            <span>ID: {jugador.id}</span>
                            {jugador.correo && (
                              <span className="text-slate-400">• {jugador.correo}</span>
                            )}
                          </div>
                        </td>

                        {/* 3. Cédula */}
                        <td className="py-3 px-4 sm:px-6">
                          <span className="font-mono font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                            {jugador.cedula}
                          </span>
                        </td>

                        {/* 4. Teléfono */}
                        <td className="py-3 px-4 sm:px-6">
                          <div className="font-mono text-slate-300 flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-500" />
                            <span>{jugador.telefono || 'Sin teléfono'}</span>
                          </div>
                        </td>

                        {/* 5. Saldo Disponible en Supabase (jugadores_bingo) */}
                        <td className="py-3 px-4 sm:px-6">
                          <div className="flex flex-col items-start gap-1">
                            <span className="font-mono font-black text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                              {(Number(jugador.saldo) || 0).toLocaleString('es-VE', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{' '}
                              Bs.
                            </span>

                            {pendingForPlayer.length > 0 && (
                              <button
                                onClick={() => {
                                  setSelectedRecargaModal(pendingForPlayer[0]);
                                }}
                                className="text-[10px] font-bold text-amber-300 bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded-full flex items-center gap-1 hover:bg-amber-500/30 transition-all cursor-pointer animate-pulse"
                              >
                                <span>⚠️ {pendingForPlayer.length} recarga pendiente</span>
                              </button>
                            )}
                          </div>
                        </td>

                        {/* 6. Fecha */}
                        <td className="py-3 px-4 sm:px-6">
                          <div className="text-slate-300 font-mono text-xs flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            <span>{jugador.fechaRegistro || 'Hoy'}</span>
                          </div>
                        </td>

                        {/* 7. Acciones */}
                        <td className="py-3 px-4 sm:px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {pendingForPlayer.length > 0 && (
                              <button
                                onClick={() =>
                                  aprobarRecarga(
                                    pendingForPlayer[0].id,
                                    jugador.id,
                                    pendingForPlayer[0].amountVes
                                  )
                                }
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[10px] font-black transition-all cursor-pointer"
                                title="Aprobar recarga pendiente"
                              >
                                Aprobar (+{pendingForPlayer[0].amountVes} Bs.)
                              </button>
                            )}

                            <button
                              onClick={() => handleDelete(jugador.id, jugador.nombre)}
                              className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-900 transition-all cursor-pointer"
                              title="Eliminar de la lista"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VISTA 2: AUDITORÍA DE RECARGAS PAGO MÓVIL */}
      {/* ======================================================== */}
      {activeTab === 'recargas' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl space-y-4">
          <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-white">Cola de Recargas Pago Móvil</h2>
              <p className="text-xs text-slate-400">
                Audita y confirma comprobantes bancarios. Al aprobar, el saldo se acredita inmediatamente a <code className="font-mono text-amber-300">jugadores_bingo</code>.
              </p>
            </div>

            {/* Filter chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setRecargaFilterStatus('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  recargaFilterStatus === 'all'
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Todas ({recargas.length})
              </button>
              <button
                onClick={() => setRecargaFilterStatus('pending')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  recargaFilterStatus === 'pending'
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Pendientes ({pendingRecargasCount})
              </button>
              <button
                onClick={() => setRecargaFilterStatus('approved')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  recargaFilterStatus === 'approved'
                    ? 'bg-emerald-500 text-slate-950 font-black'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Aprobadas
              </button>
              <button
                onClick={() => setRecargaFilterStatus('rejected')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  recargaFilterStatus === 'rejected'
                    ? 'bg-rose-500 text-slate-950 font-black'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Rechazadas
              </button>
            </div>
          </div>

          <div className="overflow-x-auto px-4 sm:px-6 pb-6">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-3">Referencia & Banco</th>
                  <th className="py-3 px-3">Monto (Bs.)</th>
                  <th className="py-3 px-3">Pagador / Cédula</th>
                  <th className="py-3 px-3">Jugador Asociado</th>
                  <th className="py-3 px-3">Comprobante</th>
                  <th className="py-3 px-3">Estado</th>
                  <th className="py-3 px-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-medium">
                {filteredRecargas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <CreditCard className="w-8 h-8 text-slate-600" />
                        <p className="text-sm font-bold text-slate-300">
                          No hay recargas en esta vista
                        </p>
                        <p className="text-xs text-slate-500">
                          Las solicitudes de recarga por Pago Móvil se reflejarán aquí en tiempo real.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRecargas.map((r) => {
                    const st = (r.status || '').toLowerCase();
                    const isPending = st === 'pending' || st === 'pendiente';
                    const isApproved = st === 'approved' || st === 'aprobada';
                    const isRejected = st === 'rejected' || st === 'rechazada';

                    return (
                      <tr key={r.id} className="hover:bg-slate-800/50 transition-colors">
                        {/* 1. Referencia & Banco */}
                        <td className="py-3.5 px-3">
                          <div className="font-mono font-bold text-amber-300 text-sm">
                            Ref: {r.referenceNumber || 'S/R'}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <span>{r.bankOrigin || 'Pago Móvil'}</span>
                            <span className="text-slate-600">•</span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {new Date(r.createdAt).toLocaleDateString('es-VE', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </td>

                        {/* 2. Monto */}
                        <td className="py-3.5 px-3">
                          <span className="font-mono font-black text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                            {r.amountVes.toLocaleString('es-VE', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{' '}
                            Bs.
                          </span>
                        </td>

                        {/* 3. Pagador */}
                        <td className="py-3.5 px-3">
                          <div className="font-bold text-white text-xs">
                            {r.payerName || 'Pagador Registrado'}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5 flex items-center gap-2">
                            {r.payerDocumentId && <span>CI: {r.payerDocumentId}</span>}
                            {r.payerPhone && <span>Tlf: {r.payerPhone}</span>}
                          </div>
                        </td>

                        {/* 4. Jugador */}
                        <td className="py-3.5 px-3">
                          <div className="text-xs text-slate-200 font-medium">
                            {r.userName || 'Usuario'}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500">
                            ID: {r.userId ? r.userId.slice(0, 16) : 'Auto-match'}
                          </div>
                        </td>

                        {/* 5. Comprobante */}
                        <td className="py-3.5 px-3">
                          {r.voucherImageUrl ? (
                            <button
                              onClick={() => setSelectedVoucherModal(r.voucherImageUrl)}
                              className="flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Ver Capture</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-500 font-mono">
                              Sin capture
                            </span>
                          )}
                        </td>

                        {/* 6. Estado */}
                        <td className="py-3.5 px-3">
                          {isPending && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              <Clock className="w-3 h-3 text-amber-400 animate-spin" />
                              <span>Pendiente</span>
                            </span>
                          )}
                          {isApproved && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>Aprobado</span>
                            </span>
                          )}
                          {isRejected && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              <XCircle className="w-3 h-3 text-rose-400" />
                              <span>Rechazado</span>
                            </span>
                          )}
                        </td>

                        {/* 7. Acciones */}
                        <td className="py-3.5 px-3 text-right">
                          {isPending ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => aprobarRecarga(r)}
                                disabled={isLoading}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Aprobar</span>
                              </button>

                              <button
                                onClick={() => {
                                  setRejectModalId(r.id);
                                  setRejectReason('Comprobante no coincide con extracto bancario');
                                }}
                                disabled={isLoading}
                                className="px-2.5 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs font-bold transition-all cursor-pointer"
                              >
                                Rechazar
                              </button>
                            </div>
                          ) : (
                            <div className="text-[10px] font-mono text-slate-500 text-right">
                              {r.processedBy && <div>Por: {r.processedBy}</div>}
                              {r.rejectionReason && (
                                <div className="text-rose-400 max-w-[140px] truncate" title={r.rejectionReason}>
                                  {r.rejectionReason}
                                </div>
                              )}
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
        </div>
      )}

      {/* MODAL: VER COMPROBANTE */}
      {selectedVoucherModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedVoucherModal(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-3xl p-4 max-w-lg w-full max-h-[90vh] flex flex-col items-center gap-4 relative shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-amber-400" />
                <span>Comprobante de Pago Móvil</span>
              </h3>
              <button
                onClick={() => setSelectedVoucherModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="w-full flex items-center justify-center overflow-auto rounded-2xl bg-black/50 p-2">
              <img
                src={selectedVoucherModal}
                alt="Comprobante de recarga"
                className="max-h-[60vh] max-w-full object-contain rounded-xl"
              />
            </div>

            <button
              onClick={() => setSelectedVoucherModal(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all cursor-pointer"
            >
              Cerrar Vista Previa
            </button>
          </div>
        </div>
      )}

      {/* MODAL: MOTIVO DE RECHAZO */}
      {rejectModalId && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setRejectModalId(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full flex flex-col gap-4 relative shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Rechazar Recarga</h3>
                <p className="text-xs text-slate-400">
                  El estatus pasará a Rechazado. No se modificará el saldo del jugador.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">
                Motivo del Rechazo:
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-xl p-3 text-xs text-white focus:outline-none placeholder-slate-600"
                placeholder="Indica el motivo..."
              />
            </div>

            <div className="flex items-center gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setRejectModalId(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => rechazarRecarga(rejectModalId, rejectReason)}
                disabled={isLoading}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-lg shadow-rose-600/20 active:scale-95 cursor-pointer"
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

export default AdminPlayersView;
