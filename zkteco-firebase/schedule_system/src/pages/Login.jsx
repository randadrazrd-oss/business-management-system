import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/LanguageContext';
import { toast } from 'react-hot-toast';
import { LogIn, Mail, Lock, Loader2, Key } from 'lucide-react';
import { seedAdminAccount } from '../services/userService';

export default function Login() {
  const { login } = useAuth();
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const isRtl = lang === 'ar';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const isInitMode = new URLSearchParams(location.search).get('init') === 'true';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success(isRtl ? 'تم تسجيل الدخول بنجاح' : 'Logged in successfully');
      navigate('/dashboard');
    } catch (error) {
      console.error(error);
      let message = isRtl ? 'خطأ في البريد الإلكتروني أو كلمة المرور' : 'Invalid email or password.';
      
      if (error.code === 'auth/network-request-failed') {
        message = isRtl ? 'فشل الاتصال بالشبكة. يرجى التحقق من الإنترنت.' : 'Network failure. Please check your internet connection.';
      } else if (error.message === 'ACCOUNT_DEACTIVATED') {
        message = isRtl ? 'هذا الحساب معطل. يرجى التواصل مع المدير.' : 'Account deactivated. Contact management for assistance.';
      }

      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleInitAdmin = async () => {
    if (!email || password.length < 6) {
      toast.error('Email and minimum 6 character password required to seed admin');
      return;
    }
    setLoading(true);
    try {
      await seedAdminAccount({ email, password, displayName: 'System Administrator' });
      toast.success('Admin seeded successfully! You can now log in normally without ?init=true');
    } catch (err) {
      toast.error(err.message || 'Error seeding admin');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 md:p-8 overflow-hidden bg-slate-50 font-sans text-left">
      {/* Immersive Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-40 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary/20 blur-[120px] rounded-full"></div>
      </div>

      <div className={`w-full max-w-[500px] bg-white rounded-[2.5rem] shadow-[0_30px_100px_-20px_rgba(234,88,12,0.15)] overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-700 border border-white ${isRtl ? 'text-right' : 'text-left'}`}>
        
        {/* Branding Header Area */}
        <div className="bg-gradient-to-br from-primary via-primary to-amber-600 p-10 md:p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
             <div className="absolute top-[-20%] right-[-20%] w-[80%] h-[80%] bg-white/30 blur-[80px] rounded-full animate-pulse"></div>
          </div>
          
          <div className="relative z-10">
            <img
              src="/logo-transparent.png"
              alt="Logo"
              className="w-20 h-20 mx-auto object-contain drop-shadow-2xl mb-6"
            />
            <h2 className="text-3xl font-display font-black text-white leading-tight tracking-tighter">
              {isRtl ? 'إدارة ذكية للمراكز الطبية' : 'Clinical Management Redefined.'}
            </h2>
          </div>
        </div>

        {/* Login Form Area */}
        <div className="p-8 md:p-12 flex flex-col justify-center bg-white">
          <div className="mb-10 text-center">
            <h1 className="text-2xl font-display font-black text-slate-900 mb-2">
              {isRtl ? 'تسجيل الدخول' : 'Access Gateway'}
            </h1>
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em]">
              {isInitMode ? 'System Initialization Mode' : (isRtl ? 'يرجى إدخال بيانات الاعتماد' : 'Professional Authentication Required')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 text-left">
            <div className="space-y-2">
              <label className={`text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block ${isRtl ? 'text-right' : 'text-left'}`}>
                {isRtl ? 'البريد الإلكتروني' : 'Clinical Identifier'}
              </label>
              <div className="relative group">
                <div className={`absolute ${isRtl ? 'right-6' : 'left-6'} top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors`}>
                  <Mail size={18} />
                </div>
                <input
                  required
                  type="email"
                  className={`w-full bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] ${isRtl ? 'pr-14 pl-6' : 'pl-14 pr-6'} py-5 font-bold text-slate-900 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/5 outline-none transition-all`}
                  placeholder="admin@clinic.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className={`text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 block ${isRtl ? 'text-right' : 'text-left'}`}>
                {isRtl ? 'كلمة المرور' : 'Secure Passkey'}
              </label>
              <div className="relative group">
                <div className={`absolute ${isRtl ? 'right-6' : 'left-6'} top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors`}>
                  <Lock size={18} />
                </div>
                <input
                  required
                  type="password"
                  className={`w-full bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] ${isRtl ? 'pr-14 pl-6' : 'pl-14 pr-6'} py-5 font-bold text-slate-900 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/5 outline-none transition-all`}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="pt-2">
              {isInitMode ? (
                <button
                  type="button"
                  onClick={handleInitAdmin}
                  disabled={loading}
                  className="w-full bg-emerald-500 h-16 text-white rounded-[1.5rem] font-black flex items-center justify-center gap-3 hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 active:scale-95 uppercase tracking-widest text-sm"
                >
                  <Key size={18} /> {isRtl ? 'تهيئة النظام' : 'INITIALIZE AS ADMIN'}
                </button>
              ) : (
                <button
                  disabled={loading}
                  type="submit"
                  className="w-full bg-primary h-16 text-white rounded-[1.5rem] font-black text-sm shadow-2xl shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-3 active:scale-95 uppercase tracking-widest"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <>
                      <LogIn size={18} strokeWidth={2.5} />
                      <span>{isRtl ? 'دخول آمن' : 'Authorize Access'}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </form>

          <div className="mt-12 pt-8 border-t border-slate-50 flex items-center justify-between text-[8px] font-bold text-slate-300 uppercase tracking-widest">
            <span>Encrypted Connection</span>
            <span>GDPR Compliant</span>
          </div>
        </div>
      </div>
    </div>
  );
}
