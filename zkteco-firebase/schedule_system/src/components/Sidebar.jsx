import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserRound,
  CalendarDays,
  LogOut,
  Shield,
  PieChart,
  ChevronDown,
  ChevronUp,
  Clock,
  CalendarCheck,
  FileText,
  X
} from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';

export default function Sidebar({ onClose }) {
  const { t, lang } = useTranslation();
  const { logout, currentUser, userProfile, userRole, isAdmin, isSecretary, isSpecialist } = useAuth();
  const isRtl = lang === 'ar';
  const navigate = useNavigate();

  const avatarColor = isAdmin ? 'bg-primary-dark' : isSpecialist ? 'bg-success' : 'bg-primary';

  const [reportsOpen, setReportsOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success(t('logout_success') || (isRtl ? 'تم تسجيل الخروج' : 'Logged out'));
    } catch (error) {
      toast.error(t('logout_failed') || 'Logout failed');
    }
  };

  // Base items for admin/secretary
  const coreItems = [
    { name: t('dashboard'), path: '/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: t('schedule'), path: '/schedule', icon: <CalendarDays size={20} /> },
    { name: t('specialists'), path: '/specialists', icon: <UserRound size={20} /> },
    { name: t('children'), path: '/children', icon: <Users size={20} /> },
  ];

  const adminItems = [
    ...coreItems,
    { name: t('user_management'), path: '/admin/users', icon: <Shield size={20} /> }
  ];

  const specialistItems = [
    { name: t('my_schedule'), path: '/my-schedule', icon: <CalendarCheck size={20} /> }
  ];

  let navItems = [];
  if (isAdmin) navItems = adminItems;
  else if (isSecretary) navItems = coreItems;
  else if (isSpecialist) navItems = specialistItems;

  return (
    <div className={`h-full w-[260px] bg-slate-50 flex flex-col z-20 overflow-y-auto custom-scrollbar ${isRtl ? 'border-l' : 'border-r'} border-slate-200/50`}>
      {/* Brand Header */}
      <div className="pt-8 pb-4 px-6 flex flex-col gap-4 shrink-0 relative">
        <button 
          onClick={onClose}
          className="lg:hidden absolute top-4 right-4 rtl:right-auto rtl:left-4 p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-200/50 rounded-xl transition-all interactive-button"
        >
          <X size={20} />
        </button>
        
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-200/50 flex items-center justify-center p-1">
             <img src="/logo-transparent.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h2 className="text-sm font-display font-bold text-slate-900 tracking-tight leading-tight">
              {t('app_title')}
            </h2>
            <p className="text-[10px] font-medium text-slate-500">Workspace</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 px-4">{t('main_menu_label') || (isRtl ? 'القائمة الرئيسية' : 'Operations')}</p>
        
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-[12px] transition-all duration-200 font-medium group ${isActive
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                : 'text-slate-600 hover:bg-slate-200/30 hover:text-slate-900'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`transition-colors ${isActive ? 'text-primary' : 'text-slate-400 group-hover:text-slate-600'}`}>
                   {React.cloneElement(item.icon, { size: 18 })}
                </div>
                <span className={`tracking-tight text-sm ${isActive ? 'font-semibold' : ''}`}>{item.name}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* Reports Section (Admin / Secretary only) */}
        {(isAdmin || isSecretary) && (
          <div className="pt-2">
            <button
              onClick={() => setReportsOpen(!reportsOpen)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-[12px] transition-all duration-200 font-medium ${reportsOpen ? 'text-slate-900 bg-white shadow-sm border border-slate-200/50' : 'text-slate-600 hover:bg-slate-200/30 hover:text-slate-900'}`}
            >
              <div className="flex items-center gap-3">
                <div className={`transition-colors ${reportsOpen ? 'text-primary' : 'text-slate-400'}`}>
                  <PieChart size={18} />
                </div>
                <span className={`tracking-tight text-sm ${reportsOpen ? 'font-semibold' : ''}`}>{t('reports')}</span>
              </div>
              {reportsOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
            </button>

            {reportsOpen && (
              <div className="mt-1 space-y-0.5 px-2 ml-4 rtl:ml-0 rtl:mr-4 border-l border-slate-200 rtl:border-l-0 rtl:border-r">
                <NavLink
                  to="/reports/weekly"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-[13px] ${isActive ? 'text-primary font-semibold bg-white shadow-sm border border-slate-200/50' : 'text-slate-500 font-medium hover:text-slate-900 hover:bg-slate-200/30'}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Clock size={14} className={isActive ? "text-primary" : "text-slate-400"} /> {t('weekly_activity')}
                    </>
                  )}
                </NavLink>
                <NavLink
                  to="/reports/monthly"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-[13px] ${isActive ? 'text-primary font-semibold bg-white shadow-sm border border-slate-200/50' : 'text-slate-500 font-medium hover:text-slate-900 hover:bg-slate-200/30'}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <CalendarDays size={14} className={isActive ? "text-primary" : "text-slate-400"} /> {t('monthly_analysis')}
                    </>
                  )}
                </NavLink>
                <NavLink
                  to="/reports/sessions-log"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-[13px] ${isActive ? 'text-primary font-semibold bg-white shadow-sm border border-slate-200/50' : 'text-slate-500 font-medium hover:text-slate-900 hover:bg-slate-200/30'}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <FileText size={14} className={isActive ? "text-primary" : "text-slate-400"} /> {t('sessions_log')}
                    </>
                  )}
                </NavLink>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* User & Footer */}
      <div className="p-4 space-y-2 bg-slate-50 shrink-0 border-t border-slate-200/50">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[12px] text-slate-600 font-medium hover:bg-slate-200/30 hover:text-red-500 transition-all text-sm interactive-button"
        >
          <LogOut size={18} />
          <span className="tracking-tight">{t('logout_system')}</span>
        </button>
      </div>
    </div>
  );
}
