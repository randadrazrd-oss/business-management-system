import React, { useState } from 'react';
import useSWR from 'swr';
import { fetchDailyGrid } from '../services/scheduleService';
import { getEligibleChildrenForSlot, executeBookingTransaction } from '../services/bookingService';
import { format, addDays } from 'date-fns';
import { Calendar as CalendarIcon, ChevronRight, ChevronLeft, X, Clock, UserRound, Sparkles } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';

export default function Schedule() {
  const { t, lang } = useTranslation();
  const isRtl = lang === 'ar';
  const [date, setDate] = useState(new Date());
  const dateStr = format(date, 'yyyy-MM-dd');

  const { data: grid, isLoading, error, mutate } = useSWR(
    ['daily-schedule', dateStr], 
    () => fetchDailyGrid(date),
    { refreshInterval: 0 } 
  );

  // Smart Matching Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null); 
  const [smartRecommendations, setSmartRecommendations] = useState([]);
  const [isFetchingRecommendations, setIsFetchingRecommendations] = useState(false);
  
  const [selectedChildId, setSelectedChildId] = useState('');
  const [isBooking, setIsBooking] = useState(false);

  const handleNextDay = () => setDate(d => addDays(d, 1));
  const handlePrevDay = () => setDate(d => addDays(d, -1));

  const openSmartBookingModal = async (timeStr, specCol) => {
    setSelectedSlot({ time: timeStr, specialistId: specCol.specialistId, specialistName: specCol.specialistName, specialization: specCol.specialization });
    setSelectedChildId('');
    setIsModalOpen(true);
    setIsFetchingRecommendations(true);
    setSmartRecommendations([]);

    try {
       // Hit the Smart Matching Engine based on Specialist domain
       const results = await getEligibleChildrenForSlot(specCol.specialization);
       setSmartRecommendations(results);
    } catch(err) {
       console.error(err);
    } finally {
       setIsFetchingRecommendations(false);
    }
  };

  const handleBook = async () => {
    if (!selectedChildId) return alert('الرجاء اختيار مريض (يرجى الالتزام بالأولويات الطبية).');
    
    setIsBooking(true);
    const chosenPatient = smartRecommendations.find(r => r.id === selectedChildId);

    const payload = {
      date: dateStr,
      startTime: selectedSlot.time,
      childId: chosenPatient.id,
      childName: chosenPatient.personalInfo?.name || "مريض", 
      diagnosis: chosenPatient.diagnosis || "",
      specialistId: selectedSlot.specialistId,
      specialistName: selectedSlot.specialistName, 
      planId: chosenPatient.matchedPlanId,
      planFocus: chosenPatient.planFocus, 
    };

    try {
      await executeBookingTransaction(payload);
      await mutate(); // Optimistic refresh
      setIsModalOpen(false);
    } catch (err) {
      if(err.message.includes("409_CONFLICT")) {
        alert("تنبيه أمان: تم سحب هذا الموعد للتو من قبل شخص آخر! تم تحديث الجدول.");
      } else {
        alert("حدث خطأ.");
      }
      mutate();
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className={`space-y-6 animate-in fade-in duration-500 flex flex-col h-[calc(100vh-100px)] -m-8 p-8 ${isRtl ? 'text-right' : 'text-left'}`}>
      {/* Operation Control Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-8 rounded-[2.5rem] shadow-2xl shadow-gray-200/50 border border-gray-100">
        <div>
           <h2 className="text-3xl font-black text-navy tracking-tighter flex items-center gap-3">
              <div className="p-3 bg-navy rounded-2xl text-white shadow-lg shadow-primary/20">
                 <CalendarIcon size={28} />
              </div>
              {isRtl ? 'غرفة العمليات الذكية للجدولة' : 'Smart Operation Center'}
           </h2>
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-2 px-1">
              Sunrise Nursery Clinical Scheduling Engine
           </p>
        </div>
        
        <div className="flex items-center gap-2 bg-gray-50 border-2 border-gray-100 rounded-3xl p-2 shadow-inner">
           <button onClick={isRtl ? handleNextDay : handlePrevDay} className="p-3 hover:bg-white hover:text-primary rounded-2xl transition-all hover:shadow-sm text-gray-400">
             {isRtl ? <ChevronRight size={24} strokeWidth={3} /> : <ChevronLeft size={24} strokeWidth={3} />}
           </button>
           <div className="flex flex-col items-center px-6 min-w-[160px]">
              <span className="text-[10px] font-black text-primary uppercase tracking-widest leading-none mb-1">{isRtl ? 'تاريخ اليوم' : 'Selected Frame'}</span>
              <span className="font-black text-navy text-lg leading-tight" dir="ltr">
                {dateStr}
              </span>
           </div>
           <button onClick={isRtl ? handlePrevDay : handleNextDay} className="p-3 hover:bg-white hover:text-primary rounded-2xl transition-all hover:shadow-sm text-gray-400">
             {isRtl ? <ChevronLeft size={24} strokeWidth={3} /> : <ChevronRight size={24} strokeWidth={3} />}
           </button>
        </div>
      </div>

      {/* Grid Canvas */}
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
           <div className="relative">
              <div className="w-20 h-20 border-[6px] border-orange-100 rounded-full"></div>
              <div className="w-20 h-20 border-[6px] border-primary rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
           </div>
           <p className="font-black text-navy uppercase tracking-[0.2em] text-sm italic">Allocating Resources...</p>
        </div>
      ) : error ? (
        <div className="flex-1 flex justify-center items-center">
           <div className="bg-red-50 text-red-600 px-8 py-6 rounded-[2rem] border border-red-100 font-black flex items-center gap-3">
              <X className="w-6 h-6" /> {isRtl ? 'حدث خطأ أمني أثناء الاتصال بقاعدة البيانات.' : 'Secure connection failed. Database unreachable.'}
           </div>
        </div>
      ) : !grid || grid.length === 0 ? (
        <div className="flex-1 flex flex-col justify-center items-center text-gray-300 bg-white rounded-[3rem] shadow-sm border-2 border-dashed p-20 shrink-0">
          <CalendarIcon size={84} strokeWidth={1} className="opacity-20 mb-6" />
          <p className="text-xl font-black uppercase tracking-widest">{isRtl ? 'لم يتم تعريف ورديات عمل لهذا اليوم' : 'No Coverage Assigned for Today'}</p>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto bg-orange-50/10 rounded-[3rem] border border-orange-100/30 p-6 shadow-inner">
          <div className={`flex gap-6 min-w-max ${isRtl ? 'flex-row-reverse' : 'flex-row'}`}>
            {grid.map(col => (
               <div key={col.specialistId} className="w-[320px] bg-white rounded-[2.5rem] shadow-xl shadow-gray-200/40 border border-gray-100 flex flex-col overflow-hidden group hover:border-primary/30 transition-all duration-500">
                 <div className="bg-white border-b border-gray-50 p-6 flex flex-col items-center shrink-0">
                    <div className="w-14 h-14 bg-navy text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-lg shadow-primary/20 mb-4 group-hover:-rotate-3 transition-transform">
                       {col.specialistName.charAt(0)}
                    </div>
                    <h3 className="font-black text-navy text-lg mb-1 tracking-tight truncate w-full text-center">{col.specialistName}</h3>
                    <span className="text-[10px] font-black text-primary bg-orange-50 px-4 py-1 rounded-full uppercase tracking-widest border border-orange-100">
                      {col.specialization}
                    </span>
                 </div>
                 
                 <div className="p-5 flex-1 overflow-y-auto space-y-4 custom-scrollbar bg-gray-50/30">
                   {col.slots.map(slot => {
                     if (slot.status === "booked") {
                       return (
                         <div key={slot.time} className="p-5 bg-white border border-gray-100 rounded-3xl flex flex-col relative shadow-sm hover:shadow-xl transition-all group/card overflow-hidden">
                            <div></div>
                            <div className="flex justify-between items-center mb-3">
                              <div className="flex items-center gap-2 text-navy">
                                 <Clock size={14} className="text-primary" strokeWidth={3} />
                                 <span className="font-black text-sm tracking-tight" dir="ltr">{slot.time}</span>
                              </div>
                              <div className="px-2 py-0.5 bg-navy text-white text-[8px] font-black uppercase tracking-widest rounded-md">Booked</div>
                            </div>
                            <span className="text-base font-black text-navy flex items-center gap-2 line-clamp-1">
                              {slot.session.childName}
                            </span>
                            <div className="flex flex-wrap gap-1.5 mt-3">
                               <span className="text-[9px] font-bold bg-orange-50 text-primary px-2 py-0.5 rounded-lg border border-orange-100 uppercase tracking-tighter truncate max-w-full">
                                 {slot.session.diagnosis || "No Diagnosis"}
                               </span>
                               <span className="text-[9px] font-black bg-gray-50 text-gray-400 px-2 py-0.5 rounded-lg uppercase tracking-tighter truncate max-w-full">
                                 Focus: {slot.session.planFocus}
                               </span>
                            </div>
                         </div>
                       );
                     }
                     
                     return (
                       <button 
                         key={slot.time} 
                         onClick={() => openSmartBookingModal(slot.time, col)}
                         className="w-full text-right p-5 bg-white hover:bg-primary border-2 border-dashed border-gray-100 hover:border-primary rounded-3xl flex justify-between items-center transition-all group shadow-sm hover:shadow-xl hover:shadow-primary/20 active:scale-95"
                       >
                         <div className="flex items-center gap-2 text-gray-400 group-hover:text-white">
                            <Clock size={16} strokeWidth={3} />
                            <span className="font-black text-sm" dir="ltr">{slot.time}</span>
                         </div>
                         <div className="flex items-center gap-2 text-primary group-hover:text-white">
                            <Sparkles size={16} strokeWidth={3} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{isRtl ? 'حجز ذكي' : 'Sync Slot'}</span>
                         </div>
                       </button>
                     );
                   })}
                 </div>
               </div>
            ))}
          </div>
        </div>
      )}

      {/* Smart Engine Booking Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-navy/60 z-50 flex items-center justify-center p-4 backdrop-blur-xl">
          <div className="bg-white rounded-[3rem] w-full max-w-lg shadow-3xl animate-in zoom-in-95 duration-300 border border-white/20 overflow-hidden">
            <div className="flex justify-between items-center p-8 bg-navy text-white">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur shadow-inner">
                    <Sparkles size={24} strokeWidth={2.5} />
                 </div>
                 <div>
                    <h3 className="text-xl font-black tracking-tighter leading-none">
                       {isRtl ? 'محرك التعيين الذكي' : 'Medical Assignment Engine'}
                    </h3>
                    <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mt-1 italic">Clinical Priority Logic v2.4</p>
                 </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-white/40 hover:text-white p-3 rounded-2xl transition-all"
              >
                <X size={28} strokeWidth={3} />
              </button>
            </div>
            
            <div className="p-10 space-y-8">
              
              <div className="bg-gray-50 border-2 border-gray-100 rounded-[2rem] p-6 flex justify-between items-center shadow-inner group transition-colors hover:border-primary/20">
                 <div className="flex flex-col">
                    <span className="text-gray-400 text-[10px] font-black mb-1 uppercase tracking-widest">{isRtl ? 'المعالج المناوب' : 'Assigned Command'}</span>
                    <span className="font-black text-navy text-lg">{selectedSlot?.specialistName}</span>
                 </div>
                 <div className="flex flex-col items-end">
                    <span className="text-gray-400 text-[10px] font-black mb-1 uppercase tracking-widest">{isRtl ? 'موعد الجلسة' : 'Mission Window'}</span>
                    <span className="font-black text-primary bg-orange-100/50 border border-orange-100 px-3 py-1 rounded-xl text-lg" dir="ltr">{selectedSlot?.time}</span>
                 </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 px-1">
                   {isRtl ? 'توصيات الأولوية الطبية' : 'Patient Strategic Recommendations'}
                </label>
                
                {isFetchingRecommendations ? (
                   <div className="py-12 flex flex-col items-center justify-center text-primary gap-4">
                      <div className="relative">
                         <div className="w-12 h-12 border-4 border-orange-100 rounded-full"></div>
                         <div className="w-12 h-12 border-4 border-primary rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
                      </div>
                      <p className="text-xs font-black uppercase tracking-widest animate-pulse">Running Neural Matcher...</p>
                   </div>
                ) : smartRecommendations.length === 0 ? (
                   <div className="p-6 bg-red-50 border-2 border-red-100 text-red-600 rounded-[2rem] text-xs font-black uppercase tracking-widest text-center shadow-sm">
                      {isRtl ? `لا يوجد خطط نشطة تتطلب ${selectedSlot?.specialization}` : `No Active Plans Found for ${selectedSlot?.specialization}`}
                   </div>
                ) : (
                   <div className="space-y-4 max-h-[300px] overflow-y-auto pr-3 custom-scrollbar">
                     {smartRecommendations.map((rec) => {
                       const isUrgent = rec.planPriority === 1;
                       const isSelected = selectedChildId === rec.id;
                       
                       return (
                         <label 
                           key={rec.id} 
                           className={`flex flex-col p-5 border-2 rounded-[2rem] cursor-pointer transition-all duration-300 relative group overflow-hidden ${isSelected ? 'border-primary bg-orange-50/50 shadow-xl scale-[1.02]' : 'border-gray-100 bg-white hover:border-orange-200'}`}
                         >
                           <div className="flex items-center gap-4 relative z-10">
                             <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-primary bg-primary' : 'border-gray-200 bg-white'}`}>
                                {isSelected && <div className="w-2 h-2 bg-white rounded-full"></div>}
                             </div>
                             <input 
                               type="radio" 
                               name="smartSelectChild" 
                               value={rec.id}
                               checked={isSelected}
                               onChange={(e) => setSelectedChildId(e.target.value)}
                               className="hidden" 
                             />
                             <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                   <span className="font-black text-navy text-base truncate">{rec.personalInfo?.name || "Anonymous Record"}</span>
                                   {isUrgent && (
                                     <span className="text-[8px] font-black bg-red-500 text-white px-2 py-0.5 rounded-full uppercase tracking-widest animate-pulse border-none">
                                       Urgent
                                     </span>
                                   )}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                   <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter truncate max-w-[200px]">Goal: {rec.planFocus}</span>
                                </div>
                             </div>
                           </div>
                         </label>
                       );
                     })}
                   </div>
                )}
              </div>

              <div className="pt-4 flex gap-4">
                 <button 
                   onClick={() => setIsModalOpen(false)}
                   className="flex-1 py-5 rounded-[2rem] font-black text-gray-400 hover:bg-gray-50 transition-all uppercase tracking-widest text-xs"
                 >
                    {t('cancel')}
                 </button>
                 <button 
                  className="flex-[2] bg-navy hover:opacity-90 text-white font-black py-5 rounded-[2.5rem] transition-all disabled:opacity-50 shadow-sm active:scale-95 text-sm uppercase tracking-widest"
                  onClick={handleBook}
                  disabled={isBooking || !selectedChildId}
                 >
                  {isBooking ? (isRtl ? 'جار التعيين...' : 'Processing...') : (isRtl ? 'تعيين وإنشاء الجلسة' : 'Commit Assignment')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
