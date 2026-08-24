import React from 'react';
import { AppNotification } from '../types';
import { Check, Info, AlertTriangle, CheckCircle2, X } from 'lucide-react';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
}) => {
  if (!isOpen) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500 dark:text-amber-400" />;
      default:
        return <Info className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-gray-900/20 backdrop-blur-2xs">
      <div
        id="notifications-panel-drawer"
        className="h-full w-full max-w-sm border-l border-gray-100 bg-white p-6 shadow-2xl transition-all dark:border-zinc-800 dark:bg-zinc-950"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-zinc-800">
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-zinc-100">Notificaciones</h2>
            <p className="text-[11px] text-gray-400 font-medium">
              {notifications.filter((n) => !n.read).length} no leídas
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-zinc-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Action triggers */}
        <div className="flex items-center justify-between py-3 text-[11px] font-bold">
          <button
            onClick={onMarkAllAsRead}
            className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            Marcar todas como leídas
          </button>
          <button
            onClick={onClearAll}
            className="text-rose-600 hover:text-rose-700 dark:text-rose-400"
          >
            Limpiar lista
          </button>
        </div>

        {/* Notifications List */}
        <div className="mt-2 space-y-3 overflow-y-auto max-h-[calc(100vh-160px)]">
          {notifications.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-center">
              <p className="text-xs text-gray-400 font-medium">No tienes notificaciones pendientes.</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => onMarkAsRead(notif.id)}
                className={`cursor-pointer rounded-2xl border p-4 text-xs transition-all ${
                  notif.read
                    ? 'border-gray-100 bg-gray-50/50 dark:border-zinc-900 dark:bg-zinc-900/30'
                    : 'border-indigo-100 bg-indigo-50/20 shadow-xs dark:border-indigo-900/40 dark:bg-zinc-900/90'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{getIcon(notif.type)}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p
                        className={`font-bold ${
                          notif.read
                            ? 'text-gray-600 dark:text-zinc-400'
                            : 'text-gray-900 dark:text-zinc-100'
                        }`}
                      >
                        {notif.title}
                      </p>
                      {!notif.read && (
                        <span className="h-2 w-2 rounded-full bg-indigo-600"></span>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-gray-400 dark:text-zinc-400 font-medium">
                      {notif.message}
                    </p>
                    <span className="mt-2 block text-[10px] text-gray-400 font-medium">
                      {notif.time}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
