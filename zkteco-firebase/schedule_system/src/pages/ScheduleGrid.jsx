import React, { useState, useEffect } from 'react';
import { useSchedule } from '../hooks/useSchedule';
import { useBooking } from '../hooks/useBooking';
import { useTranslation } from '../contexts/LanguageContext';
import { getChildren, addChild } from '../services/childService';
import { getSpecialists } from '../services/specialistService';
import { Calendar, User, CheckCircle2, XCircle, Clock, Trash2, Edit2, Plus, UserRound, X, Search, RefreshCw, Coffee } from 'lucide-react';
import { toast } from 'react-hot-toast';
import BookingModal from '../components/BookingModal';

const ScheduleGrid = () => {
  const { t, lang } = useTranslation();
  const isRtl = lang === 'ar';

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [specialists, setSpecialists] = useState([]);
  const [selectedSpecId, setSelectedSpecId] = useState('');

  const { schedule, loading: scheduleLoading, error: scheduleError } = useSchedule(selectedSpecId, selectedDate);
  const { isProcessing, error: bookingError, clearError, bookSlot, cancelSlot, editSlot, completeSlot } = useBooking();
  const [childrenList, setChildrenList] = useState([]);

  useEffect(() => {
    getChildren().then(setChildrenList).catch(err => {
      console.error(err);
      toast.error(t('error_loading_children'));
    });
    getSpecialists().then(specs => {
      setSpecialists(specs);
      if (specs.length > 0) setSelectedSpecId(specs[0].id);
    }).catch(err => {
      console.error(err);
      toast.error(t('error_loading_specialists'));
    });
  }, []);

  // Modals state
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);

  const [activeSlotTime, setActiveSlotTime] = useState('');
  const [activeSession, setActiveSession] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    childId: '',
    childName: '',
    diagnosis: '',
    age: '',
    notes: '',
    clinicalNotes: '',
    newTime: ''
  });

  const handleOpenBook = (time) => {
    clearError();
    setActiveSlotTime(time);
    setFormData({
      childId: '',
      childName: '',
      diagnosis: '',
      age: '',
      notes: '',
      clinicalNotes: '',
      newTime: time
    });
    setIsBookModalOpen(true);
  };

  const handleOpenEdit = (session, time) => {
    clearError();
    setActiveSession(session);
    setActiveSlotTime(time);
    setFormData({
      childId: session.childId,
      childName: session.childName,
      diagnosis: session.diagnosis,
      age: '',
      notes: '',
      clinicalNotes: '',
      newTime: time
    });
    setIsEditModalOpen(true);
  };

  const handleOpenComplete = (slot, session, time) => {
    clearError();
    setActiveSession({ ...session, isAlreadyCompleted: slot.status === 'completed', existingNotes: slot.notes });
    setActiveSlotTime(time);
    setFormData(prev => ({ ...prev, clinicalNotes: slot.notes || '' }));
    setIsCompleteModalOpen(true);
  };

  const submitComplete = async (e) => {
    e.preventDefault();
    clearError();

    if (activeSession.isAlreadyCompleted && activeSession.id) {
       try {
         const { updateSessionNotes } = await import('../services/sessionService');
         await updateSessionNotes(activeSession.id, formData.clinicalNotes);
         toast.success(t('notes_updated_success'));
         setIsCompleteModalOpen(false);
         // Auto refresh schedule
         const fakeEvent = { target: { value: selectedDate } };
         setSelectedDate(selectedDate); // Trigger re-render internally if possible, or just let users know
       } catch (err) {
         toast.error(err.message || t('edit_failed'));
       }
       return;
    }

    const res = await completeSlot(
      activeSession.sessionId || activeSession.id,
      {
        specialistId: selectedSpecId,
        childId: activeSession.childId,
        date: selectedDate,
        time: activeSlotTime
      },
      formData.clinicalNotes
    );

    if (res.success) {
      toast.success(t('session_completed_success'));
      setIsCompleteModalOpen(false);
    } else {
      toast.error(res.error || t('session_complete_failed'));
    }
  };

  const submitBook = async (e) => {
    e.preventDefault();
    clearError();

    let finalChildId = formData.childId;
    let finalChildName = formData.childName;

    if (finalChildId === 'new') {
      try {
        const newChild = await addChild({
          name: formData.childName,
          age: Number(formData.age) || 0,
          diagnosis: formData.diagnosis,
          notes: formData.notes
        });
        finalChildId = newChild.id;
        setChildrenList(prev => [...prev, newChild]);
        toast.success(t('new_child_added'));
      } catch (err) {
        console.error('Failed to create child', err);
        toast.error(t('add_child_failed'));
        return;
      }
    }

    const specName = specialists.find(s => s.id === selectedSpecId)?.name || '';

    const res = await bookSlot({
      specialistId: selectedSpecId,
      specialistName: specName,
      childId: finalChildId,
      childName: finalChildName,
      diagnosis: formData.diagnosis,
      date: selectedDate,
      time: activeSlotTime
    });

    if (res.success) {
      toast.success(t('session_booked'));
      setIsBookModalOpen(false);
    } else {
      toast.error(res.error || t('conflict_error'));
    }
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    clearError();
    const specName = specialists.find(s => s.id === selectedSpecId)?.name || '';

    const res = await editSlot(
      activeSession.sessionId,
      { specialistId: selectedSpecId, date: selectedDate, time: activeSlotTime },
      {
        specialistId: selectedSpecId,
        specialistName: specName,
        date: selectedDate,
        time: formData.newTime,
        childId: formData.childId,
        childName: formData.childName,
        diagnosis: formData.diagnosis
      }
    );

    if (res.success) {
      toast.success(t('appointment_updated_success'));
      setIsEditModalOpen(false);
    } else {
      toast.error(res.error || t('edit_failed'));
    }
  };

  const handleCancel = async (session, time) => {
    const isRecurring = session.sessionType === 'recurring';
    
    if (isRecurring) {
      const choice = window.prompt(
        t('cancel_recurring_prompt') || 'This is a recurring session.\nType "1" to cancel JUST this occurrence.\nType "2" to cancel the ENTIRE SERIES.'
      );
      if (choice === '1') {
        clearError();
        const res = await cancelSlot(session.sessionId, {
          specialistId: selectedSpecId,
          childId: session.childId,
          date: selectedDate,
          time: time
        });
        if (res.success) toast.success(t('cancelled_success'));
        else toast.error(res.error || t('cancellation_failed'));
      } else if (choice === '2') {
        clearError();
        try {
          const { cancelRecurringSeries } = await import('../services/recurringSessionService');
          await cancelRecurringSeries(session.recurringId, selectedSpecId);
          toast.success('Entire recurring series cancelled successfully.');
          // Auto refresh schedule
          const fakeEvent = { target: { value: selectedDate } };
          setSelectedDate(selectedDate);
        } catch (err) {
          toast.error('Failed to cancel series');
          console.error(err);
        }
      }
      return;
    }

    if (!window.confirm(t('cancel_session_confirm'))) return;
    clearError();
    const res = await cancelSlot(session.sessionId, {
      specialistId: selectedSpecId,
      childId: session.childId,
      date: selectedDate,
      time: time
    });
    if (res.success) {
      toast.success(t('cancelled_success'));
    } else {
      toast.error(res.error || t('cancellation_failed'));
    }
  };

  return (
    <div className={`flex flex-col gap-8 max-w-7xl mx-auto animate-in fade-in duration-500 ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>

      {/* Dynamic Header */}
      <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-gray-100 p-4 md:p-8 flex flex-col xl:flex-row gap-6 justify-between items-center z-10">
        <div className="flex items-center gap-4 w-full xl:w-auto">
          <div className="p-3 bg-orange-50 text-primary rounded-2xl shrink-0">
            <Calendar size={24} className="md:w-7 md:h-7" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">{t('schedule')}</h1>
            <p className="text-xs md:text-sm text-gray-500 font-medium">{t('select_specialist')}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
          <select
            value={selectedSpecId}
            onChange={(e) => setSelectedSpecId(e.target.value)}
            className="flex-1 sm:flex-none bg-gray-50 border-2 border-gray-100 text-gray-900 rounded-2xl focus:ring-4 focus:ring-primary/20 focus:border-primary block p-3 md:p-4 font-black cursor-pointer transition-all outline-none text-sm md:text-base"
          >
            {specialists.map(spec => (
              <option key={spec.id} value={spec.id}>{spec.name}</option>
            ))}
          </select>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="flex-1 sm:flex-none bg-gray-50 border-2 border-gray-100 text-gray-900 rounded-2xl focus:ring-4 focus:ring-primary/20 focus:border-primary block p-3 md:p-4 font-black shadow-sm transition-all cursor-pointer outline-none text-sm md:text-base"
          />
        </div>
      </div>

      {/* Slots Grid */}
      <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm border border-gray-100 p-4 md:p-8 min-h-[600px]">


        {scheduleLoading ? (
          <div className="flex flex-col justify-center items-center h-96 text-gray-400 gap-4">
            <div className="animate-spin h-12 w-12 border-4 border-primary rounded-full border-t-transparent"></div>
            <p className="font-black animate-pulse">{t('loading')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {schedule.slots.map((slot) => {
              const isBreak = slot.type === 'break';
              const isBooked = slot.status === 'booked';
              const isCompleted = slot.status === 'completed';

              // Determine if slot time is in the past for today's date or past date
              const d = new Date();
              const todayIso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              const isToday = selectedDate === todayIso;
              const isPastDate = selectedDate < todayIso;
              let isPassed = false;
              if ((isPastDate || isToday) && !isBooked && !isCompleted && !isBreak) {
                 if (isPastDate) {
                     isPassed = true;
                 } else {
                     const currentTime = new Date();
                     const [slotHour, slotMinute] = slot.time.split(':').map(Number);
                     if (slotHour < currentTime.getHours() || (slotHour === currentTime.getHours() && slotMinute < currentTime.getMinutes())) {
                         isPassed = true;
                     }
                 }
              }

              const hasNotes = slot.notes && slot.notes.trim().length > 0;
              const completedText = hasNotes ? t('completed_with_notes') : t('completed_no_notes');

              if (isBreak) {
                return (
                  <div key={slot.time} className="relative flex flex-col justify-center items-center overflow-hidden p-6 rounded-[2rem] border-2 bg-orange-50 border-orange-100/50 shadow-sm col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-4 min-h-[120px]">
                    <div className="flex items-center gap-4 text-orange-400">
                      <Coffee size={32} />
                      <div>
                        <h3 className="text-xl font-black uppercase tracking-widest">{t('break_time') || 'Break'}</h3>
                        <p className="text-sm font-bold opacity-80">{slot.time} - {slot.endTime}</p>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={slot.time}
                  className={`relative flex flex-col justify-between overflow-hidden p-6 rounded-[2rem] border-2 transition-all duration-300 group ${isCompleted
                      ? 'bg-emerald-50 border-emerald-100 shadow-xl shadow-emerald-500/5'
                      : isBooked
                        ? 'bg-red-50 border-red-100'
                        : isPassed
                          ? 'bg-gray-50/50 border-gray-100 opacity-60'
                          : 'bg-white border-gray-50 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1'
                    }`}
                >
                  <div className={`absolute top-0 ${isRtl ? 'right-0 rounded-bl-2xl' : 'left-0 rounded-br-2xl'} px-4 py-1.5 text-[10px] font-black tracking-widest uppercase text-white shadow-sm transition-colors ${isCompleted ? (hasNotes ? 'bg-emerald-500' : 'bg-teal-500') : isBooked ? 'bg-red-500' : isPassed ? 'bg-gray-400' : 'bg-emerald-500'
                    }`}>
                    {isCompleted ? completedText : isBooked ? t('booked') : isPassed ? t('passed') : t('free')}
                  </div>

                  <div className="mt-6">
                    <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                      <span className={`text-4xl font-black tracking-tighter flex items-center gap-3 ${isCompleted ? 'text-emerald-900' : isBooked ? 'text-red-900' : isPassed ? 'text-gray-400' : 'text-gray-900'}`}>
                        <Clock size={20} className={isPassed ? 'text-gray-300' : 'text-primary opacity-50'} />
                        {slot.time}
                      </span>
                    </div>

                    {isBooked && slot.session && (
                      <div className="mb-6 space-y-3">
                        <div className="flex items-center gap-3 text-gray-900">
                          <div className={`${isCompleted ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'} p-2 rounded-xl shadow-inner`}><UserRound size={18} /></div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-black text-lg truncate">{slot.session.childName}</span>
                            {slot.session.sessionType === 'recurring' && (
                              <span className="text-[9px] bg-indigo-50 text-indigo-500 px-2 py-0.5 rounded uppercase font-black tracking-widest mt-1 w-fit border border-indigo-100">
                                Recurring
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={`text-xs font-black ${isCompleted ? 'text-emerald-600/70 bg-white/60' : 'text-red-600/70 bg-white/60'} px-4 py-2 rounded-xl border ${isCompleted ? 'border-emerald-100/50' : 'border-red-100/50'} inline-block uppercase tracking-tight`}>
                          {slot.session.diagnosis || t('no_diagnosis')}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 mt-auto flex flex-col gap-3">
                    {isCompleted ? (
                      <div className={`p-4 rounded-2xl border ${hasNotes ? 'bg-emerald-100/50 border-emerald-200/50' : 'bg-teal-50/50 border-teal-200/50'} flex justify-between items-center gap-2`}>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={24} className={hasNotes ? 'text-emerald-500' : 'text-teal-500'} />
                          <div className="flex flex-col">
                             <span className="text-xs font-black text-emerald-700 uppercase tracking-widest">{t('completed')}</span>
                             <span className="text-[9px] font-bold text-emerald-600/70">{hasNotes ? t('notes_logged') : t('missing_notes')}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleOpenComplete(slot, slot.session, slot.time)}
                          className="bg-white px-3 py-2 text-[10px] font-black uppercase rounded-lg border border-emerald-200 text-emerald-700 shadow-sm hover:bg-emerald-50 transition-all active:scale-95"
                        >
                          {hasNotes ? t('edit') : t('add')}
                        </button>
                      </div>
                    ) : isBooked ? (
                      <>
                        <button
                          onClick={() => handleOpenComplete(slot, slot.session, slot.time)}
                          disabled={isProcessing}
                          className="w-full py-3.5 bg-primary text-white font-black rounded-2xl hover:opacity-90 shadow-lg shadow-primary/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 group-hover:scale-[1.02]"
                        >
                          <CheckCircle2 size={18} /> {t('complete_early')}
                        </button>
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleOpenEdit(slot.session, slot.time)}
                            disabled={isProcessing}
                            className="flex-1 py-3.5 bg-white border-2 border-gray-50 text-gray-400 font-black rounded-2xl hover:bg-orange-50 hover:border-orange-200 hover:text-primary transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            <Edit2 size={16} /> {t('edit')}
                          </button>
                          <button
                            onClick={() => handleCancel(slot.session, slot.time)}
                            disabled={isProcessing}
                            className="flex-1 py-3.5 bg-white border-2 border-gray-50 text-gray-400 font-black rounded-2xl hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            <Trash2 size={16} /> {t('cancel')}
                          </button>
                        </div>
                      </>
                    ) : isPassed ? (
                      <button
                        disabled
                        className="w-full py-4 bg-gray-100 border-2 border-gray-100 text-gray-400 font-black rounded-2xl cursor-not-allowed flex items-center justify-center gap-3"
                      >
                        <XCircle size={18} /> {t('time_passed')}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenBook(slot.time)}
                        disabled={isProcessing}
                        className="w-full py-4 bg-gray-50 border-2 border-transparent text-gray-500 font-black rounded-2xl group-hover:bg-primary group-hover:text-white group-hover:shadow-xl group-hover:shadow-primary/30 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                      >
                        <Plus size={24} className="text-primary group-hover:text-white transition-colors" /> {t('book_slot')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Book Modal */}
      <BookingModal 
        isOpen={isBookModalOpen} 
        onClose={() => setIsBookModalOpen(false)} 
        onRefresh={() => {
           // We don't strictly need to do anything here as useSchedule is a real-time hook
           // But we can trigger a small state change if needed
        }}
        initialData={{
           specialistId: selectedSpecId,
           specialistName: specialists.find(s => s.id === selectedSpecId)?.name,
           date: selectedDate,
           time: activeSlotTime
        }}
      />

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-100" dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="px-8 py-6 border-b border-gray-50 flex justify-between items-center bg-orange-50/50">
              <h2 className="text-2xl font-black flex items-center gap-3 text-slate-900 tracking-tight">
                <Edit2 className="text-primary" /> {t('update_session')}
              </h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-900 p-2 rounded-xl transition-colors"><X size={28} /></button>
            </div>

            <form onSubmit={submitEdit} className="p-8 space-y-6">
              <div className="p-5 bg-orange-50 rounded-2xl border-2 border-orange-100 mb-4">
                <p className="text-xs text-primary/70 font-black uppercase tracking-widest mb-2">{t('current_selection')}</p>
                <div className="flex items-center gap-3">
                  <span className="font-black text-2xl text-slate-900">{activeSlotTime}</span>
                  <div className="h-4 w-[2px] bg-orange-200"></div>
                  <span className="font-bold text-primary">{activeSession?.childName}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-black text-gray-700 mb-2 uppercase tracking-tight">{t('move_to_time')}</label>
                <select value={formData.newTime} onChange={e => setFormData({ ...formData, newTime: e.target.value })} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-4 outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all font-black text-2xl appearance-none">
                  {schedule.slots.map(s => (
                    <option key={s.time} value={s.time} disabled={s.status === 'booked' && s.time !== activeSlotTime}>
                      {s.time} {s.status === 'booked' && s.time !== activeSlotTime ? `(${t('booked')})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-black text-gray-700 mb-2 uppercase tracking-tight">{t('patient_name')}</label>
                <select
                  required
                  value={formData.childId}
                  onChange={e => {
                    const selectedId = e.target.value;
                    if (selectedId) {
                      const selectedChild = childrenList.find(c => c.id === selectedId);
                      setFormData({ ...formData, childId: selectedId, childName: selectedChild?.name || '', diagnosis: selectedChild?.diagnosis || '' });
                    }
                  }}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 outline-none focus:ring-4 focus:ring-primary/20 focus:bg-white transition-all font-bold cursor-pointer"
                >
                  <option value="" disabled>{t('patient_name')}</option>
                  {childrenList.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex gap-4">
                <button type="submit" disabled={isProcessing} className="w-full py-4 font-black text-white bg-primary hover:opacity-90 rounded-2xl shadow-sm transition-all disabled:opacity-50 active:scale-95">
                  {isProcessing ? t('loading') : t('update_session')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Modal */}
      {isCompleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-100" dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="px-8 py-6 border-b border-gray-50 flex justify-between items-center bg-emerald-50/50">
              <h2 className="text-2xl font-black flex items-center gap-3 text-slate-900 tracking-tight">
                <CheckCircle2 className="text-emerald-500" /> {t('complete_log_notes_title')}
              </h2>
              <button onClick={() => setIsCompleteModalOpen(false)} className="text-gray-400 hover:text-gray-900 p-2 rounded-xl transition-colors"><X size={28} /></button>
            </div>

            <form onSubmit={submitComplete} className="p-8 space-y-6">
              <div className="p-5 bg-emerald-50/50 rounded-2xl border-2 border-emerald-100/50 mb-4">
                <p className="text-xs text-emerald-600 font-black uppercase tracking-widest mb-1">{t('patient')}</p>
                <h4 className="font-black text-2xl text-slate-900">{activeSession?.childName}</h4>
                <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest">{activeSlotTime} • {selectedDate}</p>
              </div>

              <div>
                <label className="block text-sm font-black text-gray-700 mb-2 uppercase tracking-tight">{t('clinical_session_notes_label')} {activeSession?.isAlreadyCompleted ? '' : '(Optional)'}</label>
                <textarea
                  rows="4"
                  value={formData.clinicalNotes}
                  onChange={e => setFormData({ ...formData, clinicalNotes: e.target.value })}
                  placeholder={t('session_notes_placeholder')}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-5 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all resize-none font-medium text-slate-900 text-sm"
                ></textarea>
              </div>

              <div className="pt-4">
                <button type="submit" disabled={isProcessing} className="w-full py-5 font-black text-white bg-emerald-500 hover:bg-emerald-600 rounded-2xl shadow-xl shadow-emerald-500/30 transition-all disabled:opacity-50 active:scale-95 uppercase tracking-widest text-sm flex items-center justify-center gap-3">
                  {isProcessing ? <RefreshCw size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
                  {isProcessing ? t('loading') : t('complete_finalize')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default ScheduleGrid;
