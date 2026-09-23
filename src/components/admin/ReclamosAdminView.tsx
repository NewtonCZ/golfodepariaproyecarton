import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../services/supabaseClient';
import { useGame } from '../../context/GameContext';
import { ROLE_PERMISSIONS } from '../../config/permissions';
import {
  MessageSquare,
  Search,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  RefreshCw,
  X,
  User,
  Mail,
  Phone,
  Calendar,
  Lock,
  Send,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Filter,
  Inbox,
} from 'lucide-react';

interface Reclamo {
  id: string;
  user_id: string | null;
  user_name: string | null;
  user_email: string | null;
  user_phone: string | null;
  subject: string | null;
  description: string | null;
  category: string | null;
  priority: string | null;
  status: string | null;
  image_url: string | null;
  image_name: string | null;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  admin_response: string | null;
  closed_at: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  open: { label: 'Abierto', color: 'bg-amber-100 text-amber-800 border-amber-300', icon: Clock },
  in_review: { label: 'En Revisión', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: Eye },
  resolved: { label: 'Resuelto', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: CheckCircle2 },
  closed: { label: 'Cerrado', color: 'bg-slate-200 text-slate-700 border-slate-300', icon: Lock },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: 'Baja', color: 'bg-slate-100 text-slate-600 border-slate-300' },
  normal: { label: 'Normal', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  high: { label: 'Alta', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  urgent: { label: 'Urgente', color: 'bg-rose-100 text-rose-800 border-rose-300' },
};

export const ReclamosAdminView: React.FC = () => {
  const { operatorRole, loggedUsername, activeCredential } = useGame();

  const roleConfig = ROLE_PERMISSIONS[operatorRole] || ROLE_PERMISSIONS['Auditor'];
  const canManage = roleConfig.canManageReclamos;
  const isReadOnly = roleConfig.isReadOnly;

  const [reclamos, setReclamos] = useState<Reclamo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Formulario de respuesta
  const [responseDrafts, setResponseDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ============================
  // CARGAR RECLAMOS
  // ============================
  const fetchReclamos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: sbError } = await supabase
        .from('reclamos')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (sbError) {
        console.warn('[ReclamosAdminView] Error:', sbError);
        setError(sbError.message || 'Error al cargar reclamos');
        return;
      }

      setReclamos((data as Reclamo[]) || []);
    } catch (err: any) {
      setError(err?.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReclamos();
  }, [fetchReclamos]);

  // ============================
  // ACTUALIZAR RECLAMO
  // ============================
  const updateReclamo = useCallback(
    async (id: string, updates: Partial<Reclamo>) => {
      if (!canManage) {
        setFeedback({ type: 'error', text: 'No tienes permisos para modificar reclamos.' });
        return false;
      }

      setSavingId(id);
      setFeedback(null);
      try {
        const { error: sbError } = await supabase
          .from('reclamos')
          .update(updates)
          .eq('id', id);

        if (sbError) {
          setFeedback({ type: 'error', text: sbError.message || 'Error al actualizar' });
          return false;
        }

        setReclamos((prev) =>
          prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
        );
        return true;
      } catch (err: any) {
        setFeedback({ type: 'error', text: err?.message || 'Error de conexión' });
        return false;
      } finally {
        setSavingId(null);
      }
    },
    [canManage]
  );

  const handleRespond = useCallback(
    async (reclamo: Reclamo) => {
      const draft = (responseDrafts[reclamo.id] || '').trim();
      if (!draft) {
        setFeedback({ type: 'error', text: 'Escribe una respuesta antes de guardar.' });
        return;
      }

      const adminName = activeCredential?.displayName || loggedUsername || operatorRole;
      const success = await updateReclamo(reclamo.id, {
        admin_response: draft,
        status: reclamo.status === 'open' ? 'in_review' : reclamo.status,
        resolved_by: (activeCredential as any)?.id || null,
      });

      if (success) {
        setFeedback({ type: 'success', text: `Respuesta guardada por ${adminName}.` });
        setResponseDrafts((prev) => ({ ...prev, [reclamo.id]: '' }));
        setTimeout(() => setFeedback(null), 3000);
      }
    },
    [responseDrafts, activeCredential, loggedUsername, operatorRole, updateReclamo]
  );

  const handleChangeStatus = useCallback(
    async (reclamo: Reclamo, newStatus: string) => {
      const updates: Partial<Reclamo> = { status: newStatus };

      if (newStatus === 'resolved') {
        updates.resolved_at = new Date().toISOString();
        updates.resolved_by = (activeCredential as any)?.id || null;
      }
      if (newStatus === 'closed') {
        updates.closed_at = new Date().toISOString();
        if (!reclamo.resolved_at) {
          updates.resolved_at = new Date().toISOString();
          updates.resolved_by = (activeCredential as any)?.id || null;
        }
      }

      const success = await updateReclamo(reclamo.id, updates);
      if (success) {
        setFeedback({ type: 'success', text: `Estado cambiado a "${STATUS_CONFIG[newStatus]?.label || newStatus}".` });
        setTimeout(() => setFeedback(null), 3000);
      }
    },
    [activeCredential, updateReclamo]
  );

  // ============================
  // KPIs
  // ============================
  const stats = useMemo(() => {
    return {
      total: reclamos.length,
      open: reclamos.filter((r) => r.status === 'open').length,
      in_review: reclamos.filter((r) => r.status === 'in_review').length,
      resolved: reclamos.filter((r) => r.status === 'resolved').length,
      closed: reclamos.filter((r) => r.status === 'closed').length,
    };
  }, [reclamos]);

  // ============================
  // FILTRADO
  // ============================
  const filteredReclamos = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return reclamos.filter((r) => {
      const matchesSearch =
        !term ||
        (r.subject || '').toLowerCase().includes(term) ||
        (r.description || '').toLowerCase().includes(term) ||
        (r.user_email || '').toLowerCase().includes(term) ||
        (r.user_name || '').toLowerCase().includes(term);

      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || r.category === categoryFilter;
      const matchesPriority = priorityFilter === 'all' || r.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesCategory && matchesPriority;
    });
  }, [reclamos, searchTerm, statusFilter, categoryFilter, priorityFilter]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    reclamos.forEach((r) => r.category && set.add(r.category));
    return Array.from(set);
  }, [reclamos]);

  // ============================
  // RENDER
  // ============================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-950 via-purple-950 to-slate-900 rounded-3xl p-5 sm:p-6 text-white shadow-xl border border-indigo-800/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-purple-300 font-black text-xs uppercase tracking-wider mb-1">
            <MessageSquare className="w-4 h-4" />
            <span>Atención al Cliente</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            Gestión de Reclamos y Soporte
          </h2>
          <p className="text-xs text-indigo-200 mt-1 max-w-xl">
            {isReadOnly
              ? 'Modo solo lectura — Puedes ver todos los reclamos pero no modificarlos.'
              : 'Responde, da seguimiento y cierra los reclamos enviados por los usuarios.'}
          </p>
        </div>

        <button
          onClick={fetchReclamos}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs rounded-2xl transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Cargando...' : 'Actualizar'}</span>
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Total</span>
          <span className="text-2xl font-black text-slate-900">{stats.total}</span>
        </div>
        <div className="bg-amber-50 rounded-2xl p-4 shadow-sm border border-amber-200">
          <span className="text-[10px] font-extrabold uppercase text-amber-700 block">Abiertos</span>
          <span className="text-2xl font-black text-amber-900">{stats.open}</span>
        </div>
        <div className="bg-blue-50 rounded-2xl p-4 shadow-sm border border-blue-200">
          <span className="text-[10px] font-extrabold uppercase text-blue-700 block">En Revisión</span>
          <span className="text-2xl font-black text-blue-900">{stats.in_review}</span>
        </div>
        <div className="bg-emerald-50 rounded-2xl p-4 shadow-sm border border-emerald-200">
          <span className="text-[10px] font-extrabold uppercase text-emerald-700 block">Resueltos</span>
          <span className="text-2xl font-black text-emerald-900">{stats.resolved}</span>
        </div>
        <div className="bg-slate-100 rounded-2xl p-4 shadow-sm border border-slate-300">
          <span className="text-[10px] font-extrabold uppercase text-slate-600 block">Cerrados</span>
          <span className="text-2xl font-black text-slate-800">{stats.closed}</span>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 border animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : 'bg-rose-50 text-rose-900 border-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedback.text}</span>
          <button
            onClick={() => setFeedback(null)}
            className="ml-auto text-current opacity-60 hover:opacity-100"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por asunto, email, nombre o descripción..."
            className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 pl-10 pr-4 py-2 rounded-xl text-xs font-medium text-slate-900 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-500 uppercase">Estado:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-2.5 py-1.5 focus:outline-none"
            >
              <option value="all">Todos</option>
              <option value="open">Abiertos</option>
              <option value="in_review">En Revisión</option>
              <option value="resolved">Resueltos</option>
              <option value="closed">Cerrados</option>
            </select>
          </div>

          {categories.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Categoría:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-2.5 py-1.5 focus:outline-none"
              >
                <option value="all">Todas</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase">Prioridad:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-2.5 py-1.5 focus:outline-none"
            >
              <option value="all">Todas</option>
              <option value="low">Baja</option>
              <option value="normal">Normal</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </select>
          </div>

          <span className="ml-auto text-[11px] font-bold text-slate-500">
            {filteredReclamos.length} de {reclamos.length}
          </span>
        </div>
      </div>

      {/* Lista de reclamos */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 text-rose-900 text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {loading && reclamos.length === 0 && (
        <div className="bg-white rounded-2xl p-10 text-center text-slate-400 border border-slate-200">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
          <p className="text-xs font-bold">Cargando reclamos...</p>
        </div>
      )}

      {!loading && filteredReclamos.length === 0 && (
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-200">
          <Inbox className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-600">No hay reclamos en esta vista</p>
          <p className="text-xs text-slate-400 mt-1">
            {reclamos.length === 0
              ? 'Aún no se han recibido reclamos.'
              : 'Ajusta los filtros para ver más resultados.'}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {filteredReclamos.map((reclamo) => {
          const isExpanded = expandedId === reclamo.id;
          const statusCfg = STATUS_CONFIG[reclamo.status || 'open'] || STATUS_CONFIG.open;
          const priorityCfg = PRIORITY_CONFIG[reclamo.priority || 'normal'] || PRIORITY_CONFIG.normal;
          const StatusIcon = statusCfg.icon;

          return (
            <div
              key={reclamo.id}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-all hover:shadow-md"
            >
              {/* Fila resumen */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : reclamo.id)}
                className="w-full p-4 text-left flex items-center gap-3 hover:bg-slate-50 transition-colors"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${statusCfg.color}`}>
                  <StatusIcon className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-slate-900 text-sm truncate">
                      {reclamo.subject || 'Sin asunto'}
                    </h3>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${priorityCfg.color}`}>
                      {priorityCfg.label}
                    </span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${statusCfg.color}`}>
                      {statusCfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                    <span className="flex items-center gap-1 truncate">
                      <User className="w-3 h-3" />
                      {reclamo.user_name || 'Anónimo'}
                    </span>
                    <span className="flex items-center gap-1 truncate hidden sm:flex">
                      <Mail className="w-3 h-3" />
                      {reclamo.user_email || '—'}
                    </span>
                    <span className="flex items-center gap-1 shrink-0">
                      <Calendar className="w-3 h-3" />
                      {reclamo.created_at
                        ? new Date(reclamo.created_at).toLocaleString('es-VE', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 text-slate-400">
                  {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </button>

              {/* Detalle expandido */}
              {isExpanded && (
                <div className="border-t border-slate-100 p-4 sm:p-5 space-y-4 bg-slate-50/50 animate-in fade-in">
                  {/* Info del usuario */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Usuario</span>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {reclamo.user_name || 'Anónimo'}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-600 mt-1">
                        <Mail className="w-3 h-3 text-slate-400" />
                        {reclamo.user_email || '—'}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-600 mt-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {reclamo.user_phone || '—'}
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Clasificación</span>
                      <div className="text-xs font-bold text-slate-800">
                        Categoría: <span className="text-indigo-700">{reclamo.category || 'Sin categoría'}</span>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-1">
                        Prioridad: <span className="font-bold">{priorityCfg.label}</span>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-1">
                        ID: <code className="font-mono text-[10px] text-slate-500">{reclamo.id.slice(0, 12)}...</code>
                      </div>
                    </div>
                  </div>

                  {/* Descripción */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Descripción</span>
                    <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {reclamo.description || '—'}
                    </p>
                  </div>

                  {/* Imagen adjunta */}
                  {reclamo.image_url && (
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-2 flex items-center gap-1.5">
                        <ImageIcon className="w-3 h-3" />
                        Imagen adjunta
                      </span>
                      <a
                        href={reclamo.image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full max-w-xs"
                      >
                        <img
                          src={reclamo.image_url}
                          alt={reclamo.image_name || 'Adjunto'}
                          className="w-full h-auto max-h-64 object-contain rounded-xl border border-slate-200 hover:opacity-90 transition-opacity"
                        />
                      </a>
                    </div>
                  )}

                  {/* Respuesta admin existente */}
                  {reclamo.admin_response && (
                    <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase block mb-1.5">
                        Respuesta enviada
                      </span>
                      <p className="text-xs text-emerald-900 whitespace-pre-wrap leading-relaxed">
                        {reclamo.admin_response}
                      </p>
                      {reclamo.resolved_at && (
                        <p className="text-[10px] text-emerald-700 mt-2 font-mono">
                          Resuelto: {new Date(reclamo.resolved_at).toLocaleString('es-VE')}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Acciones de gestión (solo si tiene permisos) */}
                  {canManage ? (
                    <div className="space-y-3 pt-2 border-t border-slate-200">
                      {/* Selector de estado */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Cambiar estado:</span>
                        {(['open', 'in_review', 'resolved', 'closed'] as const).map((st) => {
                          const isActive = reclamo.status === st;
                          const cfg = STATUS_CONFIG[st];
                          return (
                            <button
                              key={st}
                              onClick={() => handleChangeStatus(reclamo, st)}
                              disabled={isActive || savingId === reclamo.id}
                              className={`px-3 py-1.5 rounded-xl text-[11px] font-black border transition-all ${
                                isActive
                                  ? `${cfg.color} cursor-default`
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100 disabled:opacity-50'
                              }`}
                            >
                              {cfg.label}
                            </button>
                          );
                        })}
                      </div>

                      {/* Textarea de respuesta */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">
                          {reclamo.admin_response ? 'Agregar nueva respuesta' : 'Responder al usuario'}
                        </label>
                        <textarea
                          value={responseDrafts[reclamo.id] || ''}
                          onChange={(e) =>
                            setResponseDrafts((prev) => ({ ...prev, [reclamo.id]: e.target.value }))
                          }
                          placeholder="Escribe tu respuesta al usuario..."
                          rows={3}
                          className="w-full bg-white border border-slate-200 focus:border-indigo-500 rounded-xl p-3 text-xs text-slate-900 focus:outline-none resize-y"
                        />
                        <div className="flex justify-end mt-2">
                          <button
                            onClick={() => handleRespond(reclamo)}
                            disabled={savingId === reclamo.id || !(responseDrafts[reclamo.id] || '').trim()}
                            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {savingId === reclamo.id ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                Guardando...
                              </>
                            ) : (
                              <>
                                <Send className="w-3.5 h-3.5" />
                                Guardar Respuesta
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 flex items-center gap-2 text-[11px] text-slate-600 font-bold">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      Modo solo lectura — No puedes modificar reclamos.
                    </div>
                  )}

                  {/* Fechas */}
                  <div className="text-[10px] text-slate-400 font-mono flex flex-wrap gap-3 pt-2 border-t border-slate-200">
                    <span>Creado: {new Date(reclamo.created_at).toLocaleString('es-VE')}</span>
                    {reclamo.resolved_at && (
                      <span>Resuelto: {new Date(reclamo.resolved_at).toLocaleString('es-VE')}</span>
                    )}
                    {reclamo.closed_at && (
                      <span>Cerrado: {new Date(reclamo.closed_at).toLocaleString('es-VE')}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
