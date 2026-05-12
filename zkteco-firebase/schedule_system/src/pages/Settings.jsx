import React from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { Settings as SettingsIcon, Shield, Globe, Bell, Palette } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function Settings() {
  const { t, lang } = useTranslation();
  const isRtl = lang === 'ar';

  const sections = [
    {
      title: isRtl ? 'إعدادات الحضانة' : 'Nursery Settings',
      icon: <Globe className="text-primary" />,
      items: [
        { label: isRtl ? 'اسم الحضانة' : 'Nursery Name', value: 'Sunrise Nursery' },
        { label: isRtl ? 'اللغة الافتراضية' : 'Default Language', value: isRtl ? 'العربية' : 'English' },
      ]
    },
    {
      title: isRtl ? 'الأمان' : 'Security',
      icon: <Shield className="text-emerald-600" />,
      items: [
        { label: isRtl ? 'نسخ احتياطي للبيانات' : 'Data Backup', value: isRtl ? 'تلقائي' : 'Automatic' },
        { label: isRtl ? 'سجل العمليات' : 'Audit Logs', value: isRtl ? 'نشط' : 'Active' },
      ]
    },
    {
      title: isRtl ? 'التنبيهات' : 'Notifications',
      icon: <Bell className="text-orange-600" />,
      items: [
        { label: isRtl ? 'تنبيهات المتصفح' : 'Browser Notifications', value: isRtl ? 'مفعل' : 'Enabled' },
        { label: isRtl ? 'تنبيهات البريد' : 'Email Alerts', value: isRtl ? 'مفعل' : 'Enabled' },
      ]
    }
  ];

  return (
    <div className={`space-y-8 animate-in fade-in duration-500 ${isRtl ? 'text-right' : 'text-left'}`}>
      <div>
        <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
          <SettingsIcon className="text-gray-400" size={32} /> {isRtl ? 'الإعدادات' : 'System Settings'}
        </h2>
        <p className="text-gray-500 font-medium">{isRtl ? 'إدارة تفضيلات النظام والتهيئة العامة' : 'Manage system preferences and global configuration'}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {sections.map((section, idx) => (
          <div key={idx} className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 bg-gray-50/50 border-b border-gray-100 flex items-center gap-3">
              <div className="p-2 bg-white rounded-xl shadow-sm border border-gray-100">
                {section.icon}
              </div>
              <h3 className="font-black text-gray-800 uppercase tracking-widest text-sm">{section.title}</h3>
            </div>
            <div className="p-8 space-y-6">
              {section.items.map((item, i) => (
                <div key={i} className="flex justify-between items-center border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                  <span className="font-bold text-gray-500 text-sm tracking-tight">{item.label}</span>
                  <span className="font-black text-gray-900">{item.value}</span>
                </div>
              ))}
              <div className="pt-4">
                <button 
                  onClick={() => toast.success(isRtl ? 'تم حفظ التغييرات' : 'Settings updated')}
                  className="w-full py-3 bg-gray-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all active:scale-95 shadow-lg"
                >
                  {isRtl ? 'تعديل' : 'Modify'}
                </button>
              </div>
            </div>
          </div>
        ))}

        <div className="bg-navy rounded-[2rem] p-10 text-white flex flex-col justify-between shadow-sm">
          <div>
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mb-6 border border-white/20">
              <Palette size={32} />
            </div>
            <h3 className="text-2xl font-black mb-4">{isRtl ? 'تخصيص المظهر' : 'Visual Identity'}</h3>
            <p className="text-white/80 font-medium mb-6 leading-relaxed">
              {isRtl ? 'قم بتخصيص الألوان والشعار والخطوط لتتناسب مع علامة حضانة الشروق التجارية.' : 'Customize colors, logos, and typography to match the Sunrise Nursery brand identity.'}
            </p>
          </div>
          <button className="bg-white text-primary w-full py-4 rounded-2xl font-black hover:bg-orange-50 transition-all active:scale-95 shadow-lg">
            {isRtl ? 'فتح محرر المظهر' : 'Open Theme Editor'}
          </button>
        </div>
      </div>
    </div>
  );
}
