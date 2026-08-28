import React, { useState } from 'react';
import { useGame } from '../../context/GameContext';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  PlusCircle,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Filter,
  CreditCard,
  Lock,
  X,
} from 'lucide-react';
import { LedgerEntryType, TransactionStatus } from '../../types';

interface WalletLedgerViewProps {
  onOpenRecharge: () => void;
  onOpenWithdraw: () => void;
  onClose?: () => void;
}

export const WalletLedgerView: React.FC<WalletLedgerViewProps> = ({
  onOpenRecharge,
  onOpenWithdraw,
  onClose,
}) => {
  const {
    currentUser,
    ledger,
    recharges,
    withdrawals,
    formatMoney,
    commercialConfig,
  } = useGame();

  const [activeSubTab, setActiveSubTab] = useState<'ledger' | 'recharges' | 'withdrawals'>('ledger');
  const [ledgerFilter, setLedgerFilter] = useState<'all' | LedgerEntryType>('all');

  const userLedger = ledger.filter((l) => l.userId === currentUser.id);
  const userRecharges = recharges.filter((r) => r.userId === currentUser.id);
  const userWithdrawals = withdrawals.filter((w) => w.userId === currentUser.id);

  const filteredLedger = userLedger.filter((l) => {
    if (ledgerFilter === 'all') return true;
    if (ledgerFilter === 'card_purchase' || ledgerFilter === 'CARD_PURCHASE') {
      return l.type === 'card_purchase' || l.type === 'CARD_PURCHASE';
    }
    return l.type === ledgerFilter;
  });

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header Container with Close Button */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-lg border border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-900 flex items-center justify-center font-black">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900">
              Mi Billetera y Saldo
            </h1>
            <p className="text-xs text-slate-500 font-bold">
              Gestión de fondos, recargas, retiros y libro contable
            </p>
          </div>
        </div>
        {onClose && (
          <button
            id="close-wallet-view-btn"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-all cursor-pointer"
            title="Cerrar vista de saldo"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Wallet Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Available Balance (Card 1) */}
        <div className="bg-gradient-to-br from-indigo-950 to-indigo-900 rounded-3xl p-5 text-white shadow-xl border border-indigo-800 flex flex-col justify-between min-h-[210px]">
          <div>
            <div className="flex items-center justify-between mb-2 min-h-[32px]">
              <span className="text-xs font-black uppercase text-amber-300 tracking-wider">
                Saldo Disponible
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                Bs
              </div>
            </div>
            <div className="text-3xl font-mono font-black text-white mb-1">
              {formatMoney(currentUser.availableBalance)}
            </div>
            <p className="text-[11px] text-indigo-300">
              Fondos líquidos listos para compra de tarjetas o retiro directo.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-indigo-800 min-h-[44px] items-center">
            <button
              onClick={onOpenRecharge}
              className="w-full py-2.5 min-h-[40px] bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 stroke-[2.5]" />
              <span>Recargar</span>
            </button>
            <button
              onClick={onOpenWithdraw}
              className="w-full py-2.5 min-h-[40px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 border border-amber-500/50 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
              <span>Retirar</span>
            </button>
          </div>
        </div>

        {/* Pending Balance (Card 2) */}
        <div className="bg-white rounded-3xl p-5 shadow-lg border-2 border-slate-100 flex flex-col justify-between min-h-[210px]">
          <div>
            <div className="flex items-center justify-between mb-2 min-h-[32px]">
              <span className="text-xs font-black uppercase text-slate-500 tracking-wider">
                Saldo Pendiente
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-xs">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-mono font-black text-slate-900 mb-1">
              {formatMoney(currentUser.pendingBalance)}
            </div>
            <p className="text-[11px] text-slate-500">
              En revisión manual por el operador en el extracto de Pago Móvil.
            </p>
          </div>
          <div className="text-xs font-bold text-amber-700 bg-amber-50 rounded-xl p-2 mt-4 text-center min-h-[36px] flex items-center justify-center">
            {userRecharges.filter((r) => r.status === 'pending').length} comprobante(s) en auditoría
          </div>
        </div>

        {/* Locked Balance (Card 3) */}
        <div className="bg-white rounded-3xl p-5 shadow-lg border-2 border-slate-100 flex flex-col justify-between min-h-[210px]">
          <div>
            <div className="flex items-center justify-between mb-2 min-h-[32px]">
              <span className="text-xs font-black uppercase text-slate-500 tracking-wider">
                Saldo  (Retiros)
              </span>
              <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                <Lock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-mono font-black text-slate-900 mb-1">
              {formatMoney(currentUser.lockedBalance)}
            </div>
            <p className="text-[11px] text-slate-500">
              Reservado para transferir a tu cuenta bancaria destino.
            </p>
          </div>
          <div className="text-xs font-bold text-indigo-700 bg-indigo-50 rounded-xl p-2 mt-4 text-center min-h-[36px] flex items-center justify-center">
            {userWithdrawals.filter((w) => w.status === 'pending').length} retiro(s) en proceso
          </div>
        </div>
      </div>

      {/* Sub Tabs: Ledger vs Recharges vs Withdrawals */}
      <div className="bg-white rounded-2xl p-1.5 shadow-sm border border-slate-200 flex gap-2">
        <button
          onClick={() => setActiveSubTab('ledger')}
          style={{ height: '76.9306px', width: '108.826px' }}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${
            activeSubTab === 'ledger'
              ? 'bg-indigo-950 text-amber-300 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span style={{ height: '48.9688px' }}>Movimientos ({userLedger.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('recharges')}
          style={{ width: '113.472px' }}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${
            activeSubTab === 'recharges'
              ? 'bg-indigo-950 text-amber-300 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500" />
          <span>Recargas ({userRecharges.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('withdrawals')}
          style={{ height: '74.9306px', width: '92.003px' }}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${
            activeSubTab === 'withdrawals'
              ? 'bg-indigo-950 text-amber-300 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <ArrowUpRight className="w-3.5 h-3.5 text-amber-500" />
          <span>Retiros ({userWithdrawals.length})</span>
        </button>
      </div>

      {/* View 1: Immutable Ledger Table */}
      {activeSubTab === 'ledger' && (
        <div className="bg-white rounded-3xl p-5 shadow-lg border border-slate-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-black text-slate-900 text-base">
                Libro Contable de Billetera (Wallet Ledger)
              </h3>
              <p className="text-xs text-slate-500">
                Registro inmutable de ingresos, compras de tarjetas, premios y egresos.
              </p>
            </div>

            {/* Filter buttons */}
            <div className="flex flex-wrap gap-1.5">
              {(['all', 'recharge', 'card_purchase', 'prize_payout', 'withdrawal_lock'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setLedgerFilter(type)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                    ledgerFilter === type
                      ? 'bg-indigo-900 text-white border-indigo-900'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {type === 'all'
                    ? 'Todos'
                    : type === 'recharge'
                    ? 'Recargas'
                    : type === 'card_purchase'
                    ? 'Compras'
                    : type === 'prize_payout'
                    ? 'Premios'
                    : 'Retiros'}
                </button>
              ))}
            </div>
          </div>

          {filteredLedger.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              No hay movimientos registrados en esta categoría.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <th className="pb-2.5">Fecha y Hora</th>
                    <th className="pb-2.5">Tipo</th>
                    <th className="pb-2.5">Descripción</th>
                    <th className="pb-2.5 text-right">Monto (VES)</th>
                    <th className="pb-2.5 text-right">Saldo Posterior</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredLedger.map((item) => {
                    const isPositive = item.amountVes > 0;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 text-slate-500 text-[11px] whitespace-nowrap">
                          {item?.createdAt ? new Date(item.createdAt).toLocaleString('es-VE') : ''}
                        </td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                              item.type === 'recharge'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.type === 'prize_payout'
                                ? 'bg-amber-100 text-amber-900 font-black'
                                : item.type === 'card_purchase' || item.type === 'CARD_PURCHASE'
                                ? 'bg-indigo-100 text-indigo-900'
                                : 'bg-rose-100 text-rose-900'
                            }`}
                          >
                            {item.type === 'recharge'
                              ? 'Recarga'
                              : item.type === 'prize_payout'
                              ? 'Premio'
                              : item.type === 'card_purchase' || item.type === 'CARD_PURCHASE'
                              ? 'Compra'
                              : 'Retiro'}
                          </span>
                        </td>
                        <td className="py-3 text-slate-800 max-w-xs truncate font-semibold">
                          {item.description}
                        </td>
                        <td
                          className={`py-3 text-right font-mono font-black ${
                            isPositive ? 'text-emerald-600' : item.amountVes < 0 ? 'text-rose-600' : 'text-slate-600'
                          }`}
                        >
                          {isPositive ? `+${formatMoney(item.amountVes)}` : item.amountVes === 0 ? '0 Bs.' : formatMoney(item.amountVes)}
                        </td>
                        <td className="py-3 text-right font-mono font-bold text-slate-900">
                          {item.balanceAfter > 0 ? formatMoney(item.balanceAfter) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* View 2: Recharge Receipts */}
      {activeSubTab === 'recharges' && (
        <div className="bg-white rounded-3xl p-5 shadow-lg border border-slate-200">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-black text-slate-900 text-base">
                Comprobantes de Pago Móvil Reportados
              </h3>
              <p className="text-xs text-slate-500">
                Auditoría y estado de tus depósitos bancarios.
              </p>
            </div>
            <button
              onClick={onOpenRecharge}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Nueva Recarga</span>
            </button>
          </div>

          <div className="space-y-3">
            {userRecharges.map((rec) => (
              <div
                key={rec.id}
                className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={rec.voucherImageUrl}
                    alt="Voucher"
                    className="w-12 h-12 rounded-xl object-cover border border-slate-300 shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 text-sm">
                        {formatMoney(rec.amountVes)}
                      </span>
                      <span className="font-mono text-xs text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded-md font-bold">
                        Ref: {rec.referenceNumber}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 block">
                      {rec.bankOrigin} • {rec?.createdAt ? new Date(rec.createdAt).toLocaleString('es-VE') : ''}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                      rec.status === 'approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : rec.status === 'pending'
                        ? 'bg-amber-100 text-amber-900 animate-pulse'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {rec.status === 'approved'
                      ? 'Aprobado'
                      : rec.status === 'pending'
                      ? 'Pendiente'
                      : 'Rechazado'}
                  </span>
                  {rec.rejectionReason && (
                    <span className="text-[11px] text-rose-600 font-bold max-w-xs">
                      Motivo: {rec.rejectionReason}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View 3: Withdrawals History */}
      {activeSubTab === 'withdrawals' && (
        <div className="bg-white rounded-3xl p-5 shadow-lg border border-slate-200">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-black text-slate-900 text-base">
                Historial de Solicitudes de Retiro
              </h3>
              <p className="text-xs text-slate-500">
                Seguimiento de transferencias procesadas hacia tu banco.
              </p>
            </div>
            <button
              onClick={onOpenWithdraw}
              className="bg-indigo-950 hover:bg-indigo-900 text-amber-300 font-black text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Solicitar Retiro</span>
            </button>
          </div>

          <div className="space-y-3">
            {userWithdrawals.map((wth) => (
              <div
                key={wth.id}
                className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900 text-sm">
                      {formatMoney(wth.amountVes)}
                    </span>
                    <span className="text-xs font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded-md">
                      {wth.channel === 'pago_movil' ? 'Pago Móvil' : 'Transferencia'}
                    </span>
                  </div>
                  <span className="text-xs text-slate-600 block mt-0.5">
                    Destino: {wth.bankDest} ({wth.phoneOrAccount}) • {wth.titularName}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    Solicitado el {wth?.createdAt ? new Date(wth.createdAt).toLocaleString('es-VE') : ''}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                      wth.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : wth.status === 'pending'
                        ? 'bg-indigo-100 text-indigo-900 font-bold'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {wth.status === 'completed'
                      ? 'Completado'
                      : wth.status === 'pending'
                      ? 'En Proceso'
                      : 'Rechazado'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
