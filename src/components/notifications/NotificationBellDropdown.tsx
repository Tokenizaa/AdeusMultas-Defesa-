import React, { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck, Send, Sparkles, ExternalLink, ShieldCheck, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { useRouter } from '../../core/router/RouterContext';

export const NotificationBellDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { navigate } = useRouter();

  const {
    permission,
    isSubscribed,
    loading,
    notifications,
    unreadCount,
    requestPermissionAndSubscribe,
    sendTestNotification,
    markAllAsRead,
  } = usePushNotifications();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (url: string) => {
    setIsOpen(false);
    navigate(url);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'defesa_pronta':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'julgamento_procedente':
      case 'deferido':
        return <Sparkles className="w-4 h-4 text-[#FFCD07] shrink-0" />;
      case 'prazo_alerta':
        return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
      default:
        return <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />;
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors focus:outline-none"
        title="Central de Notificações"
        aria-label="Central de Notificações"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-sm font-extrabold text-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[#071D41] border border-[#155BCB]/40 shadow-2xl shadow-black/80 z-50 overflow-hidden text-white animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="px-4 py-3 bg-[#0C326F]/60 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#FFCD07]" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">Notificações do Sistema</h3>
              {unreadCount > 0 && (
                <span className="text-sm bg-rose-500/20 text-rose-300 font-bold px-1.5 py-0.5 rounded">
                  {unreadCount} nova{unreadCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-slate-400 hover:text-[#FFCD07] flex items-center gap-1 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Marcar lidas
              </button>
            )}
          </div>

          {/* Push Activation Prompt Banner (if not granted) */}
          {permission !== 'granted' && (
            <div className="p-3 bg-gradient-to-r from-[#155BCB]/30 to-[#071D41] border-b border-[#155BCB]/40 flex items-center justify-between gap-2">
              <div className="text-sm text-slate-300">
                <span className="font-semibold text-white block">Ativar Alertas Push</span>
                <span className="text-sm text-slate-400">Receba notificações de julgamento no mobile.</span>
              </div>
              <button
                onClick={requestPermissionAndSubscribe}
                disabled={loading}
                className="bg-[#FFCD07] hover:bg-[#F5A623] text-[#071D41] font-bold text-sm px-3 py-1.5 rounded-lg shrink-0 transition-colors shadow-sm"
              >
                {loading ? 'Ativando...' : 'Ativar'}
              </button>
            </div>
          )}

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
            {(!notifications || notifications.length === 0) ? (
              <div className="py-8 px-4 text-center">
                <Clock className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-50" />
                <p className="text-sm text-slate-400">Nenhuma notificação registrada no momento.</p>
              </div>
            ) : (
              (notifications || []).map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif.url || '/cases')}
                  className={`p-3.5 hover:bg-white/5 cursor-pointer transition-colors flex items-start gap-3 ${
                    !notif.read ? 'bg-[#155BCB]/15' : ''
                  }`}
                >
                  <div className="mt-0.5">{getStatusIcon(notif.status)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-sm font-semibold text-white truncate">{notif.title}</span>
                      <span className="text-sm text-slate-400 shrink-0">
                        {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 line-clamp-2 leading-relaxed">{notif.body}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-2.5 bg-[#0C326F]/40 border-t border-white/10 flex items-center justify-between text-sm">
            <button
              onClick={sendTestNotification}
              disabled={loading}
              className="text-sm text-slate-300 hover:text-white flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/10 transition-colors"
            >
              <Send className="w-3 h-3 text-[#FFCD07]" />
              Disparar Alerta de Teste
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/cases');
              }}
              className="text-sm text-[#FFCD07] hover:underline flex items-center gap-1 font-semibold"
            >
              Ver Recursos <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
