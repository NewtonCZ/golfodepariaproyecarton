import React, { useState } from 'react';
import {
  useGame,
  SystemCredential,
  validatePasswordComplexity,
  UserRole,
} from '../../context/GameContext';
import {
  UserCheck,
  UserPlus,
  ShieldAlert,
  ShieldCheck,
  Lock,
  User,
  KeyRound,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  Crown,
  Shield,
  Wallet,
  FileCheck2,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react';

export const OperatorManagementView: React.FC = () => {
  const {
    systemCredentials,
    createSystemCredential,
    updateSystemCredential,
    deleteSystemCredential,
    operatorRole,
  } = useGame();

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemCredential | null>(null);
  const [deletingUser, setDeletingUser] = useState<SystemCredential | null>(null);

  // Form States
  const [formDisplayName, setFormDisplayName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formRole, setFormRole] = useState<'Super Admin' | 'Operador Financiero' | 'Auditor'>('Super Admin');
  const [formPassword, setFormPassword] = useState('');
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filtered operators list
  const filteredCredentials = systemCredentials.filter((cred) => {
    const matchesSearch =
      cred.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cred.displayName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || cred.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // KPI Calculations
  const totalOperators = systemCredentials.length;
  const activeOperators = systemCredentials.filter((c) => c.status === 'active').length;
  const superAdminCount = systemCredentials.filter((c) => c.role === 'Super Admin').length;
  const financialOpCount = systemCredentials.filter((c) => c.role === 'Operador Financiero').length;
  const auditorCount = systemCredentials.filter((c) => c.role === 'Auditor').length;

  const openCreateModal = () => {
    setEditingUser(null);
    setFormDisplayName('');
    setFormUsername('');
    setFormRole('Super Admin');
    setFormPassword('');
    setShowFormPassword(false);
    setFormStatus('active');
    setFeedback(null);
    setIsCreateModalOpen(true);
  };

  const openEditModal = (user: SystemCredential) => {
    if (user.role === 'Super Admin' && operatorRole !== 'Super Admin') {
      alert('Protección de Privilegios: Solo un Super Admin puede modificar una cuenta con rol Super Admin.');
      return;
    }
    setEditingUser(user);
    setFormDisplayName(user.displayName);
    setFormUsername(user.username);
    setFormRole(user.role);
    setFormPassword(''); // Empty by default unless changing
    setShowFormPassword(false);
    setFormStatus(user.status);
    setFeedback(null);
    setIsCreateModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (formRole === 'Super Admin' && operatorRole !== 'Super Admin') {
      setFeedback({ type: 'error', message: 'Acceso Denegado: Solo un Super Admin puede asignar o otorgar el rol de Super Admin.' });
      return;
    }

    if ((!editingUser || formPassword.trim().length > 0) && operatorRole !== 'Super Admin') {
      setFeedback({
        type: 'error',
        message: 'Acceso Denegado: Solo el Super Admin tiene la facultad exclusiva de asignar o cambiar contraseñas en el sistema.',
      });
      return;
    }

    if (editingUser) {
      // Edit mode
      const result = await updateSystemCredential(editingUser.id, {
        displayName: formDisplayName,
        username: formUsername,
        role: formRole,
        password: formPassword.trim().length > 0 ? formPassword : undefined,
        status: formStatus,
      });

      if (result.success) {
        setFeedback({ type: 'success', message: result.message });
        setTimeout(() => {
          setIsCreateModalOpen(false);
          setFeedback(null);
        }, 1200);
      } else {
        setFeedback({ type: 'error', message: result.message });
      }
    } else {
      // Create mode
      const result = await createSystemCredential({
        displayName: formDisplayName,
        username: formUsername,
        role: formRole,
        password: formPassword,
      });

      if (result.success) {
        setFeedback({ type: 'success', message: result.message });
        setTimeout(() => {
          setIsCreateModalOpen(false);
          setFeedback(null);
        }, 1200);
      } else {
        setFeedback({ type: 'error', message: result.message });
      }
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setFeedback(null);

    if (deletingUser.role === 'Super Admin' && operatorRole !== 'Super Admin') {
      alert('Protección de Privilegios: Solo un Super Admin puede eliminar cuentas con rol Super Admin.');
      setDeletingUser(null);
      return;
    }

    const result = await deleteSystemCredential(deletingUser.id);
    if (result.success) {
      setDeletingUser(null);
    } else {
      alert(result.message);
    }
  };

  // Password Requirement Indicators
  const pwdLength = formPassword.length >= 8;
  const pwdUpper = /[A-Z]/.test(formPassword);
  const pwdLower = /[a-z]/.test(formPassword);
  const pwdNumber = /[0-9]/.test(formPassword);
  const pwdSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formPassword);

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'Super Admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/40 text-amber-700">
            <Crown className="w-3.5 h-3.5 text-amber-600" />
            <span>Super Administrador</span>
          </span>
        );
      case 'Operador Financiero':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 border border-emerald-200 text-emerald-800">
            <Wallet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Operador Financiero</span>
          </span>
        );
      case 'Auditor':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-cyan-100 border border-cyan-200 text-cyan-800">
            <FileCheck2 className="w-3.5 h-3.5 text-cyan-600" />
            <span>Auditor General</span>
          </span>
        );
      default:
        return <span className="text-slate-600 font-bold">{role}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Module Title Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 font-black text-xs uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Módulo de Seguridad y Gestión de Cuentas</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            Configuración de Usuarios y Roles de Operación
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Crea, modifica o elimina las cuentas de los dos roles administrativos del sistema: Super Administrador y Auditor.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-indigo-950 font-black text-xs rounded-2xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
        >
          <UserPlus className="w-4 h-4 stroke-[2.5]" />
          <span>Crear Nuevo Usuario Operador</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Total Usuarios</span>
            <span className="text-2xl font-black text-slate-900">{totalOperators}</span>
            <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">{activeOperators} Activos</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Super Admin</span>
            <span className="text-2xl font-black text-amber-900">{superAdminCount}</span>
            <span className="text-[10px] text-amber-600 font-bold block mt-0.5">Control Total</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
            <Crown className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Operadores Finanzas</span>
            <span className="text-2xl font-black text-emerald-900">{financialOpCount}</span>
            <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">Recargas y Pagos</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Auditores</span>
            <span className="text-2xl font-black text-cyan-900">{auditorCount}</span>
            <span className="text-[10px] text-cyan-600 font-bold block mt-0.5">Lectura y Reportes</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold">
            <FileCheck2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por usuario o nombre..."
            className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 pl-10 pr-4 py-2 rounded-xl text-xs font-medium text-slate-900 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-bold text-slate-500">Filtrar Rol:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none"
          >
            <option value="ALL">Todos los Roles</option>
            <option value="Super Admin">Super Administrador</option>
            <option value="Operador Financiero">Operador Financiero</option>
            <option value="Auditor">Auditor</option>
          </select>
        </div>
      </div>

      {/* Users & Assigned Roles Table */}
      <div className="bg-white rounded-3xl p-5 shadow-lg border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div>
            <h3 className="font-black text-slate-900 text-base">
              Lista de Usuarios Activos y Roles Asignados
            </h3>
            <p className="text-xs text-slate-500">
              Control de identidades, estatus de cuentas y nivel de permisos dentro del Backoffice.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <th className="pb-3 pl-2">Titular / Usuario</th>
                <th className="pb-3">Rol Asignado</th>
                <th className="pb-3">Seguridad Clave</th>
                <th className="pb-3">Estatus</th>
                <th className="pb-3">Registro</th>
                <th className="pb-3 text-right pr-2">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredCredentials.map((cred) => (
                <tr key={cred.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 pl-2">
                    <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <span>{cred.displayName}</span>
                      {cred.role === 'Super Admin' && (
                        <span className="text-[10px] bg-amber-100 text-amber-800 font-black px-1.5 py-0.2 rounded">
                          MASTER
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-mono text-slate-500 font-medium">@{cred.username}</div>
                  </td>

                  <td className="py-3.5">{getRoleBadge(cred.role)}</td>

                  <td className="py-3.5">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                      <Lock className="w-3 h-3 text-emerald-600" />
                      <span>Validada (Compleja)</span>
                    </span>
                  </td>

                  <td className="py-3.5">
                    {cred.status === 'active' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2.5 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Activo</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                        <XCircle className="w-3 h-3 text-slate-400" />
                        <span>Inactivo</span>
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 text-slate-500 text-[11px] font-mono">
                    {cred.createdAt
                      ? new Date(cred.createdAt).toLocaleDateString('es-VE', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : 'Sistema Base'}
                  </td>

                  <td className="py-3.5 text-right pr-2">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => openEditModal(cred)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-amber-100 hover:text-amber-900 text-slate-700 font-bold rounded-lg text-xs transition-all flex items-center gap-1"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>

                      <button
                        onClick={() => setDeletingUser(cred)}
                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg text-xs transition-all flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredCredentials.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs font-medium">
                    No se encontraron usuarios operadores con los criterios de búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 text-slate-100 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-black">
                  <KeyRound className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {editingUser ? 'Modificar Cuenta de Operador' : 'Crear Nueva Cuenta de Operador'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Asigna roles de acceso y establece contraseñas con validación de seguridad.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {feedback && (
              <div
                className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2 border ${
                  feedback.type === 'success'
                    ? 'bg-emerald-950/80 border-emerald-800 text-emerald-200'
                    : 'bg-rose-950/80 border-rose-800 text-rose-200'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                )}
                <span className="whitespace-pre-line">{feedback.message}</span>
              </div>
            )}

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nombre Completo del Titular *</label>
                <input
                  type="text"
                  required
                  value={formDisplayName}
                  onChange={(e) => setFormDisplayName(e.target.value)}
                  placeholder="Ej. Carlos Eduardo Administrador"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 text-white px-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nombre de Usuario (Login) *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    placeholder="Ej. CarlosAdmin12"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 text-white pl-10 pr-3.5 py-2.5 rounded-xl text-xs font-medium focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Rol Asignado *</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 text-white px-3 py-2.5 rounded-xl text-xs font-bold focus:outline-none"
                  >
                    <option value="Super Admin">Super Administrador (Acceso Total)</option>
                    <option value="Operador Financiero">Operador Financiero (Recargas y Retiros)</option>
                    <option value="Auditor">Auditor (Solo Lectura)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Estado de Cuenta</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 text-white px-3 py-2.5 rounded-xl text-xs font-bold focus:outline-none"
                  >
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                  <span>Contraseña de Acceso {editingUser && '(Dejar en blanco para mantener la actual)'}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                    operatorRole === 'Super Admin'
                      ? 'bg-amber-950/60 text-amber-400 border-amber-500/40'
                      : 'bg-red-950/60 text-red-400 border-red-500/40'
                  }`}>
                    {operatorRole === 'Super Admin' ? '✓ Permitido Super Admin' : '🔒 Solo Super Admin'}
                  </span>
                </label>

                {operatorRole !== 'Super Admin' ? (
                  <div className="p-3.5 bg-amber-950/40 border border-amber-500/40 rounded-2xl flex items-start gap-3 text-amber-200 text-xs">
                    <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="font-bold text-amber-300 block">
                        Gestión de Contraseñas Restringida
                      </span>
                      <p className="text-[11px] text-amber-200/90 leading-relaxed">
                        Su rol activo es <strong>{operatorRole}</strong>. La política de seguridad del sistema establece que <strong>únicamente el Super Admin</strong> posee los privilegios requeridos para asignar claves a nuevos usuarios o modificar contraseñas existentes.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                      <input
                        type={showFormPassword ? 'text' : 'password'}
                        required={!editingUser}
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        placeholder={editingUser ? '•••••••• (Dejar en blanco para mantener la actual)' : 'Crea una contraseña segura...'}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 text-white pl-10 pr-10 py-2.5 rounded-xl text-xs font-medium focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowFormPassword((prev) => !prev)}
                        className="absolute right-3.5 top-2.5 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer p-0.5"
                        tabIndex={-1}
                        title={showFormPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                      >
                        {showFormPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Password Strength Validation Box */}
                    {(formPassword.length > 0 || !editingUser) && (
                      <div className="mt-2.5 p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5 text-[11px]">
                        <div className="font-bold text-amber-400 mb-1 flex items-center justify-between">
                          <span>Requisitos Obligatorios de la Contraseña:</span>
                        </div>

                        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                          <div className={`flex items-center gap-1.5 ${pwdLength ? 'text-emerald-400' : 'text-slate-500'}`}>
                            {pwdLength ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                            <span>Mínimo 8 caracteres</span>
                          </div>

                          <div className={`flex items-center gap-1.5 ${pwdUpper ? 'text-emerald-400' : 'text-slate-500'}`}>
                            {pwdUpper ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                            <span>Una MAYÚSCULA (A-Z)</span>
                          </div>

                          <div className={`flex items-center gap-1.5 ${pwdLower ? 'text-emerald-400' : 'text-slate-500'}`}>
                            {pwdLower ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                            <span>Una minúscula (a-z)</span>
                          </div>

                          <div className={`flex items-center gap-1.5 ${pwdNumber ? 'text-emerald-400' : 'text-slate-500'}`}>
                            {pwdNumber ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                            <span>Un NÚMERO (0-9)</span>
                          </div>

                          <div className={`flex items-center gap-1.5 col-span-2 ${pwdSpecial ? 'text-emerald-400' : 'text-slate-500'}`}>
                            {pwdSpecial ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                            <span>Un carácter especial (@, %, #, $, !, etc.)</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="w-1/2 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-indigo-950 font-black text-xs rounded-xl shadow-lg transition-all"
                >
                  {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative border border-slate-100">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <ShieldAlert className="w-8 h-8" />
              <div>
                <h4 className="font-black text-slate-900 text-base">Eliminar Cuenta de Operador</h4>
                <p className="text-xs text-slate-500">Esta acción removerá el acceso de forma permanente.</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 mb-4 bg-slate-50 p-3 rounded-2xl">
              ¿Estás seguro que deseas eliminar la cuenta de <strong className="text-slate-900">{deletingUser.displayName}</strong> (Usuario: <code className="text-indigo-600 font-bold">@{deletingUser.username}</code>, Rol: {deletingUser.role})?
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setDeletingUser(null)}
                className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteUser}
                className="w-1/2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-all shadow-md"
              >
                Sí, Eliminar Cuenta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
