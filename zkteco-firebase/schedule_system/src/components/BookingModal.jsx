import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, Clipboard, CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';
import { getSpecialists } from '../services/specialistService';
import { getChildren, addChild } from '../services/childService';
import { createSession } from '../services/bookingService';
import { fetchOrCreateDaySchedule } from '../services/scheduleService';
import { useTranslation } from '../contexts/LanguageContext';

import { toast } from 'react-hot-toast';

export default function BookingModal({ isOpen, onClose, onRefresh, initialData }) {
  const { t, lang } = useTranslation();
  const isRtl = lang === 'ar';

  const [formData, setFormData] = useState({
    specialistName: initialData?.specialistName || '',
    date: initialData?.date || new Date().toISOString().split('T')[0],
    time: initialData?.time || '',
    childId: '',
    childName: '',
    diagnosis: '',
    notes: '',
    sessionType: 'one-time'
  });

  const [availableSlots, setAvailableSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [specialists, setSpecialists] = useState([]);
  const [children, setChildren] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setStep(1);
      setStep(1);
      Promise.all([getSpecialists(), getChildren()])
        .then(([specs, childs]) => {
          setSpecialists(specs);
          setChildren(childs);
          if (initialData) {
            setFormData(prev => ({
              ...prev,
              specialistId: initialData.specialistId || '',
              specialistName: initialData.specialistName || '',
              date: initialData.date || prev.date,
              time: initialData.time || prev.time
            }));
          }
        })
        .catch(err => {
          console.error(err);
          toast.error(isRtl ? 'فشل تحميل البيانات' : 'Failed to load data');
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  useEffect(() => {
    if (formData.specialistId && formData.date) {
      setSlotsLoading(true);
      fetchOrCreateDaySchedule(formData.specialistId, formData.date)
        .then(data => {
            setAvailableSlots(data.slots.filter(s => s.status === 'free'));
        })
        .catch(err => {
          console.error(err);
          toast.error(isRtl ? 'فشل تحميل المواعيد المتاحة' : 'Failed to load available slots');
        })
        .finally(() => setSlotsLoading(false));
    }
  }, [formData.specialistId, formData.date]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      let finalChildId = formData.childId;
      let finalChildName = formData.childName;

      // Handle new child creation if selected
      if (formData.childId === 'new') {
        const newChild = await addChild({ 
          name: formData.childName, 
          diagnosis: formData.diagnosis 
        });
        finalChildId = newChild.id;
        toast.success(isRtl ? 'تم إنشاء ملف للطفل' : 'Child profile created');
      }

      if (formData.sessionType === 'recurring') {
        const { createRecurringSessionTemplate } = await import('../services/recurringSessionService');
        await createRecurringSessionTemplate({
          ...formData,
          childId: finalChildId,
          childName: finalChildName
        });
      } else {
        await createSession({
          ...formData,
          childId: finalChildId,
          childName: finalChildName
        });
      }
      
      toast.success(isRtl ? 'تم حجز الموعد بنجاح' : 'Appointment booked successfully');
      onRefresh?.();
      onClose();
      // Reset
      setStep(1);
      setStep(1);
      setFormData({
        specialistId: '',
        specialistName: '',
        date: new Date().toISOString().split('T')[0],
        time: '',
        childId: '',
        childName: '',
        diagnosis: '',
        notes: '',
        sessionType: 'one-time'
      });
    } catch (err) {
      console.error(err);
      const msg = err.message === 'conflict_error' 
        ? (isRtl ? 'هذا الموعد محجوز بالفعل!' : 'Double booking detected!')
        : (isRtl ? 'فشل الحجز' : 'Failed to create booking');
      toast.error(msg);
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-white/20 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-8 py-6 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
               <Calendar className="opacity-80" /> {t('book_slot') || "New Appointment"}
            </h2>
            <p className="text-white/60 text-xs font-bold uppercase tracking-widest mt-1">Step {step} of 2</p>
          </div>
          <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
               <Loader2 className="animate-spin text-primary" size={48} />
               <p className="font-black text-gray-400">Initializing Clinic Engine...</p>
            </div>
          ) : (
            <form onSubmit={handleCreate} className="space-y-8">
              
              {step === 1 && (
                <div className="space-y-6 animate-in slide-in-from-right duration-300">
                   {initialData?.time ? (
                     <div className="p-6 bg-orange-50 rounded-[2rem] border border-orange-100 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-primary"><Clock size={24} /></div>
                           <div>
                              <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest leading-none mb-1">Selected Slot</p>
                              <p className="font-black text-slate-900 text-lg">{formData.specialistName} • {formData.date} • {formData.time}</p>
                           </div>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => {
                             setFormData({...formData, time: ''});
                          }}
                          className="text-primary font-black text-xs uppercase tracking-widest hover:underline"
                        >
                          {t('change') || 'Change'}
                        </button>
                     </div>
                   ) : (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Select Specialist</label>
                          <div className="relative">
                             <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                             <select 
                              required
                              value={formData.specialistId}
                              onChange={(e) => {
                                  const spec = specialists.find(s => s.id === e.target.value);
                                  setFormData({...formData, specialistId: e.target.value, specialistName: spec?.name || ''});
                              }}
                              className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl pl-12 pr-4 py-4 font-bold focus:border-primary focus:bg-white outline-none appearance-none transition-all"
                             >
                               <option value="">Choose a specialist...</option>
                               {specialists.map(s => <option key={s.id} value={s.id}>{s.name} ({s.specialization})</option>)}
                             </select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Target Date</label>
                          <div className="relative">
                             <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                             <input 
                              required
                              type="date"
                              value={formData.date}
                              onChange={(e) => setFormData({...formData, date: e.target.value})}
                              className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl pl-12 pr-4 py-4 font-bold focus:border-primary focus:bg-white outline-none transition-all"
                             />
                          </div>
                        </div>
                     </div>
                   )}

                   {formData.specialistId && !formData.time && (
                     <div className="space-y-4 pt-4">
                        <div className="flex justify-between items-center px-1">
                          <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Appointment Time</label>
                        </div>

                        {slotsLoading ? (
                          <div className="flex items-center gap-3 text-primary font-bold p-4 bg-orange-50 rounded-2xl">
                             <Loader2 className="animate-spin" size={18} /> Resolving availability...
                          </div>
                        ) : availableSlots.length > 0 ? (
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                             {availableSlots.map(slot => (
                               <button 
                                key={slot.time}
                                type="button"
                                onClick={() => setFormData({...formData, time: slot.time})}
                                className={`py-3 px-2 rounded-xl font-black text-sm transition-all border-2 ${
                                  formData.time === slot.time 
                                  ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' 
                                  : 'bg-white border-gray-100 text-gray-600 hover:border-primary/20 hover:text-primary'
                                }`}
                               >
                                 {slot.time}
                               </button>
                             ))}
                          </div>
                        ) : (
                          <div className="p-4 bg-orange-50 text-orange-700 rounded-2xl font-bold text-center border border-orange-100">
                             No free slots found for this date.
                          </div>
                        )}
                     </div>
                   )}

                   <div className="space-y-2 pt-4">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Session Type</label>
                        <div className="flex gap-4">
                           <button 
                             type="button" 
                             onClick={() => setFormData({...formData, sessionType: 'one-time'})}
                             className={`flex-1 py-3 px-4 rounded-xl border-2 font-black transition-all text-sm flex items-center justify-center gap-2 ${formData.sessionType === 'one-time' ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'bg-gray-50 border-gray-100 text-gray-500 hover:border-primary/20'}`}
                           >
                             One-Time
                           </button>
                           <button 
                             type="button" 
                             onClick={() => setFormData({...formData, sessionType: 'recurring'})}
                             className={`flex-1 py-3 px-4 rounded-xl border-2 font-black transition-all text-sm flex items-center justify-center gap-2 ${formData.sessionType === 'recurring' ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'bg-gray-50 border-gray-100 text-gray-500 hover:border-primary/20'}`}
                           >
                             Recurring (8 Weeks)
                           </button>
                        </div>
                    </div>

                   <div className="flex justify-end pt-4">
                     <button 
                      type="button"
                      disabled={!formData.specialistId || !formData.date || !formData.time}
                      onClick={() => setStep(2)}
                      className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-black transition-all disabled:opacity-30 active:scale-95 shadow-lg"
                     >
                       Next Step <ChevronRight size={20} />
                     </button>
                   </div>
                </div>
              )}

               {step === 2 && (
                 <div className="space-y-6 animate-in slide-in-from-left duration-300">
                    <div className="p-5 bg-orange-50 rounded-3xl border border-orange-100 mb-2 flex items-center justify-between">
                       <div className="flex items-center gap-3 text-slate-900 font-black">
                          <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-primary"><Clock size={20} /></div>
                          <div>
                             <p className="text-[10px] uppercase opacity-60">Selection</p>
                             <p>{formData.specialistName} • {formData.date} • {formData.time}</p>
                          </div>
                       </div>
                       <button type="button" onClick={() => setStep(1)} className="text-primary font-black text-xs hover:underline uppercase tracking-widest">{t('change') || 'Change'}</button>
                    </div>

                   <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">{t('patient_name')}</label>
                        <select 
                          required
                          value={formData.childId}
                          onChange={(e) => {
                             const c = children.find(ch => ch.id === e.target.value);
                             setFormData({...formData, childId: e.target.value, childName: c?.name || ''});
                          }}
                          className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 font-bold appearance-none transition-all"
                        >
                           <option value="">Select a child...</option>
                           {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                           <option value="new" className="text-primary font-black">+ Create New Profile</option>
                        </select>
                      </div>

                      {formData.childId === 'new' && (
                        <div className="p-4 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 animate-in fade-in zoom-in-95">
                           <input 
                            required
                            placeholder={isRtl ? "اكتب الاسم الكامل للطفل" : "Type child's full name"}
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 font-bold mb-3"
                            value={formData.childName}
                            onChange={(e) => setFormData({...formData, childName: e.target.value})}
                           />
                           <input 
                            placeholder={isRtl ? "التشخيص الأولي (اختياري)" : "Initial Diagnosis (optional)"}
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 font-bold"
                            value={formData.diagnosis}
                            onChange={(e) => setFormData({...formData, diagnosis: e.target.value})}
                           />
                        </div>
                      )}

                      <div className="space-y-2">
                         <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Clinical Notes (Internal Only)</label>
                         <textarea 
                          className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-6 py-4 font-medium min-h-[100px] outline-none focus:bg-white focus:border-primary transition-all"
                          value={formData.notes}
                          onChange={(e) => setFormData({...formData, notes: e.target.value})}
                         />
                      </div>
                   </div>

                   <button 
                    type="submit" 
                    disabled={processing || !formData.childId || (formData.childId === 'new' && !formData.childName)}
                    className="w-full py-5 bg-primary text-white rounded-[2rem] font-black text-xl shadow-sm hover:opacity-90 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                   >
                     {processing ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={24} />}
                     {processing ? "Securing Slot..." : "Confirm Appointment"}
                   </button>
                </div>
              )}

            </form>
          )}
        </div>
      </div>
    </div>
  );
}
