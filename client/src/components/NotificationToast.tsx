import React, { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export const NotificationToast: React.FC = () => {
  const notification = useGameStore((s) => s.notification);
  const clearNotification = useGameStore((s) => s.clearNotification);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        clearNotification();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification, clearNotification]);

  if (!notification) return null;

  const icons = {
    info: <Info className="w-5 h-5 text-sky-400 shrink-0" />,
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
  };

  const bgStyles = {
    info: 'bg-sky-950/90 border-sky-800 text-sky-100',
    success: 'bg-emerald-950/90 border-emerald-800 text-emerald-100',
    warning: 'bg-amber-950/90 border-amber-800 text-amber-100',
    error: 'bg-rose-950/90 border-rose-800 text-rose-100',
  };

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md pointer-events-auto">
      <div
        className={`flex items-center justify-between p-3.5 rounded-xl border shadow-xl backdrop-blur-md transition-all ${bgStyles[notification.type]}`}
      >
        <div className="flex items-center space-x-3 pr-2">
          {icons[notification.type]}
          <p className="text-sm font-semibold">{notification.message}</p>
        </div>
        <button
          type="button"
          onClick={clearNotification}
          className="p-1 rounded-md opacity-70 hover:opacity-100 transition-opacity"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
