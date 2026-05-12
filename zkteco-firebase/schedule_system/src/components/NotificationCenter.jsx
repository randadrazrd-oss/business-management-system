import React, { useState } from 'react';
import { Bell, X, Trash2, Pill, CheckCircle2, Info, AlertCircle, Loader2 } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { useTranslation } from '../contexts/LanguageContext';
import { toast } from 'react-hot-toast';

const TYPE_CONFIG = {
  medication: {
    icon: <Pill size={16} />,
    bg: 'bg-indigo-50',
    text: 'text-indigo-500',
    border: 'border-indigo-100'
  },
  session: {
    icon: <CheckCircle2 size={16} />,
    bg: 'bg-orange-50',
    text: 'text-orange-500',
    border: 'border-orange-100'
  },
  default: {
    icon: <Info size={16} />,
    bg: 'bg-blue-50',
    text: 'text-blue-500',
    border: 'border-blue-100'
  }
};

function timeAgo(isoString) {
  const diff = Math.floor((Date.now() - new Date(isoString)) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(isoString).toLocaleDateString();
}

export default function NotificationCenter() {
  const { notifications, loading, dismiss, dismissAll } = useNotifications();
  const { lang } = useTranslation();
  const isRtl = lang === 'ar';
  const [isOpen, setIsOpen] = useState(false);
  const [acting, setActing] = useState(null); // id of notification being acted on

  const unreadCount = notifications.length;

  const handleDismiss = async (id, e) => {
    e?.stopPropagation();
    setActing(id);
    await dismiss(id);
    setActing(null);
  };

  const handleTaken = async (notif, e) => {
    e?.stopPropagation();
    setActing(notif.id);
    await dismiss(notif.id);
    setActing(null);
    toast.success(`Confirmed: ${notif.medName} given to ${notif.title}`, {
      style: { borderRadius: '16px', fontWeight: 700 }
    });
  };

  const handleSkip = async (notif, e) => {
    e?.stopPropagation();
    await handleDismiss(notif.id, e);
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(o => !o)}
        className="relative p-2.5 bg-white border border-slate-200/50 rounded-xl hover:bg-slate-50 transition-all group shadow-sm"
        aria-label="Notifications"
      >
        <Bell
          size={20}
          className={`transition-colors ${unreadCount > 0 ? 'text-indigo-600' : 'text-slate-500 group-hover:text-indigo-500'}`}
        />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-white shadow-sm animate-bounce">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          <div
            className={`absolute top-full mt-3 z-50 w-[360px] bg-white rounded-[20px] shadow-lg border border-slate-200/50 overflow-hidden
              animate-in slide-in-from-top-2 duration-200
              ${isRtl ? 'left-0' : 'right-0'}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-200/50 text-slate-900">
              <div>
                <h3 className="font-bold text-[15px] tracking-tight flex items-center gap-2">
                  <Bell size={16} className="text-slate-500" /> Notifications
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  {unreadCount > 0 ? `${unreadCount} pending alerts` : 'All clear'}
                </p>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={dismissAll}
                  className="text-slate-500 hover:text-slate-900 text-[11px] font-semibold px-3 py-1.5 rounded-lg hover:bg-slate-200/50 transition-all flex items-center gap-1.5"
                  title="Dismiss all"
                >
                  <Trash2 size={14} /> Clear all
                </button>
              )}
            </div>

            {/* Body */}
            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="flex items-center justify-center py-14 gap-3 text-gray-400">
                  <Loader2 size={20} className="animate-spin" />
                  <span className="text-sm font-bold">Loading alerts…</span>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 gap-3 text-gray-300">
                  <Bell size={40} strokeWidth={1} />
                  <p className="text-sm font-bold">No new notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {notifications.map((notif) => {
                    const cfg = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.default;
                    const isProcessing = acting === notif.id;

                    return (
                      <div
                        key={notif.id}
                        className={`px-5 py-4 flex gap-3 items-start transition-all ${isProcessing ? 'opacity-50 pointer-events-none' : 'hover:bg-slate-50'}`}
                      >
                        {/* Icon */}
                        <div className={`mt-0.5 p-2 rounded-xl shrink-0 ${cfg.bg} ${cfg.text}`}>
                          {cfg.icon}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-slate-900 leading-snug">{notif.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{notif.message}</p>
                          <p className="text-[9px] font-bold text-gray-300 uppercase mt-1">{timeAgo(notif.createdAt)}</p>

                          {/* Medication Actions */}
                          {notif.type === 'medication' && (
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={(e) => handleTaken(notif, e)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black px-4 py-1.5 rounded-lg transition-all uppercase tracking-widest flex items-center gap-1"
                              >
                                <CheckCircle2 size={11} /> Mark as Taken
                              </button>
                              <button
                                onClick={(e) => handleSkip(notif, e)}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-600 text-[10px] font-black px-4 py-1.5 rounded-lg transition-all uppercase tracking-widest"
                              >
                                Skip
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Dismiss button for non-medication types */}
                        {notif.type !== 'medication' && (
                          <button
                            onClick={(e) => handleDismiss(notif.id, e)}
                            className="mt-0.5 p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-all shrink-0"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
