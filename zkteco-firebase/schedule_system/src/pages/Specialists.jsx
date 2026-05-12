import React, { useState, useEffect, useMemo } from 'react';
import { getSpecialists, addSpecialist, updateSpecialist, deleteSpecialist } from '../services/specialistService';
import {
  PlusCircle,
  UserRound,
  X,
  Clock,
  Briefcase,
  Calendar,
  Edit2,
  Trash2,
  Search,
  LayoutGrid,
  List,
  ChevronRight,
  MoreVertical,
  Coffee
} from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { generateDailySlots } from '../utils/scheduleLogic';
import { useAuth } from '../contexts/AuthContext';

import { toast } from 'react-hot-toast';

export default function Specialists() {
  const { t, lang } = useTranslation();
  const { isSecretary, isAdmin } = useAuth();
  const isRtl = lang === 'ar';

  const [specialists, setSpecialists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table'); // Default to table for clarity
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    specialization: '',
    workingDays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
    daySchedules: {
      'Sunday': { start: '10:00', end: '21:00' },
      'Monday': { start: '10:00', end: '21:00' },
      'Tuesday': { start: '10:00', end: '21:00' },
      'Wednesday': { start: '10:00', end: '21:00' },
      'Thursday': { start: '10:00', end: '21:00' }
    },
    availability: {}
  });

  const availableDays = [
    { label: isRtl ? 'الأحد' : 'Sunday', val: 'Sunday', short: isRtl ? 'ح' : 'S' },
    { label: isRtl ? 'الإثنين' : 'Monday', val: 'Monday', short: isRtl ? 'ن' : 'M' },
    { label: isRtl ? 'الثلاثاء' : 'Tuesday', val: 'Tuesday', short: isRtl ? 'ث' : 'T' },
    { label: isRtl ? 'الأربعاء' : 'Wednesday', val: 'Wednesday', short: isRtl ? 'ر' : 'W' },
    { label: isRtl ? 'الخميس' : 'Thursday', val: 'Thursday', short: isRtl ? 'خ' : 'T' }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getSpecialists();
      setSpecialists(data);
    } catch (err) {
      console.error(err);
      toast.error(t('failed_load_data'));
    }
    setLoading(false);
  };

  const filteredSpecialists = useMemo(() => {
    return specialists.filter(s =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.specialization.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [specialists, searchTerm]);

  const handleTextChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleDay = (dayVal) => {
    setFormData(prev => {
      const currentDays = prev.workingDays;
      if (currentDays.includes(dayVal)) {
        const newDays = currentDays.filter(d => d !== dayVal);
        const newAvailability = { ...prev.availability };
        delete newAvailability[dayVal];
        return { ...prev, workingDays: newDays, availability: newAvailability };
      } else {
        const newDaySchedules = { ...prev.daySchedules };
        const schedule = newDaySchedules[dayVal] || { start: '10:00', end: '21:00' };
        if (!newDaySchedules[dayVal]) {
          newDaySchedules[dayVal] = schedule;
        }

        // Also generate clinical slots for the newly added day
        const newAvailability = {
          ...prev.availability,
          [dayVal]: generateDailySlots(schedule.start, schedule.end, 45).filter(s => s.type === 'session').map(s => s.time)
        };

        return {
          ...prev,
          workingDays: [...currentDays, dayVal],
          daySchedules: newDaySchedules,
          availability: newAvailability
        };
      }
    });
  };

  const handleDayTimeChange = (day, field, value) => {
    setFormData(prev => {
      const newDaySchedules = {
        ...prev.daySchedules,
        [day]: {
          ...prev.daySchedules[day] || { start: '10:00', end: '21:00' },
          [field]: value
        }
      };

      const start = newDaySchedules[day].start;
      const end = newDaySchedules[day].end;

      let newAvailability = { ...prev.availability };

      if (start && end) {
        newAvailability[day] = generateDailySlots(start, end, 45).filter(s => s.type === 'session').map(s => s.time);
      }

      return {
        ...prev,
        daySchedules: newDaySchedules,
        availability: newAvailability
      };
    });
  };

  const addSlot = (day, time) => {
    if (!time) return;
    setFormData(prev => {
      const daySlots = prev.availability[day] || [];
      if (daySlots.includes(time)) {
        toast.error(t('time_exists_error'));
        return prev;
      }
      const newSlots = [...daySlots, time].sort();
      return {
        ...prev,
        availability: { ...prev.availability, [day]: newSlots }
      };
    });
  };

  const removeSlot = (day, time) => {
    setFormData(prev => {
      const daySlots = prev.availability[day] || [];
      const newSlots = daySlots.filter(t => t !== time);
      return {
        ...prev,
        availability: { ...prev.availability, [day]: newSlots }
      };
    });
  };

  const openAddModal = () => {
    setEditingId(null);
    const defaultDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
    const defaultSchedules = {
      'Sunday': { start: '10:00', end: '21:00' },
      'Monday': { start: '10:00', end: '21:00' },
      'Tuesday': { start: '10:00', end: '21:00' },
      'Wednesday': { start: '10:00', end: '21:00' },
      'Thursday': { start: '10:00', end: '21:00' }
    };

    // Pre-calculate baseline slots
    const defaultAvailability = {};
    defaultDays.forEach(day => {
      defaultAvailability[day] = generateDailySlots(defaultSchedules[day].start, defaultSchedules[day].end, 45).filter(s => s.type === 'session').map(s => s.time);
    });

    setFormData({
      name: '',
      specialization: '',
      workingDays: defaultDays,
      daySchedules: defaultSchedules,
      availability: defaultAvailability
    });
    setIsModalOpen(true);
  };

  const openEditModal = (spec) => {
    setEditingId(spec.id);

    const legacyStart = spec.startHour || '10:00';
    const legacyEnd = spec.endHour || '21:00';
    const loadedDays = spec.workingDays || [];
    const newDaySchedules = spec.daySchedules ? { ...spec.daySchedules } : {};

    if (!spec.daySchedules && loadedDays.length > 0) {
      loadedDays.forEach(day => {
        newDaySchedules[day] = { start: legacyStart, end: legacyEnd };
      });
    }

    let loadedAvailability = spec.availability || {};
    // Ensure all active days have generated slots avoiding complete emptiness on legacy/broken records
    loadedDays.forEach(day => {
      if (!loadedAvailability[day]) {
        const dSched = newDaySchedules[day] || { start: '10:00', end: '21:00' };
        loadedAvailability[day] = generateDailySlots(dSched.start, dSched.end, 45).filter(s => s.type === 'session').map(s => s.time);
      }
    });

    setFormData({
      name: spec.name,
      specialization: spec.specialization,
      workingDays: loadedDays,
      daySchedules: newDaySchedules,
      availability: loadedAvailability
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`${t('delete_specialist_confirm')} ${name}؟`)) return;
    try {
      await deleteSpecialist(id);
      toast.success(t('delete_success'));
      await loadData();
    } catch (err) {
      console.error(err);
      toast.error(t('delete_error'));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.specialization) {
      toast.error(t('fill_required_fields'));
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        await updateSpecialist(editingId, formData);
        toast.success(t('update_success'));
      } else {
        await addSpecialist(formData);
        toast.success(t('add_success'));
      }
      await loadData();
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
      toast.error(t('save_data_failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`space-y-8 animate-in fade-in duration-500 ${isRtl ? 'text-right' : 'text-left'}`}>

      {/* Header & Controls */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">{t('specialists')}</h2>
          <p className="text-gray-500 font-medium text-sm md:text-base">{t('total_specialists')}: {specialists.length}</p>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap w-full xl:w-auto gap-4 items-center">
          <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-100 shadow-inner w-full sm:w-auto justify-center">
            <button
              onClick={() => setViewMode('table')}
              className={`flex-1 sm:flex-none p-2.5 rounded-xl transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-primary' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <div className="flex items-center justify-center gap-2">
                <List size={20} />
                <span className="sm:hidden text-xs font-black uppercase tracking-widest">{t('table_view')}</span>
              </div>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`flex-1 sm:flex-none p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-primary' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <div className="flex items-center justify-center gap-2">
                <LayoutGrid size={20} />
                <span className="sm:hidden text-xs font-black uppercase tracking-widest">{t('grid_view')}</span>
              </div>
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className={`absolute ${isRtl ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-gray-400`} size={20} />
            <input
              type="text"
              placeholder={t('search_specialists_placeholder')}
              className={`w-full bg-white border-2 border-gray-100 rounded-2xl ${isRtl ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3 font-bold focus:border-primary outline-none transition-all shadow-sm text-sm`}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {!isSecretary && (
            <button
              onClick={openAddModal}
              className="w-full sm:w-auto bg-primary hover:opacity-90 text-white px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all shadow-xl shadow-primary/20 active:scale-95 whitespace-nowrap"
            >
              <PlusCircle size={24} />
              <span className="text-sm uppercase tracking-widest">{t('add_specialist')}</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-orange-100 rounded-full"></div>
            <div className="w-16 h-16 border-4 border-primary rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
          </div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('consulting_database')}</p>
        </div>
      ) : (
        <>
          {viewMode === 'table' ? (
            <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className={`w-full ${isRtl ? 'text-right' : 'text-left'}`}>
                  <thead className="bg-gray-50/50 border-b border-gray-100">
                    <tr className="text-gray-400 font-black text-[10px] uppercase tracking-[0.2em]">
                      <th className="px-8 py-6">{t('specialist_name_label')}</th>
                      <th className="px-8 py-6">{t('department_label')}</th>
                      <th className="px-8 py-6">{t('duty_hours_label')}</th>
                      <th className="px-8 py-6">{t('schedule_label_header')}</th>
                      <th className="px-8 py-6 text-center">{t('controls_label')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredSpecialists.map(spec => (
                      <tr key={spec.id} className="hover:bg-orange-50/30 transition-colors group">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center font-black text-lg shadow-lg shadow-primary/10">
                              {spec.name.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-black text-slate-900 text-base">{spec.name}</h4>
                                {spec.subRole && (
                                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${spec.subRole === 'employee' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                    {spec.subRole}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                                <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest">{t('verified_personnel')}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className="bg-orange-50 text-primary px-3 py-1.5 rounded-xl text-[10px] font-black border border-orange-100 uppercase tracking-widest">
                            {spec.specialization}
                          </span>
                        </td>
                        <td className="px-8 py-6 font-black text-slate-900 text-sm">
                          <span className="text-gray-400 text-xs uppercase tracking-widest">{t('custom_per_day')}</span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex gap-1.5">
                            {availableDays.map(day => {
                              const isActive = spec.workingDays?.includes(day.val);
                              return (
                                <div
                                  key={day.val}
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black transition-all border ${isActive ? 'bg-primary border-primary text-white shadow-md' : 'bg-gray-50 border-gray-100 text-gray-300'
                                    }`}
                                  title={day.label}
                                >
                                  {day.short}
                                </div>
                              )
                            })}
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          {!isSecretary && (
                            <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => openEditModal(spec)}
                                className="p-2.5 bg-white shadow-sm border border-gray-100 hover:border-primary text-gray-400 hover:text-primary rounded-xl transition-all active:scale-90"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button
                                onClick={() => handleDelete(spec.id, spec.name)}
                                className="p-2.5 bg-white shadow-sm border border-gray-100 hover:border-red-500 text-gray-400 hover:text-red-500 rounded-xl transition-all active:scale-90"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredSpecialists.length === 0 && (
                <div className="p-20 text-center text-gray-400 font-black italic">
                  {t('no_matching_specialists')}
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredSpecialists.map(spec => (
                <div key={spec.id} className="premium-card p-8 flex flex-col items-center text-center group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 -mr-16 -mt-16 rounded-full group-hover:scale-150 transition-transform duration-700"></div>

                  <div className="w-24 h-24 bg-slate-50 text-primary rounded-[2.5rem] flex items-center justify-center mb-6 transition-all group-hover:rotate-6 group-hover:bg-primary group-hover:text-white group-hover:shadow-xl group-hover:shadow-primary/20">
                    <UserRound size={48} strokeWidth={2.5} />
                  </div>
                  
                  <div className="flex flex-col items-center gap-1 mb-1 relative z-10">
                    <h3 className="text-2xl font-display font-black text-slate-900 tracking-tight">{spec.name}</h3>
                    {spec.subRole && (
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${spec.subRole === 'employee' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                        {spec.subRole}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-primary font-black bg-primary/5 px-4 py-1.5 rounded-xl uppercase text-[10px] tracking-[0.2em] mt-3 relative z-10">
                    {spec.specialization}
                  </p>

                  <div className="w-full border-t border-slate-50 mt-8 pt-8 space-y-5 relative z-10">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-black text-[10px] flex items-center gap-2 uppercase tracking-widest">
                        <Clock size={16} className="text-primary" /> {t('available_hours')}
                      </span>
                      <span className="font-bold text-slate-900 text-sm">{t('varied_hours')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-black text-[10px] flex items-center gap-2 uppercase tracking-widest">
                        <Calendar size={16} className="text-secondary" /> {t('weekly_coverage')}
                      </span>
                      <div className="flex gap-1">
                        {availableDays.filter(d => spec.workingDays?.includes(d.val)).map(d => (
                          <div key={d.val} className="w-5 h-5 bg-primary text-white rounded-md flex items-center justify-center text-[8px] font-black">{d.short}</div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-3 pt-6">
                      {!isSecretary && (
                        <>
                          <button
                            onClick={() => openEditModal(spec)}
                            className="flex-1 h-12 bg-navy text-white rounded-xl font-black transition-all flex justify-center items-center gap-2 shadow-lg shadow-navy/10 hover:bg-slate-900 active:scale-95 text-xs uppercase tracking-widest interactive-button"
                          >
                            <Edit2 size={16} strokeWidth={3} /> {t('edit')}
                          </button>
                          <button
                            onClick={() => handleDelete(spec.id, spec.name)}
                            className="w-12 h-12 bg-slate-50 text-slate-400 rounded-xl font-black transition-all border border-slate-100 hover:bg-red-50 hover:text-red-500 hover:border-red-100 active:scale-95 flex items-center justify-center interactive-button"
                          >
                            <Trash2 size={18} strokeWidth={2.5} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Specialist Entry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-xl shadow-3xl overflow-hidden animate-in zoom-in-95 duration-500 border border-white/20 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-10 border-b border-gray-50 bg-gray-50">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-primary text-white rounded-[2rem] flex items-center justify-center shadow-2xl shadow-primary/30">
                  <Briefcase size={32} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tighter leading-none">
                    {editingId ? t('modify_record') : t('new_specialist')}
                  </h3>
                  <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest">{t('personnel_config')}</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-300 hover:text-primary p-3 rounded-2xl transition-all hover:bg-gray-50"
              >
                <X size={32} strokeWidth={3} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-10 space-y-10 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t('full_name')} *</label>
                  <input required type="text" name="name" value={formData.name} onChange={handleTextChange} className="w-full bg-gray-50 border-2 border-gray-100 rounded-[1.5rem] px-6 py-5 focus:border-primary focus:bg-white transition-all outline-none font-bold text-slate-900" placeholder={t('name_placeholder_example')} />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t('specialization')} *</label>
                  <input required type="text" name="specialization" value={formData.specialization} onChange={handleTextChange} className="w-full bg-gray-50 border-2 border-gray-100 rounded-[1.5rem] px-6 py-5 focus:border-primary focus:bg-white transition-all outline-none font-bold text-slate-900" placeholder={t('spec_placeholder_example')} />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t('working_days')} {t('coverage_label')}</label>
                <div className="flex flex-wrap gap-2">
                  {availableDays.map(day => {
                    const isSelected = formData.workingDays.includes(day.val);
                    return (
                      <button
                        type="button"
                        key={day.val}
                        onClick={() => toggleDay(day.val)}
                        className={`px-6 py-4 rounded-2xl text-xs font-black border transition-all duration-300 ${isSelected ? 'bg-primary border-primary text-white shadow-2xl scale-105' : 'bg-white border-gray-100 text-gray-400 hover:border-orange-200 hover:text-primary'}`}
                      >
                        {day.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Slot Engine Configuration */}
              {formData.workingDays.length > 0 && (
                <div className="bg-orange-50/50 rounded-[2.5rem] p-10 border border-orange-100/50 space-y-8 animate-in slide-in-from-bottom-8 fade-in duration-500">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] flex items-center gap-3">
                      <Clock size={20} strokeWidth={3} /> {t('smart_slot_gen')}
                    </h4>
                    <div className="h-1 flex-1 mx-6 bg-orange-100/30 rounded-full"></div>
                  </div>
                  <div className="space-y-6">
                    {formData.workingDays.map(day => (
                      <div key={day} className="bg-white/80 backdrop-blur rounded-[2rem] p-6 shadow-sm border border-white transition-all hover:shadow-xl hover:bg-white animate-in zoom-in-95 duration-300">
                        <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                          <div className="flex flex-wrap items-center gap-4">
                            <span className="font-black text-slate-900 uppercase tracking-widest text-sm min-w-[90px]">
                              {isRtl ? availableDays.find(d => d.val === day)?.label : day}
                            </span>
                            <div className="flex flex-wrap items-center gap-2 bg-white/50 p-1.5 rounded-xl border border-orange-100 shadow-sm">
                              <input
                                title="Start Time"
                                type="time"
                                value={formData.daySchedules?.[day]?.start || '09:00'}
                                onChange={(e) => handleDayTimeChange(day, 'start', e.target.value)}
                                className="bg-white text-slate-900 border-2 border-transparent focus:border-primary rounded-lg px-2 py-1.5 text-xs font-black outline-none transition-all w-[110px]"
                              />
                              <span className="text-gray-300 font-black text-[10px]">TO</span>
                              <input
                                title="End Time"
                                type="time"
                                value={formData.daySchedules?.[day]?.end || '15:00'}
                                onChange={(e) => handleDayTimeChange(day, 'end', e.target.value)}
                                className="bg-white text-slate-900 border-2 border-transparent focus:border-secondary rounded-lg px-2 py-1.5 text-xs font-black outline-none transition-all w-[110px]"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-4">
                          {generateDailySlots(formData.daySchedules?.[day]?.start || '10:00', formData.daySchedules?.[day]?.end || '21:00', 45).map((slotObj, idx) => (
                            <div key={`${day}-${slotObj.time}-${idx}`} className={`border-2 rounded-xl px-4 py-2 flex items-center gap-3 transition-all ${slotObj.type === 'break' ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-white border-blue-100 text-slate-900 shadow-sm hover:border-primary'}`}>
                              {slotObj.type === 'break' && <span className="text-[10px] font-black uppercase tracking-widest"><Coffee size={12} className="inline mr-1"/> Break</span>}
                              <span className="text-xs font-black">{slotObj.time}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 flex gap-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-5 rounded-[2rem] font-black text-gray-400 hover:bg-gray-50 transition-all uppercase tracking-widest text-xs">
                  {t('cancel')}
                </button>
                <button type="submit" disabled={isSubmitting} className="flex-[2] bg-primary text-white font-black py-5 rounded-[2rem] shadow-2xl shadow-primary/30 hover:opacity-90 transition-all disabled:opacity-50 active:scale-95 text-sm uppercase tracking-widest">
                  {isSubmitting ? t('loading') : t('commit_config')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
