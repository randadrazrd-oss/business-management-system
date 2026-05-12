import React from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';

export default function Unauthorized() {
  const { t, lang } = useTranslation();
  const isRtl = lang === 'ar';
  const navigate = useNavigate();

  return (
    <div className={`min-h-[70vh] flex flex-col items-center justify-center ${isRtl ? 'text-right rtl' : 'text-left lg'}`}>
      <div className="bg-white p-12 rounded-[2.5rem] shadow-2xl flex flex-col items-center max-w-lg text-center border-t-4 border-red-500">
        <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </div>
        <h2 className="text-3xl font-black text-navy mb-4">
          {isRtl ? 'غير مصرح' : 'Access Denied'}
        </h2>
        <p className="text-gray-500 mb-8 font-medium">
          {isRtl ? 'ليس لديك الصلاحية للوصول إلى هذه الصفحة. يرجى الاتصال بمسؤول النظام إذا كنت تعتقد أن هذا خطأ.' : 'You do not have permission to access this page. Please contact the system administrator if you believe this is an error.'}
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          className="bg-navy text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition-colors"
        >
          {isRtl ? 'العودة للرئيسية' : 'Return to Dashboard'}
        </button>
      </div>
    </div>
  );
}
