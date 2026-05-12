import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getChildren, addChild, cleanupUnnamedChildren, deleteChild } from '../services/childService';
import { PlusCircle, X, UserRound, GraduationCap, ClipboardList, Info, Users, Database, Sparkles, RefreshCw, Trash2, ArrowRightCircle, TrendingUp, AlertCircle } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';

import { toast } from 'react-hot-toast';

export default function Children() {
  const { t, lang } = useTranslation();
  const isRtl = lang === 'ar';

  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCleaning, setIsCleaning] = useState(false);

  const handleCleanup = async () => {
    if (!window.confirm(isRtl ? 'سيتم حذف جميع سجلات الأطفال غير المسماة بشكل نهائي. هل ترغب في الاستمرار؟' : 'All unnamed child records will be permanently deleted. Proceed?')) return;

    setIsCleaning(true);
    try {
      const result = await cleanupUnnamedChildren();
      toast.success(isRtl ? `تم تنظيف ${result.deleted} سجل` : `Cleaned ${result.deleted} records`);
      await loadData();
    } catch (err) {
      toast.error(isRtl ? 'حدث خطأ أثناء التنظيف' : 'Cleanup failed');
    } finally {
      setIsCleaning(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(isRtl ? 'هل أنت متأكد من حذف هذا السجل؟' : 'Are you sure you want to delete this record?')) return;
    try {
      await deleteChild(id);
      toast.success(isRtl ? 'تم الحذف' : 'Deleted successfully');
      loadData();
    } catch (err) {
      toast.error(isRtl ? 'فشل الحذف' : 'Delete failed');
    }
  };

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    diagnosis: '',
    notes: '',
    totalSessions: 12
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getChildren();
      setChildren(data);
    } catch (err) {
      console.error(err);
      toast.error(isRtl ? 'فشل تحميل البيانات' : 'Failed to load data');
    }
    setLoading(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.diagnosis) {
      toast.error(isRtl ? 'يرجى ملء الاسم والتشخيص' : 'Name and Diagnosis are required');
      return;
    }

    setIsSubmitting(true);
    try {
      const newChildData = {
        name: formData.name,
        age: Number(formData.age) || 0,
        diagnosis: formData.diagnosis,
        notes: formData.notes,
        totalSessions: Number(formData.totalSessions) || 12
      };

      await addChild(newChildData);
      toast.success(isRtl ? 'تمت إضافة الطفل بنجاح' : 'Child added successfully');
      await loadData();
      setFormData({ name: '', age: '', diagnosis: '', notes: '', totalSessions: 12 });
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
      toast.error(isRtl ? 'فشل في الحفظ' : 'Failed to save');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`space-y-10 animate-in fade-in duration-700 ${isRtl ? 'text-right' : 'text-left'} lg:-m-8 lg:p-8`}>
      <div className="premium-card p-4 md:p-8 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 -mr-32 -mt-32 rounded-full pointer-events-none"></div>
        <div className="w-full xl:w-auto relative z-10">
          <h2 className="text-2xl md:text-4xl font-display font-black text-slate-900 tracking-tighter flex items-center gap-3">
            <div className="p-2 md:p-3 bg-primary text-white rounded-[1.2rem] shadow-xl shadow-primary/20">
              <Users size={24} className="md:w-7 md:h-7" />
            </div>
            {t('children')}
          </h2>
          <div className="flex items-center gap-2 text-slate-400 font-bold mt-2 text-xs md:text-sm px-1">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-sm shadow-emerald-500/50"></div>
            <span>{t('total_children')}: {children.length} {isRtl ? 'سجل نشط' : 'Active Clinical Profiles'}</span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto relative z-10">
          <button
            onClick={handleCleanup}
            disabled={isCleaning}
            className="w-full sm:w-auto bg-slate-50 hover:bg-slate-100 text-slate-500 px-6 py-4 rounded-2xl font-black flex items-center justify-center gap-3 transition-all active:scale-95 whitespace-nowrap border border-slate-100 interactive-button"
          >
            {isCleaning ? <RefreshCw className="animate-spin" size={20} /> : <Database size={20} />}
            <span className="text-[10px] uppercase tracking-[0.2em]">{isRtl ? 'تنظيف البيانات' : 'Cleanup DB'}</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto bg-primary hover:opacity-90 text-white px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-3 transition-all shadow-xl shadow-primary/20 active:scale-95 whitespace-nowrap interactive-button"
          >
            <PlusCircle size={22} strokeWidth={3} />
            <span className="text-sm uppercase tracking-widest">{t('add_child')}</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] shadow-2xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr className="text-gray-400 font-black text-[10px] uppercase tracking-[0.2em]">
                <th className="px-10 py-6">{isRtl ? 'اسم الطفل' : 'Child Identity'}</th>
                <th className="px-8 py-6">{isRtl ? 'الحالة' : 'Improvement'}</th>
                <th className="px-8 py-6">{isRtl ? 'التقدم' : 'Session Progress'}</th>
                <th className="px-8 py-6">{t('diagnosis')}</th>
                <th className="px-8 py-6 text-center">{isRtl ? 'إجراءات' : 'Controls'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative">
                        <div className="w-14 h-14 border-4 border-orange-100 rounded-full"></div>
                        <div className="w-14 h-14 border-4 border-primary rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
                      </div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Accessing Clinical Records...</p>
                    </div>
                  </td>
                </tr>
              ) : children.length > 0 ? (
                children.map(child => (
                  <tr key={child.id} className="hover:bg-orange-50/30 transition-colors group">
                    <td className="px-10 py-6">
                      <Link to={`/children/${child.id}`} className="flex items-center gap-4 hover:opacity-80 transition-opacity">
                        <div className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center font-black text-lg shadow-lg shadow-primary/10 transition-transform group-hover:rotate-6">
                          {child.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <span className="font-black text-slate-900 text-base">{child.name || 'Unnamed Record'}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest">{child.age} yrs • {isRtl ? 'ملف نشط' : 'Active Profile'}</span>
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-8 py-6">
                      {child.improvementStatus === 'attention' ? (
                        <div className="flex items-center gap-2 text-red-600 font-black text-[10px] uppercase animate-pulse">
                          <AlertCircle size={14} /> Attention
                        </div>
                      ) : child.improvementStatus === 'improving' ? (
                        <div className="flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase">
                          <TrendingUp size={14} /> Improving
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase">
                          <Sparkles size={14} /> Stable
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-2 w-42">
                        <div className="flex justify-between text-[10px] font-black uppercase text-gray-400">
                          <span>{child.completedSessions || 0} / {child.totalSessions || 0}</span>
                          <span>{Math.round(((child.completedSessions || 0) / (child.totalSessions || 1)) * 100)}%</span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-200/50">
                          <div
                            className="h-full bg-primary transition-all duration-1000"
                            style={{ width: `${((child.completedSessions || 0) / (child.totalSessions || 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="bg-orange-50 text-primary px-4 py-1.5 rounded-xl text-[10px] font-black border border-orange-100 uppercase tracking-widest">
                        {child.diagnosis}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="flex justify-center gap-2">
                        <Link
                          to={`/children/${child.id}`}
                          className="p-2.5 bg-gray-50 hover:bg-orange-50 text-gray-300 hover:text-primary rounded-xl transition-all opacity-0 group-hover:opacity-100 active:scale-95"
                        >
                          <ArrowRightCircle size={18} />
                        </Link>
                        <button
                          onClick={() => handleDelete(child.id)}
                          className="p-2.5 bg-gray-50 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-xl transition-all opacity-0 group-hover:opacity-100 active:scale-95"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="p-20 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-30 grayscale">
                      <Users size={48} />
                      <p className="text-sm font-black uppercase tracking-widest font-sans italic">{t('no_data')}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Child Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-3xl overflow-hidden animate-in zoom-in-95 duration-500 border border-white/20">
            <div className="flex justify-between items-center p-10 border-b border-gray-50 bg-gray-50">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-primary text-white rounded-[2rem] flex items-center justify-center shadow-sm">
                  <UserRound size={32} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tighter leading-none">
                    {isRtl ? 'إضافة طفل' : 'Register Profile'}
                  </h3>
                  <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest">Child Clinical Enrollment</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-300 hover:text-primary p-3 rounded-2xl transition-all hover:bg-gray-50"
              >
                <X size={32} strokeWidth={3} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-10 space-y-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t('full_name')} *</label>
                <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full bg-gray-50 border-2 border-gray-100 rounded-[1.5rem] px-6 py-5 focus:border-primary focus:bg-white transition-all outline-none font-bold text-slate-900" placeholder={isRtl ? "مثال: يوسف أحمد" : "e.g. Adam Ahmed"} />
              </div>

              <div className="grid grid-cols-3 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t('age')} (Years)</label>
                  <input type="number" name="age" value={formData.age} onChange={handleChange} className="w-full bg-gray-50 border-2 border-gray-100 rounded-[1.5rem] px-6 py-5 focus:border-primary focus:bg-white transition-all outline-none font-black text-xl text-slate-900" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{isRtl ? 'إجمالي الجلسات' : 'Total Sessions'} *</label>
                  <input required type="number" name="totalSessions" value={formData.totalSessions} onChange={handleChange} className="w-full bg-gray-50 border-2 border-gray-100 rounded-[1.5rem] px-6 py-5 focus:border-primary focus:bg-white transition-all outline-none font-black text-xl text-slate-900" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t('diagnosis')} *</label>
                  <input required type="text" name="diagnosis" value={formData.diagnosis} onChange={handleChange} className="w-full bg-gray-50 border-2 border-gray-100 rounded-[1.5rem] px-6 py-5 focus:border-primary focus:bg-white transition-all outline-none font-bold text-slate-900" placeholder={isRtl ? "التشخيص الطبي" : "Diagnosis"} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t('notes')}</label>
                <textarea name="notes" value={formData.notes} onChange={handleChange} rows="3" className="w-full bg-gray-50 border-2 border-gray-100 rounded-[2rem] px-6 py-5 focus:border-primary focus:bg-white transition-all outline-none resize-none font-medium text-slate-900 text-sm" placeholder={isRtl ? "ملاحظات إضافية..." : "Additional observations..."}></textarea>
              </div>

              <div className="pt-6 flex gap-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-5 rounded-[2rem] font-black text-gray-400 hover:bg-gray-50 transition-all uppercase tracking-widest text-xs">
                  {t('cancel')}
                </button>
                <button type="submit" disabled={isSubmitting} className="flex-[2] bg-primary text-white font-black py-5 rounded-[2rem] shadow-sm hover:opacity-90 transition-all disabled:opacity-50 active:scale-95 text-sm uppercase tracking-widest">
                  {isSubmitting ? t('loading') : (isRtl ? 'تأكيد التسجيل' : 'Finalize Registration')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

