import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserRound,
  Calendar as CalendarIcon,
  CheckCircle2,
  DatabaseZap,
  Clock,
  ClipboardList,
  Search,
  Plus,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Filter,
  ArrowRight,
  BarChart3,
  Activity,
  Maximize2,
  Minimize2,
  RefreshCw,
  TrendingUp,
  AlertCircle,
  CalendarCheck
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell
} from 'recharts';
import { getSpecialists } from '../services/specialistService';
import { getChildren } from '../services/childService';
import { cancelSession } from '../services/bookingService';
import { useAllSchedules } from '../hooks/useAllSchedules';
import { useTranslation } from '../contexts/LanguageContext';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useBooking } from '../hooks/useBooking';
import BookingModal from '../components/BookingModal';

export default function Dashboard() {
  const { t, lang } = useTranslation();
  const isRtl = lang === 'ar';

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [specialists, setSpecialists] = useState([]);
  const [children, setChildren] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [activeSpecId, setActiveSpecId] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  const { completeSlot, isProcessing: isBookingProcessing } = useBooking();

  // Keep internal clock for "Live Now" monitoring
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    Promise.all([getSpecialists(), getChildren()]).then(([specData, childData]) => {
      setSpecialists(specData);
      setChildren(childData);
      setLoading(false);
    });
  }, []);

  const { schedules, loading: schedulesLoading } = useAllSchedules(specialists, selectedDate);

  // --- Data Transformations for Analytics ---

  const analyticsData = useMemo(() => {
    const workload = specialists.map(spec => {
      const slots = schedules[spec.id] || [];
      const booked = slots.filter(s => s.status === 'booked').length;
      const completed = slots.filter(s => s.status === 'completed').length;
      return {
        name: spec.name.split(' ')[0], // Short name for chart
        booked: booked + completed,
        completed,
        total: slots.length,
        fill: (booked + completed) > 0 ? '#ea580c' : '#fef3c7'
      };
    });

    const hourMap = {};
    Object.values(schedules).forEach(slots => {
      slots.forEach(slot => {
        if (slot.status === 'booked') {
          const hour = slot.time.split(':')[0] + ":00";
          hourMap[hour] = (hourMap[hour] || 0) + 1;
        }
      });
    });

    const flow = Object.keys(hourMap)
      .sort()
      .map(hour => ({ hour, sessions: hourMap[hour] }));

    return { workload, flow };
  }, [schedules, specialists]);

  const stats = useMemo(() => {
    let bookedCount = 0;
    let completedCount = 0;
    Object.values(schedules).forEach(slots => {
      bookedCount += slots.filter(s => s.status === 'booked').length;
      completedCount += slots.filter(s => s.status === 'completed').length;
    });
    return {
      totalBookedToday: bookedCount,
      totalCompletedToday: completedCount,
      specialistsWorking: specialists.length
    };
  }, [schedules, specialists]);
  
  const totalChildren = children.length;
  const todaySessionsCount = stats.totalBookedToday + stats.totalCompletedToday;

  const insights = useMemo(() => {
    const peak = [...analyticsData.flow].sort((a, b) => b.sessions - a.sessions)[0];
    const topSpec = [...analyticsData.workload].sort((a, b) => b.booked - a.booked)[0];
    
    return {
      peakTime: peak?.sessions > 0 ? peak.hour : null,
      topSpec: topSpec?.booked > 0 ? topSpec.name : null,
      completionRate: stats.totalBookedToday + stats.totalCompletedToday > 0 
        ? Math.round((stats.totalCompletedToday / (stats.totalBookedToday + stats.totalCompletedToday)) * 100) 
        : 0
    };
  }, [analyticsData, stats]);

  const checkIsLive = (specId) => {
    const slots = schedules[specId] || [];
    const nowStr = currentTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    return slots.some(slot => {
      if (slot.status !== 'booked') return false;
      const [sh, sm] = slot.time.split(':').map(Number);
      const [nh, nm] = nowStr.split(':').map(Number);
      const startMinutes = sh * 60 + sm;
      const nowMinutes = nh * 60 + nm;
      return nowMinutes >= startMinutes && nowMinutes < startMinutes + 45;
    });
  };

  const handleCancel = async (session, specialistId) => {
    if (!window.confirm(t('cancel_appointment_confirm'))) return;
    try {
      await cancelSession(session.sessionId, {
        specialistId,
        childId: session.childId,
        date: selectedDate,
        time: session.time
      });
      toast.success(t('appointment_cancelled'));
    } catch (err) {
      console.error(err);
      toast.error(t('cancel_failed'));
    }
  };

  const handleOpenComplete = (session, specialistId) => {
    setActiveSession(session);
    setActiveSpecId(specialistId);
    setClinicalNotes('');
    setIsCompleteModalOpen(true);
  };

  const submitComplete = async (e) => {
    e.preventDefault();
    const res = await completeSlot(
      activeSession.sessionId,
      {
        specialistId: activeSpecId,
        childId: activeSession.childId,
        date: selectedDate,
        time: activeSession.time
      },
      clinicalNotes
    );

    if (res.success) {
      toast.success(t('session_completed_success'));
      setIsCompleteModalOpen(false);
    } else {
      toast.error(res.error || t('session_complete_failed'));
    }
  };


  return (
    <div className={`space-y-10 animate-in fade-in duration-700 ${isRtl ? 'text-right' : 'text-left'}`}>
      
      {/* Stats Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="premium-card p-6 md:p-8 group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
              <Users size={22} strokeWidth={2.5} />
            </div>
            <div className="flex items-center gap-1 text-emerald-600 font-bold text-xs bg-emerald-50 px-2.5 py-1 rounded-full">
              <TrendingUp size={14} /> +12%
            </div>
          </div>
          <p className="text-slate-500 font-semibold text-xs tracking-wider uppercase mb-1">{t('active_children')}</p>
          <h3 className="text-3xl md:text-4xl font-display font-black text-slate-900">{totalChildren}</h3>
        </div>

        <div className="premium-card p-6 md:p-8 group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl group-hover:bg-slate-800 group-hover:text-white transition-all duration-300">
              <CalendarCheck size={22} strokeWidth={2.5} />
            </div>
          </div>
          <p className="text-slate-500 font-semibold text-xs tracking-wider uppercase mb-1">{t('today_sessions')}</p>
          <h3 className="text-3xl md:text-4xl font-display font-black text-slate-900">{todaySessionsCount}</h3>
        </div>

        <div className="premium-card p-6 md:p-8 group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl group-hover:bg-orange-500 group-hover:text-white transition-all duration-300">
              <Activity size={22} strokeWidth={2.5} />
            </div>
          </div>
          <p className="text-slate-500 font-semibold text-xs tracking-wider uppercase mb-1">{t('clinical_occupancy')}</p>
          <h3 className="text-3xl md:text-4xl font-display font-black text-slate-900">
            {stats.specialistsWorking > 0 ? Math.round((todaySessionsCount / (stats.specialistsWorking * 8)) * 100) : 0}%
          </h3>
        </div>

        <div className="premium-card p-6 md:p-8 group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-red-50 text-red-600 rounded-xl group-hover:bg-red-500 group-hover:text-white transition-all duration-300">
              <AlertCircle size={22} strokeWidth={2.5} />
            </div>
          </div>
          <p className="text-slate-500 font-semibold text-xs tracking-wider uppercase mb-1">{t('pending_reports')}</p>
          <h3 className="text-3xl md:text-4xl font-display font-black text-slate-900">
            {stats.totalBookedToday}
          </h3>
        </div>
      </div>

      {/* Header Deck */}
      <div className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-200/50 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-[10px] text-indigo-600 border border-indigo-100/50">
              <DatabaseZap size={20} />
            </div>
            {t('overview')}
          </h2>
          <div className="flex items-center gap-2 text-slate-500 font-medium mt-2 text-xs md:text-sm px-1">
            <CalendarIcon size={14} className="text-indigo-500" />
            <span>{new Date(selectedDate).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row flex-wrap xl:flex-nowrap w-full xl:w-auto gap-3 items-center">
          <div className="flex bg-gray-50 border-2 border-gray-100 rounded-2xl p-1 w-full md:w-auto">
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${showAnalytics ? 'bg-white shadow-sm text-primary' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <div className="flex items-center gap-2">
                {showAnalytics ? <Minimize2 size={16} /> : <BarChart3 size={16} />}
                <span className="hidden sm:inline">{showAnalytics ? t('') : t('')}</span>
              </div>
            </button>
          </div>

          <div className="flex items-center bg-white border-2 border-gray-100 rounded-2xl px-4 py-2.5 shadow-sm focus-within:border-primary transition-all w-full sm:w-auto">
            <input
              type="date"
              className="bg-transparent font-black text-slate-900 outline-none p-1 text-sm cursor-pointer w-full"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          <div className="relative w-full sm:w-48 xl:w-64">
            <Search className={`absolute ${isRtl ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-gray-400`} size={16} />
            <input
              type="text"
              placeholder={t('filter_specialists')}
              className={`w-full bg-white border-2 border-gray-100 rounded-2xl ${isRtl ? 'pr-10' : 'pl-10'} py-2.5 font-bold focus:border-primary outline-none transition-all shadow-sm text-sm`}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto bg-primary text-white px-6 py-4 rounded-2xl font-black flex items-center justify-center gap-3 hover:opacity-90 transition-all shadow-xl shadow-primary/30 active:scale-95 whitespace-nowrap min-w-fit"
          >
            <Plus size={20} strokeWidth={3} />
            <span className="text-xs md:text-sm uppercase tracking-widest">{t('new_appointment')}</span>
          </button>
        </div>
      </div>

      {showAnalytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 lg:grid-rows-1 gap-6 animate-in slide-in-from-top-4 duration-500">
          <div className="lg:col-span-1 bg-white rounded-[2rem] p-6 border border-gray-100 shadow-xl shadow-gray-200/20 flex flex-col min-h-[350px]">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">{t('specialist_load')}</h4>
              <div className="p-2 bg-orange-50 rounded-lg"><BarChart3 size={14} className="text-primary" /></div>
            </div>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%" minHeight={200}>
                <BarChart data={analyticsData.workload}>
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 9, fontWeight: '900', fill: '#94a3b8' }}
                    interval={0}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: '900', padding: '1rem' }}
                  />
                  <Bar dataKey="booked" radius={[6, 6, 0, 0]}>
                    {analyticsData.workload.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.booked > 2 ? '#ea580c' : '#f59e0b'} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="md:col-span-2 bg-white rounded-[2rem] p-6 border border-gray-100 shadow-xl shadow-gray-200/20 flex flex-col min-h-[350px]">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">{t('clinic_traffic')}</h4>
              <div className="p-2 bg-primary/10 rounded-lg"><Activity size={14} className="text-primary" /></div>
            </div>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%" minHeight={200}>
                <AreaChart data={analyticsData.flow}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                  <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: '900', fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: '900' }} />
                  <Area type="monotone" dataKey="sessions" stroke="#f97316" strokeWidth={4} fill="#f97316" fillOpacity={0.1} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Simple Insight Card */}
          <div className="lg:col-span-1 bg-slate-900 text-white rounded-[2rem] p-8 shadow-xl shadow-slate-900/20 flex flex-col justify-center gap-4 border border-white/5 relative overflow-hidden group">
             <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 -mr-16 -mt-16 rounded-full blur-3xl group-hover:bg-primary/30 transition-all"></div>
             <div className="p-3 bg-primary rounded-2xl w-fit shadow-lg shadow-primary/20">
               <TrendingUp size={24} />
             </div>
             <div>
               <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-2">{t('clinical_insights')}</h4>
               <div className="space-y-4">
                 <div className="flex justify-between items-end border-b border-white/10 pb-4">
                   <div>
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('clinical_occupancy')}</p>
                     <p className="text-2xl font-black text-white">{stats.specialistsWorking > 0 ? Math.round((todaySessionsCount / (stats.specialistsWorking * 8)) * 100) : 0}%</p>
                   </div>
                   <div className="text-emerald-400 font-bold text-xs flex items-center gap-1 mb-1">
                     <TrendingUp size={14} /> +5%
                   </div>
                 </div>
                 <div className="flex justify-between items-end">
                   <div>
                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('pending_reports')}</p>
                     <p className="text-2xl font-black text-white">{stats.totalBookedToday}</p>
                   </div>
                   <div className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest mb-1 animate-pulse">
                     Action Req.
                   </div>
                 </div>
               </div>
             </div>
          </div>
        </div>
      )}

      {/* Main Board */}
      <div className="flex-1 min-h-[500px] bg-white rounded-[24px] border border-slate-200/50 p-6 md:p-8 overflow-hidden flex flex-col shadow-sm">
        <div className="flex items-center justify-between mb-8 shrink-0">
          <div className="flex items-center gap-4">
            <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3 underline decoration-primary decoration-4 underline-offset-8">
              <ClipboardList className="text-primary" />
              {t('upcoming_appointments')}
            </h3>
            <div className="bg-orange-50 text-primary px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.1em] flex items-center gap-2 border border-orange-100 animate-in fade-in zoom-in group">
              <div className="w-2.5 h-2.5 bg-primary rounded-full animate-pulse shadow-[0_0_10px_#ea580c]"></div>
              {t('live_monitor')}
            </div>
          </div>
          <div className="flex gap-3">
            <button className="p-3 bg-gray-50 rounded-2xl text-gray-400 hover:bg-orange-50 hover:text-primary transition-all active:scale-90"><ChevronLeft size={20} strokeWidth={3} /></button>
            <button className="p-3 bg-gray-50 rounded-2xl text-gray-400 hover:bg-orange-50 hover:text-primary transition-all active:scale-90"><ChevronRight size={20} strokeWidth={3} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-x-auto overflow-y-hidden flex gap-4 md:gap-8 pb-6 custom-scrollbar snap-x snap-mandatory px-2">
          {loading || schedulesLoading ? (
            <div className="w-full flex flex-col items-center justify-center py-20 gap-6">
              <div className="relative">
                <div className="w-20 h-20 border-[6px] border-orange-100 rounded-full"></div>
                <div className="w-20 h-20 border-[6px] border-primary rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
              </div>
              <p className="font-black text-navy uppercase tracking-[0.2em] text-sm animate-pulse">{t('syncing_data')}</p>
            </div>
          ) : (
            specialists
              .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
              .map(spec => {
                const isLive = checkIsLive(spec.id);
                return (
                  <div key={spec.id} className={`min-w-[280px] sm:min-w-[340px] max-w-[340px] flex flex-col bg-white rounded-[2rem] md:rounded-[2.5rem] border transition-all duration-500 overflow-hidden snap-center group hover:shadow-2xl hover:shadow-orange-500/10 ${isLive ? 'border-primary ring-4 md:ring-8 ring-primary/5' : 'border-gray-100'}`}>

                    {/* Header */}
                    <div className={`p-4 md:p-6 border-b shrink-0 transition-colors ${isLive ? 'bg-primary text-white' : 'bg-white'}`}>
                      <div className="flex items-center gap-3 md:gap-4">
                        <div className={`w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center font-black text-lg md:text-xl shadow-lg transition-all ${isLive ? 'bg-white/20 text-white rotate-3' : 'bg-orange-100 text-primary hover:-rotate-3'}`}>
                          {spec.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-black leading-tight truncate text-lg ${isLive ? 'text-white' : 'text-slate-900'}`}>{spec.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg ${isLive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'}`}>
                              {spec.specialization}
                            </span>
                            {isLive && (
                              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/20 rounded-lg animate-pulse">
                                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-white">Live</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sessions */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar bg-slate-50/50">
                      {(() => {
                        const activeSlots = (schedules[spec.id] || []).filter(s => s.status === 'booked' || s.status === 'completed');
                        if (activeSlots.length === 0) {
                          return (
                            <div className="flex flex-col items-center justify-center py-20 text-gray-300 gap-4">
                              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-inner">
                                <CalendarIcon size={32} className="opacity-10" />
                              </div>
                              <p className="text-[10px] font-bold uppercase tracking-widest">{t('no_sessions_assigned')}</p>
                            </div>
                          );
                        }

                        return activeSlots.map(slot => {
                          const isCompleted = slot.status === 'completed';
                          const childData = children.find(c => c.id === slot.session.childId);
                          const progress = childData ? Math.round(((childData.completedSessions || 0) / (childData.totalSessions || 1)) * 100) : 0;

                          return (
                            <div key={slot.time} className={`p-6 rounded-[2rem] border transition-all group/card relative overflow-hidden ${isCompleted ? 'bg-emerald-50/30 border-emerald-100' : 'bg-white border-gray-100 shadow-sm hover:border-primary/30 hover:shadow-xl'}`}>
                              <div className="absolute top-2 right-2 p-2 opacity-0 group-hover/card:opacity-100 transition-all transform scale-75 group-hover/card:scale-100 flex gap-2">
                                <Link
                                  to={`/children/${slot.session.childId}`}
                                  className="p-2 text-primary hover:text-white hover:bg-primary bg-orange-50 rounded-xl transition-colors"
                                >
                                  <Maximize2 size={16} strokeWidth={2.5} />
                                </Link>
                                {!isCompleted && (
                                  <>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleOpenComplete(slot.session, spec.id); }}
                                      className="p-2 text-emerald-500 hover:text-white hover:bg-emerald-600 bg-emerald-50 rounded-xl transition-colors"
                                    >
                                      <CheckCircle2 size={16} strokeWidth={2.5} />
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleCancel(slot.session, spec.id); }}
                                      className="p-2 text-red-400 hover:text-white hover:bg-red-600 bg-red-50 rounded-xl transition-colors"
                                    >
                                      <Trash2 size={16} strokeWidth={2.5} />
                                    </button>
                                  </>
                                )}
                              </div>

                              <div className="flex items-center gap-2 mb-4">
                                  <div className={`p-2 rounded-xl ${isCompleted ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-50 text-primary'}`}>
                                    {isCompleted ? <CheckCircle2 size={16} strokeWidth={3} /> : <Clock size={16} strokeWidth={3} />}
                                  </div>
                                  <span className={`font-black text-lg tracking-tight ${isCompleted ? 'text-emerald-900' : 'text-slate-900'}`}>{slot.time}</span>
                                {isCompleted && (
                                  <span className="text-[8px] font-black uppercase tracking-widest bg-emerald-500 text-white px-2 py-0.5 rounded-md">{t('completed')}</span>
                                )}
                              </div>

                              <Link to={`/children/${slot.session.childId}`} className="font-black text-slate-900 mb-4 truncate text-xl tracking-tight leading-none block hover:text-primary transition-colors flex items-center gap-2">
                                {slot.session.childName}
                                {slot.session.sessionType === 'recurring' && (
                                  <span className="text-[8px] bg-indigo-50 text-indigo-500 px-2 py-0.5 rounded uppercase font-black tracking-widest border border-indigo-100 shrink-0">
                                    Recurring
                                  </span>
                                )}
                              </Link>

                              <div className="space-y-4">
                                <div className="px-4 py-3 bg-gray-50/50 rounded-2xl border border-gray-100 group-hover/card:bg-orange-50 group-hover/card:border-orange-100 transition-colors">
                                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 leading-none">{t('diagnosis')}</p>
                                  <p className="text-xs font-bold text-slate-900 truncate leading-tight">{slot.session.diagnosis || t('clinical_review')}</p>
                                </div>

                                {childData && (
                                  <div className="px-1">
                                    <div className="flex justify-between text-[8px] font-black uppercase text-gray-400 mb-1">
                                      <span>{t('progress')}</span>
                                      <span>{progress}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-primary transition-all duration-1000"
                                        style={{ width: `${progress}%` }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>

                    <div className="p-5 bg-white border-t border-gray-50 text-center shrink-0">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                        {(schedules[spec.id] || []).filter(s => s.status === 'booked' || s.status === 'completed').length} {t('appointments_assigned')}
                      </span>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </div>

      <BookingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {/* Complete Modal */}
      {isCompleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-100 ring-1 ring-black/5">
            <div className="px-8 py-6 border-b border-gray-50 flex justify-between items-center bg-emerald-50/50">
              <h2 className="text-2xl font-black flex items-center gap-3 text-slate-900 tracking-tight">
                <CheckCircle2 className="text-emerald-500" /> {t('complete_log_notes')}
              </h2>
              <button onClick={() => setIsCompleteModalOpen(false)} className="text-gray-400 hover:text-gray-900 p-2 rounded-xl transition-colors">
                <Maximize2 className="rotate-45" size={28} />
              </button>
            </div>

            <form onSubmit={submitComplete} className="p-8 space-y-6">
              <div className="p-5 bg-emerald-50/50 rounded-2xl border-2 border-emerald-100/50 mb-4">
                <p className="text-xs text-emerald-600 font-black uppercase tracking-widest mb-1">{t('patient')}</p>
                <h4 className="font-black text-2xl text-slate-900">{activeSession?.childName}</h4>
                <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest">{activeSession?.time} • {selectedDate}</p>
              </div>

              <div>
                <label className="block text-sm font-black text-gray-700 mb-2 uppercase tracking-tight">{t('clinical_notes')}</label>
                <textarea
                  required
                  rows="4"
                  value={clinicalNotes}
                  onChange={e => setClinicalNotes(e.target.value)}
                  placeholder={t('session_notes_placeholder')}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-5 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all resize-none font-medium text-slate-900 text-sm"
                ></textarea>
              </div>

              <div className="pt-4">
                <button type="submit" disabled={isBookingProcessing} className="w-full py-5 font-black text-white bg-emerald-500 hover:bg-emerald-600 rounded-2xl shadow-xl shadow-emerald-500/30 transition-all disabled:opacity-50 active:scale-95 uppercase tracking-widest text-sm flex items-center justify-center gap-3">
                  {isBookingProcessing ? <RefreshCw size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
                  {isBookingProcessing ? t('loading') : t('complete_finalize')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
