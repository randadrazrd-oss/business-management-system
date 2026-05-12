import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../contexts/LanguageContext';
import { db } from '../../config/firebase';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { AreaChart, ChevronLeft, ChevronRight, Calendar, UserRound } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function MonthlyReport() {
  const { t, lang } = useTranslation();
  const isRtl = lang === 'ar';

  const [currentDate, setCurrentDate] = useState(new Date());
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  const start = startOfMonth(currentDate);
  const end = endOfMonth(currentDate);

  useEffect(() => {
    loadMonthlyStats();
  }, [currentDate]);

  const loadMonthlyStats = async () => {
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

      // Calculate daily trends
      const daysInMonth = parseInt(format(end, 'd'), 10);
      const trends = Array.from({ length: daysInMonth }, (_, i) => ({
        day: i + 1,
        total: 0,
        completed: 0
      }));

      const specAgg = {};
      sessions.forEach(s => {
        // day aggregation
        if (s.date) {
          const dStr = s.date.split('-')[2];
          if (dStr) {
            const dNum = parseInt(dStr, 10);
            if (dNum > 0 && dNum <= daysInMonth) {
              trends[dNum - 1].total += 1;
              if (s.status === 'completed') trends[dNum - 1].completed += 1;
            }
          }
        }

        // specialist aggregation
        if (!s.specialistName) return;
        if (!specAgg[s.specialistName]) specAgg[s.specialistName] = 0;
        if (s.status === 'completed') {
          specAgg[s.specialistName] += 1;
        }
      });

      const topPerformer = Object.keys(specAgg).length > 0
        ? Object.entries(specAgg).reduce((a, b) => a[1] > b[1] ? a : b)
        : null;

      setReportData({
        total,
        completed,
        cancelled,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        trends,
        topPerformer: topPerformer ? { name: topPerformer[0], count: topPerformer[1] } : null
      });

    } catch (err) {
      console.error("Monthly Report Error:", err);
      if (err.message?.includes('index')) {
        toast.error('Firestore Index required. Check console for link.');
      } else {
        toast.error(t('monthly_report_failed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePrev = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNext = () => setCurrentDate(addMonths(currentDate, 1));

  // Determine max trend for scaling the chart
  const maxTrend = reportData ? Math.max(...reportData.trends.map(t => t.total), 1) : 1;

  return (
    <div className={`space-y-10 animate-in fade-in duration-700 ${isRtl ? 'text-right' : 'text-left'}`}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl md:text-4xl font-display font-black text-slate-900 tracking-tight">{t('monthly_analysis')}</h2>
          <p className="text-slate-500 font-medium text-sm md:text-base">{t('macro_clinical_view')}</p>
        </div>

        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-premium border border-white/50 flex items-center p-2 gap-3">
          <button onClick={handlePrev} className="p-2.5 bg-slate-50 hover:bg-primary-light hover:text-white rounded-xl transition-all interactive-button">
            <ChevronLeft size={20} strokeWidth={3} />
          </button>
          
          <div className="px-6 py-2 flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-lg hidden sm:block">
              <Calendar size={18} />
            </div>
            <span className="font-display font-black text-slate-900 whitespace-nowrap lg:text-lg">
              {format(currentDate, isRtl ? 'MMMM yyyy' : 'MMMM yyyy')}
            </span>
          </div>

          <button onClick={handleNext} className="p-2.5 bg-slate-50 hover:bg-primary-light hover:text-white rounded-xl transition-all interactive-button">
            <ChevronRight size={20} strokeWidth={3} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-20 text-center text-gray-400 font-bold animate-pulse">{t('running_aggregation')}</div>
      ) : reportData ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-gray-100 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary opacity-[0.05] -mr-16 -mt-16 rounded-full group-hover:scale-150 transition-transform"></div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 relative z-10">{t('total_clinical_yield')}</p>
              <h3 className="text-5xl font-black text-slate-900 relative z-10">{reportData.total}</h3>
              <div className="mt-4 flex gap-2 relative z-10">
                <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg text-xs font-black border border-emerald-100">
                  {reportData.completed} {t('completed_label')}
                </span>
                <span className="bg-red-50 text-red-600 px-3 py-1 rounded-lg text-xs font-black border border-red-100">
                  {reportData.cancelled} {t('cancelled_label')}
                </span>
              </div>
            </div>

            <div className="bg-primary rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden">
              <p className="text-xs font-black text-white/60 uppercase tracking-widest mb-2 relative z-10">{t('completion_rate')}</p>
              <div className="flex items-end gap-3 relative z-10">
                <h3 className="text-5xl font-black text-white">{reportData.completionRate}%</h3>
              </div>
              <div className="mt-8 w-full bg-white/20 h-2 rounded-full overflow-hidden relative z-10">
                <div className="bg-white h-full shadow-[0_0_15px_rgba(255,255,255,0.5)]" style={{ width: `${reportData.completionRate}%` }}></div>
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-gray-100 relative overflow-hidden flex flex-col justify-between">
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <UserRound size={14} className="text-primary" /> {t('top_performer')}
                </p>
                {reportData.topPerformer ? (
                  <>
                    <h3 className="text-2xl font-black text-slate-900 leading-tight">{reportData.topPerformer.name}</h3>
                    <p className="text-sm font-bold text-emerald-500 mt-1">{reportData.topPerformer.count} {t('completed_sessions_count')}</p>
                  </>
                ) : (
                  <p className="text-sm font-bold text-gray-400 italic mt-2">{t('no_data_yet')}</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-gray-100 mt-6">
            <div className="flex items-center gap-3 border-b border-gray-50 pb-6 mb-8">
              <div className="w-12 h-12 bg-orange-50 text-primary rounded-2xl flex items-center justify-center">
                <AreaChart size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">{t('daily_trajectory')}</h3>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t('session_density_across')} {format(start, 'MMMM')}</p>
              </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar pb-4 -mx-4 md:mx-0 px-4 md:px-0">
              <div className="h-64 flex items-end gap-1 md:gap-2 mt-12 pb-6 border-b border-gray-50 min-w-[600px] md:min-w-0">
                {reportData.trends.map((t_data, idx) => {
                  const totalHeight = `${(t_data.total / maxTrend) * 100}%`;
                  const completedHeight = `${t_data.total > 0 ? (t_data.completed / t_data.total) * 100 : 0}%`;
                  return (
                    <div key={idx} className="flex-1 flex flex-col justify-end items-center group relative h-full">
                      <div
                        className="w-full max-w-[12px] bg-gray-100 rounded-t-sm relative transition-all group-hover:bg-orange-100"
                        style={{ height: totalHeight, minHeight: t_data.total > 0 ? '4px' : '0' }}
                      >
                        <div
                          className="absolute bottom-0 left-0 w-full bg-emerald-400 rounded-t-sm"
                          style={{ height: completedHeight }}
                        ></div>
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 text-white text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-20">
                          {t('day')} {t_data.day}: {t_data.total} ({t_data.completed})
                        </div>
                      </div>
                      <span className="text-[9px] font-bold text-gray-300 mt-2">{t_data.day}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
