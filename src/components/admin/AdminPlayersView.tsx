import React, { useState, useEffect, useMemo } from 'react';
import { getJugadores, JugadorBingo, deleteJugador, saveJugador } from '../../services/playerStorage';
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
} from 'lucide-react';

interface AdminPlayersViewProps {
  onBackToGame?: () => void;
}

export const AdminPlayersView: React.FC<AdminPlayersViewProps> = ({ onBackToGame }) => {
  const [jugadores, setJugadores] = useState<JugadorBingo[]>(() => getJugadores());
  const [searchTerm, setSearchTerm] = useState('');

  // Recarga en tiempo real cuando se registra un nuevo jugador
  const refreshList = async () => {
    setJugadores(getJugadores());

    // También consultar la API en segundo plano para sincronización entre dispositivos
    try {
      const res = await fetch(`/api/players?_nocache=${Date.now()}`);
      if (res.ok) {
        const result = await res.json();
        if (result && result.success && Array.isArray(result.data)) {
          result.data.forEach((serverUser: any) => {
            const cleanDoc = (serverUser.documentId || serverUser.cedula || '').trim();
            if (cleanDoc) {
              saveJugador({
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
              });
            }
          });
          setJugadores(getJugadores());
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    refreshList();

    const handleUpdate = () => {
      setJugadores(getJugadores());
    };

    window.addEventListener('jugadores_bingo_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    // Escuchar WebSocket en tiempo real para nuevos registros
    const unsubUser = realtimeService.on('user_registered', (data: any) => {
      const u = data?.user || data;
      if (u) {
        saveJugador({
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
        });
        setJugadores(getJugadores());
      }
    });

    const unsubPlayer = realtimeService.on('player_registered', (data: any) => {
      const p = data?.player || data;
      if (p) {
        saveJugador({
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
        });
        setJugadores(getJugadores());
      }
    });

    const unsubPostgres = realtimeService.on('postgres_changes', (payload: any) => {
      if (payload?.table === 'users' || payload?.table === 'jugadores') {
        const rec = payload?.new || payload?.record;
        if (rec) {
          saveJugador({
            id: rec.id || `usr-${Date.now()}`,
            nombre: rec.name || rec.nombre || 'Nuevo Jugador',
            apellido: rec.apellido || rec.lastName || '',
            cedula: rec.documentId || rec.cedula || '',
            correo: rec.email || rec.correo || '',
            telefono: rec.phone || rec.telefono || '0412-0000000',
            fechaNacimiento: rec.birthDate || rec.fechaNacimiento || '',
            fechaRegistro: new Date().toLocaleDateString('es-VE', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            }),
          });
          setJugadores(getJugadores());
        }
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

  const handleDelete = (id: string, nombre: string) => {
    if (window.confirm(`¿Estás seguro de eliminar el registro de ${nombre}?`)) {
      const updated = deleteJugador(id);
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
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Panel de Administración • Jugadores Registrados
              </h1>
              <span className="text-[10px] font-mono font-black uppercase bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2.5 py-0.5 rounded-full">
                /admin
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Listado oficial persistido en <code className="font-mono text-amber-300 bg-slate-800 px-1.5 py-0.5 rounded">localStorage['jugadores_bingo']</code>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={refreshList}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer border border-slate-700"
            title="Refrescar lista"
          >
            <RefreshCw className="w-3.5 h-3.5" />
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

      {/* Stats and Search bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

        {/* Search Bar (Spans 2 columns on md) */}
        <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-2.5 flex items-center gap-2.5">
          <Search className="w-4 h-4 text-slate-400 ml-2 shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por Nombre, Cédula o Teléfono..."
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

      {/* Main Table: Iniciales | Nombre | Cédula | Teléfono | Fecha */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-white">Tabla de Jugadores</h2>
            <p className="text-xs text-slate-400">
              {filteredJugadores.length} {filteredJugadores.length === 1 ? 'jugador encontrado' : 'jugadores encontrados'}
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
                <th className="py-3.5 px-4 sm:px-6">Fecha Registro</th>
                <th className="py-3.5 px-4 sm:px-6 text-right w-16">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-medium">
              {filteredJugadores.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
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
                filteredJugadores.map((jugador) => (
                  <tr
                    key={jugador.id}
                    className="hover:bg-slate-800/50 transition-colors group"
                  >
                    {/* 1. Círculo con Iniciales (Sin <img>) */}
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

                    {/* 5. Fecha */}
                    <td className="py-3 px-4 sm:px-6">
                      <div className="text-slate-300 font-mono text-xs flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>{jugador.fechaRegistro || 'Hoy'}</span>
                      </div>
                    </td>

                    {/* Acciones */}
                    <td className="py-3 px-4 sm:px-6 text-right">
                      <button
                        onClick={() => handleDelete(jugador.id, jugador.nombre)}
                        className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-900 transition-all cursor-pointer"
                        title="Eliminar de la lista"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

