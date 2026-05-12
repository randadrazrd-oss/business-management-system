import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  User,
  Calendar,
  ClipboardList,
  ChevronLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  History,
  Target,
  Plus,
  FileText,
  Upload,
  Trash2
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Label } from 'recharts';
import { getChild, updateChildProgress, uploadChildDocument, deleteChildDocument } from '../services/childService';
import { getSessionsByChildId } from '../services/sessionService';
import { getTreatmentPlansForChild, addGoalToPlan } from '../services/treatmentPlanService';
import { getChildMedications, deleteMedication } from '../services/medicationService';
import MedicationModal from '../components/MedicationModal';
import { Pill } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { toast } from 'react-hot-toast';

export default function ChildProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, lang } = useTranslation();
  const isRtl = lang === 'ar';

  const [child, setChild] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [treatmentPlan, setTreatmentPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Storage State
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = React.useRef(null);

  // Goal Modal State
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');

  // Medication State
  const [medications, setMedications] = useState([]);
  const [isMedModalOpen, setIsMedModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState(null);

  const loadMedications = async () => {
    try {
      const meds = await getChildMedications(id);
      setMedications(meds);
    } catch (err) {
      console.error('Failed to load meds:', err);
    }
  };

  useEffect(() => {
    if (id) {
      setLoading(true);
      
      const safeFetch = async (promise, fallback = []) => {
        try { return await promise; } 
        catch (err) { console.error('Fetch error:', err); return fallback; }
      };

      Promise.all([
        safeFetch(getChild(id), null),
        safeFetch(getSessionsByChildId(id)),
        safeFetch(getTreatmentPlansForChild(id)),
        safeFetch(getChildMedications(id))
      ])
        .then(([childData, sessionData, planData, medsData]) => {
          if (childData) {
            setChild(childData);
            setSessions(sessionData);
            if (planData && planData.length > 0) {
              setTreatmentPlan(planData[0]);
            }
            setMedications(medsData);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [id, isRtl, t]);

  const handleStatusChange = async (newStatus) => {
    setUpdating(true);
    try {
      await updateChildProgress(id, { improvementStatus: newStatus });
      setChild({ ...child, improvementStatus: newStatus });
      toast.success(t('status_updated'));
    } catch (err) {
      console.error(err);
      toast.error(t('update_failed'));
    } finally {
      setUpdating(false);
    }
  };

  const handleAddGoal = async (e) => {
    e.preventDefault();
    if (!newGoalTitle.trim() || !treatmentPlan) return;

    setUpdating(true);
    try {
      await addGoalToPlan(treatmentPlan.id, {
        title: newGoalTitle,
        status: 'pending'
      });

      const updatedPlan = {
        ...treatmentPlan,
        goals: [...(treatmentPlan.goals || []), {
          id: Date.now().toString(),
          title: newGoalTitle,
          status: 'pending'
        }]
      };
      setTreatmentPlan(updatedPlan);
      setNewGoalTitle('');
      setIsGoalModalOpen(false);
      toast.success(t('goal_added_success'));
    } catch (err) {
      console.error(err);
      toast.error(t('goal_add_failed'));
    } finally {
      setUpdating(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadingFile(true);
    setUploadProgress(0);
    try {
      const newDoc = await uploadChildDocument(child.id, file, (progress) => {
        setUploadProgress(Math.round(progress));
      });
      setChild(prev => ({ ...prev, attachments: [...(prev.attachments || []), newDoc] }));
      toast.success(t('file_uploaded_success'));
    } catch (err) {
      console.error(err);
      toast.error(t('upload_failed'));
    } finally {
      setUploadingFile(false);
      event.target.value = '';
    }
  };

  const handleDeleteAttachment = async (attachment) => {
    if (!window.confirm(t('delete_file_confirm'))) return;
    try {
      await deleteChildDocument(child.id, attachment);
      setChild(prev => ({
        ...prev,
        attachments: prev.attachments.filter(a => a.path !== attachment.path)
      }));
      toast.success(t('deleted_success'));
    } catch {
      toast.error(t('delete_failed'));
    }
  };

  const handleDeleteMedication = async (medId) => {
    if (!window.confirm('Delete this medication?')) return;
    try {
      await deleteMedication(id, medId);
      toast.success('Medication deleted');
      loadMedications();
    } catch {
      toast.error('Failed to delete medication');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <Loader2 className="animate-spin text-primary" size={48} />
        <p className="font-black text-gray-400">{t('loading_profile')}</p>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="p-8 text-center bg-red-50 rounded-[3rem] border-2 border-red-100">
        <h2 className="text-2xl font-black text-red-600">{t('child_not_found')}</h2>
        <button onClick={() => navigate('/children')} className="mt-4 text-primary font-bold underline">{t('go_back')}</button>
      </div>
    );
  }

  const progressPercent = Math.round((child.completedSessions / child.totalSessions) * 100) || 0;
  const pieData = [
    { name: 'Completed', value: child.completedSessions, color: '#ea580c' },
    { name: 'Remaining', value: Math.max(0, child.totalSessions - child.completedSessions), color: '#f3f4f6' }
  ];

  return (
    <div className={`space-y-8 animate-in fade-in duration-500 ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>

      {/* Action Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/children')}
          className="p-3 bg-white border border-gray-100 rounded-2xl hover:bg-gray-50 transition-all active:scale-95 shadow-sm"
        >
          <ChevronLeft className={isRtl ? 'rotate-180' : ''} size={24} />
        </button>
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter">{child.name}</h2>
          <p className="text-gray-400 font-bold text-sm tracking-widest uppercase">{t('patient_profile')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Column: Basic Info & Progress */}
        <div className="lg:col-span-1 space-y-8">

          {/* Main Info Card */}
          <div className="bg-white rounded-[24px] p-8 shadow-sm border border-slate-200/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-navy opacity-[0.03] -mr-16 -mt-16 rounded-full"></div>

            <div className="flex flex-col items-center mb-8">
              <div className="w-24 h-24 bg-orange-50 text-primary rounded-[2.5rem] flex items-center justify-center mb-4 shadow-xl shadow-primary/10 border-4 border-white">
                <User size={48} strokeWidth={2.5} />
              </div>
              <h3 className="text-2xl font-black text-navy">{child.name}</h3>
              <span className="bg-orange-50 text-primary px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] mt-2 border border-orange-100">
                {child.diagnosis}
              </span>
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-50">
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-gray-400 flex items-center gap-2"><Calendar size={16} /> {t('age')}</span>
                <span className="text-slate-900">{child.age} {t('years')}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-gray-400 flex items-center gap-2"><Stethoscope size={16} /> {t('status')}</span>
                <select
                  value={child.improvementStatus || 'stable'}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={updating}
                  className={`bg-gray-50 border-none rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-widest ${updating ? 'opacity-50' : ''}`}
                >
                  <option value="improving" className="text-emerald-600">{t('improving')}</option>
                  <option value="stable" className="text-blue-600">{t('stable')}</option>
                  <option value="attention" className="text-red-600">{t('needs_attention')}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Progress Card */}
          <div className="bg-white rounded-[24px] p-8 shadow-sm border border-slate-200/50 text-center">
            <h4 className="text-gray-400 font-black text-[10px] uppercase tracking-widest mb-6">{t('session_progress')}</h4>

            <div className="h-[200px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                    <Label
                      value={`${progressPercent}%`}
                      position="center"
                      className="font-black text-3xl fill-slate-900"
                    />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="p-4 bg-gray-50 rounded-2xl">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-tight">{t('completed')}</p>
                <p className="text-xl font-black text-slate-900">{child.completedSessions}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-tight">{isRtl ? 'الإجمالي' : 'Total'}</p>
                <p className="text-xl font-black text-slate-900">{child.totalSessions}</p>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: History & Goals */}
        <div className="lg:col-span-2 space-y-8">

          {/* Treatment Plan Section */}
          <div className="bg-white rounded-[24px] border border-slate-200/50 shadow-sm p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <Target className="text-primary" />
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{t('treatment_plan_goals')}</h3>
              </div>
              <button
                onClick={() => setIsGoalModalOpen(true)}
                className="bg-orange-50 text-primary p-3 rounded-2xl hover:bg-primary hover:text-white transition-all active:scale-95"
              >
                <Plus size={24} />
              </button>
            </div>

            {treatmentPlan ? (
              <div className="space-y-4">
                {(!treatmentPlan.goals || treatmentPlan.goals.length === 0) ? (
                  <div className="p-8 text-center bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-100">
                    <p className="text-gray-400 font-bold">{t('no_goals_defined')}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {treatmentPlan.goals.map((goal, idx) => (
                      <div key={goal.id || idx} className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-100 hover:border-primary/20 transition-all group">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${goal.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-primary shadow-sm'}`}>
                            {goal.status === 'completed' ? <CheckCircle2 size={20} /> : <Target size={20} />}
                          </div>
                          <div>
                            <p className={`font-bold text-slate-900 ${goal.status === 'completed' ? 'line-through opacity-50' : ''}`}>{goal.title}</p>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{goal.status === 'completed' ? t('completed_label') : t('pending_label')}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-100">
                <p className="text-gray-400 font-bold">{t('no_treatment_plan')}</p>
              </div>
            )}
          </div>

          {/* Medications Section */}
          <div className="bg-white rounded-[24px] border border-slate-200/50 shadow-sm p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <Pill className="text-indigo-500" />
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Active Medications</h3>
              </div>
              <button
                onClick={() => { setEditingMed(null); setIsMedModalOpen(true); }}
                className="bg-indigo-50 text-indigo-600 p-3 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all active:scale-95"
              >
                <Plus size={24} />
              </button>
            </div>

            {medications.length === 0 ? (
              <div className="p-8 text-center bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-100">
                <p className="text-gray-400 font-bold">No active medications</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {medications.map((med) => (
                  <div key={med.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-100 hover:border-indigo-500/20 transition-all group gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white text-indigo-500 shadow-sm shrink-0">
                        <Pill size={20} />
                      </div>
                      <div>
                        <p className="font-black text-slate-900 text-lg">{med.name} <span className="text-sm font-bold text-gray-500">({med.dosage})</span></p>
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1 bg-indigo-50 px-2 py-0.5 rounded w-fit">{med.time}</p>
                        {med.instructions && <p className="text-xs text-gray-500 mt-2 italic">&quot;{med.instructions}&quot;</p>}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                       <button onClick={() => { setEditingMed(med); setIsMedModalOpen(true); }} className="text-gray-400 hover:text-indigo-500 transition-all p-2 bg-white rounded-xl shadow-sm"><Stethoscope size={16} /></button>
                       <button onClick={() => handleDeleteMedication(med.id)} className="text-gray-400 hover:text-red-500 transition-all p-2 bg-white rounded-xl shadow-sm"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Session History Section */}
          <div className="bg-white rounded-[24px] border border-slate-200/50 shadow-sm flex flex-col min-h-[500px] overflow-hidden">
            <div className="flex items-center gap-4 p-8 border-b border-gray-50 bg-gray-50/30">
              <History className="text-primary" />
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{t('clinical_session_log')}</h3>
            </div>

            <div className="p-8 flex-1 overflow-y-auto custom-scrollbar max-h-[600px]">
              {sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-20 text-gray-300 gap-4 opacity-50">
                  <ClipboardList size={64} strokeWidth={1} />
                  <p className="font-bold text-sm tracking-widest">{t('no_session_records')}</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {sessions.map((session) => (
                    <div key={session.id} className={`relative ${isRtl ? 'pr-8 border-r-2' : 'pl-8 border-l-2'} border-gray-100 py-2 group`}>
                      <div className={`absolute ${isRtl ? 'right-[-9px]' : 'left-[-9px]'} top-4 w-4 h-4 rounded-full border-2 border-white bg-orange-200 ring-4 ring-orange-50 group-hover:bg-primary transition-all`}></div>

                      <div className="bg-white p-6 rounded-[2rem] border border-gray-50 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all">
                        <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                          <div>
                            <div className="flex items-center gap-2 text-primary">
                              <Calendar size={14} strokeWidth={3} />
                            </div>
                            <h5 className="font-black text-slate-900 text-lg mt-1">{session.specialistName}</h5>
                          </div>
                          <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${session.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                              session.status === 'cancelled' || session.status === 'canceled' ? 'bg-red-50 text-red-600 border border-red-100' :
                                'bg-blue-50 text-blue-600 border border-blue-100'
                            }`}>
                            {session.status === 'completed' && <CheckCircle2 size={12} />}
                            {(session.status === 'cancelled' || session.status === 'canceled') && <AlertCircle size={12} />}
                            {session.status === 'completed' ? t('completed_label') : (session.status === 'cancelled' || session.status === 'canceled' ? t('cancelled_label') : t('scheduled_label'))}
                          </div>
                        </div>

                        {session.clinicalNotes ? (
                          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 text-sm italic text-gray-600 leading-relaxed">
                            <p>&quot;{session.clinicalNotes}&quot;</p>
                          </div>
                        ) : (
                          <p className="text-gray-300 text-xs font-bold italic">{t('no_clinical_notes')}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Attachments Section */}
          <div className="bg-white rounded-[24px] border border-slate-200/50 shadow-sm p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <FileText className="text-primary" />
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{t('attachments_reports')}</h3>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              />
              <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                  className="bg-orange-50 text-primary px-6 py-3 rounded-2xl font-black text-xs flex items-center gap-2 hover:bg-primary hover:text-white transition-all active:scale-95 disabled:opacity-50"
                >
                  {uploadingFile ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                  {uploadingFile ? `${uploadProgress}%` : t('upload_file')}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(child.attachments || []).map((att, idx) => (
                <div key={idx} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between group hover:border-primary/20 transition-all">
                  <div className="flex items-center gap-3 w-3/4" onClick={() => window.open(att.url, '_blank')} role="button">
                    <div className="p-2 bg-white rounded-lg text-red-500 shadow-sm"><FileText size={20} /></div>
                    <div className="w-full">
                      <p className="text-xs font-black text-slate-900 truncate" title={att.name}>{att.name}</p>
                      <p className="text-[10px] text-gray-400 font-bold">{(att.sizeBytes / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteAttachment(att); }} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-2 bg-white rounded-xl shadow-sm"><Trash2 size={16} /></button>
                </div>
              ))}

              {(!child.attachments || child.attachments.length === 0) && !uploadingFile && (
                <div className="col-span-1 md:col-span-2 p-4 bg-gray-50/50 rounded-2xl border border-gray-100 flex items-center justify-center border-dashed border-2 py-10" onClick={() => fileInputRef.current?.click()} role="button">
                  <div className="flex flex-col items-center gap-2 text-gray-300">
                    <Upload size={24} />
                    <p className="text-[10px] font-black uppercase tracking-widest">{t('no_attachments_click')}</p>
                  </div>
                </div>
              )}

              {uploadingFile && (
                <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100 flex items-center justify-center border-dashed border-2">
                  <div className="flex flex-col items-center gap-2 text-primary">
                    <Loader2 size={24} className="animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-widest">{t('uploading')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Add Goal Modal */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-100">
            <div className="bg-slate-900 p-10 text-white relative">
              <h3 className="text-2xl font-black">{t('add_clinical_goal')}</h3>
              <p className="text-white/70 font-bold text-sm mt-1">{t('define_goal_for')} {child.name}</p>
            </div>

            <form onSubmit={handleAddGoal} className="p-10 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">{t('goal_description')}</label>
                <textarea
                  required
                  rows="3"
                  value={newGoalTitle}
                  onChange={e => setNewGoalTitle(e.target.value)}
                  placeholder={t('goal_placeholder')}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-[1.5rem] px-6 py-5 focus:border-primary focus:bg-white transition-all outline-none font-bold text-slate-900 resize-none"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsGoalModalOpen(false)} className="flex-1 py-5 rounded-[2rem] font-black text-gray-400 hover:bg-gray-50 transition-all uppercase tracking-widest text-xs">
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="flex-[2] bg-primary text-white font-black py-5 rounded-[2rem] shadow-2xl shadow-primary/30 hover:opacity-90 transition-all disabled:opacity-50 active:scale-95 text-sm uppercase tracking-widest"
                >
                  {updating ? t('saving') : t('add_goal_btn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Medication Modal */}
      <MedicationModal 
        isOpen={isMedModalOpen} 
        onClose={() => setIsMedModalOpen(false)} 
        childId={id} 
        editMed={editingMed} 
        onRefresh={loadMedications} 
      />

    </div>
  );
}
