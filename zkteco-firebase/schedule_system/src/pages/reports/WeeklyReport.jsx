import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../contexts/LanguageContext';
import { db } from '../../config/firebase';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { format, startOfWeek, endOfWeek, subWeeks, addWeeks } from 'date-fns';
import { BarChart3, ChevronLeft, ChevronRight, Activity, CalendarCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function WeeklyReport() {
  const { t, lang } = useTranslation();
  const isRtl = lang === 'ar';

  const [currentDate, setCurrentDate] = useState(new Date());
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  const start = startOfWeek(currentDate, { weekStartsOn: 0 }); // Sunday
  const end = endOfWeek(currentDate, { weekStartsOn: 0 });

  useEffect(() => {
    loadWeeklyStats();
  }, [currentDate]);

  const loadWeeklyStats = async () => {
    setLoading(true);
    try {
      const startStr = format(start, 'yyyy-MM-dd');
      const endStr = format(end, 'yyyy-MM-dd');
      
      const q = query(
        collection(db, 'sessions'),
        where('date', '>=', startStr),
        where('date', '<=', endStr)
      );
      
      const snap = await getDocs(q);
      const sessions = snap.docs.map(doc => doc.data());

      let total = sessions.length;
      let completed = sessions.filter(s => s.status === 'completed').length;
      let cancelled = sessions.filter(s => s.status === 'cancelled').length;
      let scheduled = total - completed - cancelled; // roughly

      const specAgg = {};
      sessions.forEach(s => {
        if (!s.specialistName) return;
        if (!specAgg[s.specialistName]) {
          specAgg[s.specialistName] = { total: 0, completed: 0 };
        }
        specAgg[s.specialistName].total += 1;
        if (s.status === 'completed') {
           specAgg[s.specialistName].completed += 1;
        }
      });

      setReportData({
        total,
        completed,
        cancelled,
        scheduled,
        specialistData: Object.entries(specAgg).map(([name, data]) => ({
          name,
          ...data,
          rate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0
        })).sort((a, b) => b.total - a.total)
      });
      
    } catch (err) {
      console.error("Weekly Report Error:", err);
      if (err.message?.includes('index')) {
        toast.error('Firestore Index required. Check console for link.');
      } else {
        toast.error('Failed to generate weekly report');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePrevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const handleNextWeek = () => setCurrentDate(addWeeks(currentDate, 1));

  return (
    <div className={`space-y-8 animate-in fade-in duration-500 ${isRtl ? 'text-right rtl' : 'text-left'}`}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t('weekly_intelligence')}</h2>
          <p className="text-gray-500 font-medium">{t('clinical_performance_desc')}</p>
        </div>
        
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center p-1.5 gap-2">
          <button onClick={handlePrevWeek} className="p-2 bg-gray-50 hover:bg-orange-50 hover:text-primary rounded-xl transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div className="px-4 font-black flex items-center gap-2 text-navy">
             <CalendarCheck size={18} className="text-primary"/>
             {format(start, 'MMM d')} - {format(end, 'MMM d, yyyy')}
          </div>
          <button onClick={handleNextWeek} className="p-2 bg-gray-50 hover:bg-orange-50 hover:text-primary rounded-xl transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-20 text-center text-gray-400 font-bold animate-pulse">{t('compiling_vectors')}</div>
      ) : reportData ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 border-l-4 border-l-primary">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{t('total_volume')}</p>
              <h3 className="text-4xl font-black text-slate-900">{reportData.total}</h3>
            </div>
            <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 border-l-4 border-l-emerald-500">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{t('completed')}</p>
              <h3 className="text-4xl font-black text-emerald-600">{reportData.completed}</h3>
            </div>
            <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 border-l-4 border-l-orange-500">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{t('scheduled_booked')}</p>
              <h3 className="text-4xl font-black text-orange-600">{reportData.scheduled}</h3>
            </div>
            <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 border-l-4 border-l-red-500">
               <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{t('cancelled_label')}</p>
               <h3 className="text-4xl font-black text-red-600">{reportData.cancelled}</h3>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-gray-100">
            <div className="flex items-center gap-3 border-b border-gray-50 pb-6 mb-8">
              <div className="w-12 h-12 bg-orange-50 text-primary rounded-2xl flex items-center justify-center">
                <BarChart3 size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">{t('specialist_throughput')}</h3>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('session_dist_metric')}</p>
              </div>
            </div>

            <div className="space-y-6">
              {reportData.specialistData.length === 0 ? (
                <p className="text-center text-gray-400 font-bold italic py-8">{t('no_activity_recorded')}</p>
              ) : (
                reportData.specialistData.map(stat => (
                  <div key={stat.name} className="flex flex-col md:flex-row items-center gap-6 group">
                     <div className="md:w-64 w-full flex justify-between md:justify-start items-center gap-3">
                        <span className="font-bold text-slate-800 text-sm">{stat.name}</span>
                        <div className="flex bg-gray-50 rounded-lg px-2 py-1 gap-2">
                           <span className="text-xs font-black text-slate-900" title="Total">{stat.total}</span>
                           <span className="text-xs font-bold text-emerald-600 border-l pl-2" title="Completed">{stat.completed}</span>
                        </div>
                     </div>
                     <div className="flex-1 w-full bg-gray-50 h-6 rounded-full overflow-hidden flex shadow-inner relative">
                        <div 
                          className="bg-primary/20 h-full transition-all duration-1000 ease-out" 
                          style={{ width: `${Math.min((stat.total / (reportData.total || 1)) * 100, 100)}%` }}
                        ></div>
                        <div 
                          className="absolute left-0 top-0 h-full bg-primary transition-all duration-1000 ease-out"
                          style={{ width: `${Math.min((stat.completed / (reportData.total || 1)) * 100, 100)}%` }}
                        ></div>
                     </div>
                     <div className="w-16 text-right">
                       <span className="text-sm font-black text-gray-400">{stat.rate}%</span>
                     </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="mt-8 flex items-center justify-end gap-6 text-xs font-bold text-gray-400 uppercase tracking-widest border-t border-gray-50 pt-6">
              <div className="flex items-center gap-2">
                 <div className="w-3 h-3 bg-primary/20 rounded"></div> {t('scheduled_booked')}
              </div>
              <div className="flex items-center gap-2">
                 <div className="w-3 h-3 bg-primary rounded"></div> {t('completed')}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
