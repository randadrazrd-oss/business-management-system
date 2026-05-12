import React from 'react';
import Sidebar from './Sidebar';
import { useTranslation } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Globe, Menu } from 'lucide-react';
import NotificationCenter from './NotificationCenter';
import NotificationPoller from './NotificationPoller';

export default function Layout({ children }) {
  console.log('DEBUG: useTranslation value:', typeof useTranslation);
  const { t, lang, toggleLanguage } = useTranslation();
  const { currentUser, userProfile, isAdmin, isSpecialist } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const isRtl = lang === 'ar';

  const badgeColor = isAdmin 
    ? 'bg-primary/10 text-primary border-primary/20' 
    : isSpecialist 
      ? 'bg-success/10 text-success border-success/20' 
      : 'bg-amber-100 text-amber-600 border-amber-200';
  
  const avatarColor = isAdmin ? 'bg-primary-dark' : isSpecialist ? 'bg-success' : 'bg-primary';

  return (
    <div className={`flex h-screen bg-slate-50 overflow-hidden font-sans ${isRtl ? 'rtl' : 'ltr'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      <NotificationPoller />
      {/* Sidebar Backdrop (Mobile Only) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-navy-900/40 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 z-40 transition-transform duration-300 transform lg:translate-x-0 lg:static lg:inset-0
        ${isSidebarOpen 
          ? 'translate-x-0' 
          : isRtl ? 'translate-x-full lg:translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-y-auto min-w-0">
        {/* Topbar */}
        <header className="bg-white/70 backdrop-blur-xl border-b border-slate-200/50 px-6 md:px-8 py-5 flex justify-between items-center z-20 sticky top-0">
          <div className="flex items-center gap-4">
             <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 rounded-xl hover:bg-slate-100 lg:hidden text-slate-600 interactive-button"
            >
              <Menu size={22} strokeWidth={2} />
            </button>
            <h1 className="text-lg md:text-xl font-display font-bold text-slate-900 truncate tracking-tight">{t('app_title')}</h1>
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            <NotificationCenter />
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-600 font-medium text-xs md:text-sm"
            >
              <Globe size={18} />
              <span className="hidden xs:inline">{lang === 'en' ? 'عربي' : 'English'}</span>
              <span className="xs:hidden uppercase">{lang === 'en' ? 'AR' : 'EN'}</span>
            </button>

            <div className="flex items-center gap-3 border-l border-slate-200/50 pl-3 md:pl-6 rtl:pl-0 rtl:border-l-0 rtl:border-r rtl:pr-3 md:rtl:pr-6">
              <div className="hidden sm:flex flex-col items-end rtl:items-start text-right rtl:text-left">
                <span className="text-sm font-semibold text-slate-900 truncate max-w-[120px]">
                  {userProfile?.displayName || currentUser?.email}
                </span>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mt-0.5 ${badgeColor}`}>
                  {userProfile?.role || 'User'}
                </span>
              </div>
              <div className={`h-10 w-10 rounded-[14px] ${avatarColor} text-white flex items-center justify-center font-bold shadow-sm text-lg shrink-0 border border-white/20`}>
                {userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : currentUser?.email?.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-8 z-0">
          {children}
        </main>
      </div>
    </div>
  );
}
