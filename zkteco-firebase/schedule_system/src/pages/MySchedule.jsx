import React, { useState, useEffect } from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { fetchDailySchedule } from '../services/sessionService';
import { format, addDays, startOfWeek } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { Calendar, UserRound, Coffee } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function MySchedule() {
  const { t, lang } = useTranslation();
  const { userProfile } = useAuth();
  const isRtl = lang === 'ar';
  const locale = isRtl ? ar : enUS;

  const [weekDates, setWeekDates] = useState([]);
  const [scheduleData, setScheduleData] = useState({});
  const [loading, setLoading] = useState(true);

  // Notes Modal State
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const [notesData, setNotesData] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!userProfile?.specialistId) return;
    
    // Generate dates for current week (Sun - Thu)
    const start = startOfWeek(new Date(), { weekStartsOn: 0 });
    const dates = Array.from({ length: 5 }).map((_, i) => addDays(start, i));
    setWeekDates(dates);
    
    loadWeekSchedule(dates);
  }, [userProfile]);

  const loadWeekSchedule = async (dates) => {
    setLoading(true);
    try {
      const data = {};
      for (const date of dates) {
        const dateStr = format(date, 'yyyy-MM-dd');
        // fetchDailySchedule returns the full grid, we filter to just this specialist
        const dailyGrid = await fetchDailySchedule(date);
        const myObj = dailyGrid.find(s => s.specialistId === userProfile.specialistId);
        data[dateStr] = myObj ? myObj.slots : [];
      }
      setScheduleData(data);
    } catch (err) {
      toast.error('Failed to load schedule');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!userProfile?.specialistId) {
    return <div className="p-8 text-center text-gray-500">Not linked to a specialist profile.</div>;
  }

  const handleOpenNotes = (session, notes) => {
    setActiveSession(session);
    setNotesData(notes || '');
    setIsNotesModalOpen(true);
  };

  const submitNotes = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { updateSessionNotes } = await import('../services/sessionService');
      await updateSessionNotes(activeSession.id, notesData);
      toast.success(isRtl ? 'تم حفظ الملاحظات السريرية' : 'Clinical notes saved');
      setIsNotesModalOpen(false);
      loadWeekSchedule(weekDates); // Refresh
    } catch (err) {
      toast.error('Failed to save notes');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`space-y-8 animate-in fade-in duration-500 ${isRtl ? 'text-right rtl' : 'text-left'}`}>
      <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg">
            <UserRound size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900">{userProfile.displayName}</h2>
            <div className="flex gap-2 mt-2">
              <span className="bg-orange-50 text-primary px-3 py-1 text-xs font-bold rounded-lg uppercase tracking-widest border border-orange-100">
                {userProfile.specialistSubRole || 'Specialist'}
              </span>
              <span className="bg-emerald-50 text-emerald-600 px-3 py-1 text-xs font-bold rounded-lg uppercase tracking-widest border border-emerald-100 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
              </span>
            </div>
          </div>
        </div>
        <div className="hidden lg:block text-right">
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">{isRtl ? 'الأسبوع الحالي' : 'Current Week'}</p>
          <p className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Calendar size={20} className="text-primary"/> 
            {weekDates.length > 0 && `${format(weekDates[0], 'MMM d')} - ${format(weekDates[weekDates.length - 1], 'MMM d, yyyy')}`}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="p-20 text-center text-gray-400 font-bold animate-pulse">Synchronizing clinical schedule...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {weekDates.map(date => {
            const dateStr = format(date, 'yyyy-MM-dd');
            let daySlots = scheduleData[dateStr] || [];
            
            // Only show reserved/completed sessions
            daySlots = daySlots.filter(slot => slot.status !== 'free');

            const hasSlots = daySlots.length > 0;

            return (
              <div key={dateStr} className="bg-white rounded-[2rem] shadow-lg border border-gray-100 overflow-hidden flex flex-col h-full opacity-95 hover:opacity-100 transition-opacity">
                <div className="bg-slate-900 p-4 text-center text-white">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/70">{format(date, 'EEEE', { locale })}</p>
                  <p className="text-xl font-black">{format(date, 'do', { locale })}</p>
                </div>
                
                <div className="p-4 flex-1 bg-gray-50/50 space-y-3 overflow-y-auto">
                  {!hasSlots ? (
                    <div className="h-full flex items-center justify-center py-8">
                       <p className="text-xs text-gray-400 font-bold text-center">No assignments</p>
                    </div>
                  ) : (
                    daySlots.map(slot => {
                      const isBreak = slot.type === 'break';
                      if (isBreak) {
                        return (
                          <div key={slot.time} className="p-4 rounded-xl border-2 bg-orange-50 border-orange-100 flex items-center justify-center gap-3 text-orange-400 min-h-[80px]">
                            <Coffee size={24} />
                            <div>
                              <p className="font-black uppercase tracking-widest text-xs">{isRtl ? 'استراحة' : 'Break'}</p>
                              <p className="text-[10px] font-bold">{slot.time} - {slot.endTime}</p>
                            </div>
                          </div>
                        );
                      }

                      const hasNotes = slot.notes && slot.notes.trim().length > 0;
                      return (
                      <div key={slot.time} className={`p-4 rounded-xl border-2 flex flex-col justify-between ${slot.status === 'booked' ? 'bg-orange-50/50 border-orange-100' : slot.status === 'completed' ? (hasNotes ? 'bg-emerald-50/50 border-emerald-200' : 'bg-teal-50/50 border-teal-200 border-dashed') : 'bg-white border-gray-100 shadow-sm'}`}>
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-black text-slate-900 text-lg">{slot.time}</span>
                            <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md ${slot.status === 'booked' ? 'bg-orange-200 text-orange-800' : slot.status === 'completed' ? (hasNotes ? 'bg-emerald-500 text-white shadow-md' : 'bg-teal-100 text-teal-800') : 'bg-gray-100 text-gray-400'}`}>
                              {slot.status === 'completed' ? (hasNotes ? (isRtl ? 'مكتملة بملاحظات' : 'Complete (Notes)') : (isRtl ? 'مكتملة بدون ملاحظات' : 'Complete (No Notes)')) : slot.status}
                            </span>
                          </div>
                          {slot.session && (
                            <div className="mt-2 bg-white/60 p-2 rounded-lg border border-white/40">
                              <p className="text-sm font-black text-primary truncate" title={slot.session.childName}>
                                {slot.session.childName}
                              </p>
                              {slot.session.planFocus && (
                                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mt-1">{slot.session.planFocus}</p>
                              )}
                            </div>
                          )}
                        </div>
                        {slot.status === 'completed' && slot.session && (
                          <div className="mt-3 pt-3 border-t border-black/5">
                            <button
                              onClick={() => handleOpenNotes(slot.session, slot.notes)}
                              className={`w-full py-2 rounded-lg font-black text-xs uppercase tracking-widest transition-all active:scale-95 border ${hasNotes ? 'bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50 shadow-sm' : 'bg-teal-500 text-white border-transparent hover:bg-teal-600 shadow-md'}`}
                            >
                              {hasNotes ? (isRtl ? 'تعديل الملاحظات' : 'Edit Notes') : (isRtl ? 'إضافة ملاحظات سريرية' : 'Add Clinical Notes')}
                            </button>
                          </div>
                        )}
                      </div>
                    )})
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Notes Modal */}
      {isNotesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 text-left" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-100">
            <div className="px-8 py-6 border-b border-gray-50 flex justify-between items-center bg-teal-50/50">
              <h2 className="text-2xl font-black flex items-center gap-3 text-slate-900 tracking-tight">
                {isRtl ? 'الملاحظات السريرية' : 'Clinical Notes'}
              </h2>
              <button onClick={() => setIsNotesModalOpen(false)} className="text-gray-400 hover:text-gray-900 p-2 rounded-xl transition-colors">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            <form onSubmit={submitNotes} className="p-8 space-y-6">
              <div className="p-5 bg-gray-50 rounded-2xl border-2 border-gray-100 mb-4">
                <p className="text-xs text-primary font-black uppercase tracking-widest mb-1">{isRtl ? 'المريض' : 'Patient'}</p>
                <h4 className="font-black text-2xl text-slate-900">{activeSession?.childName}</h4>
              </div>

              <div>
                <label className="block text-sm font-black text-gray-700 mb-2 uppercase tracking-tight">{isRtl ? 'ملاحظات الجلسة السريرية' : 'Session Observations (Optional)'}</label>
                <textarea
                  rows="5"
                  value={notesData}
                  onChange={e => setNotesData(e.target.value)}
                  placeholder={isRtl ? 'اكتب ملاحظاتك حول تقدم الطفل في هذه الجلسة...' : 'Record child progress and observations...'}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-5 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all resize-none font-medium text-slate-900 text-sm"
                ></textarea>
              </div>

              <div className="pt-4">
                <button type="submit" disabled={isSaving} className="w-full py-5 font-black text-white bg-teal-500 hover:bg-teal-600 rounded-2xl shadow-xl shadow-teal-500/30 transition-all disabled:opacity-50 active:scale-95 uppercase tracking-widest text-sm text-center">
                  {isSaving ? (isRtl ? 'جاري الحفظ...' : 'Saving...') : (isRtl ? 'حفظ الملاحظات' : 'Save Notes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
