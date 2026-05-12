import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../contexts/LanguageContext';
import { createUserAccount, getAllUsers, deactivateUser, reactivateUser, resetUserPassword } from '../../services/userService';
import { getSecretaries, addSecretary, updateSecretary } from '../../services/secretaryService';
import { getSpecialists, updateSpecialist } from '../../services/specialistService';
import { toast } from 'react-hot-toast';
import { Search, PlusCircle, Users, Unlock, ShieldBan, ShieldAlert } from 'lucide-react';

export default function UserManagement() {
  const { t, lang } = useTranslation();
  const isRtl = lang === 'ar';
  
  const [activeTab, setActiveTab] = useState('secretaries'); // 'secretaries' | 'specialists'
  const [users, setUsers] = useState([]);
  const [secretaries, setSecretaries] = useState([]);
  const [specialists, setSpecialists] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    specialistId: '',
    subRole: 'employee', // 'trainee' | 'employee'
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [uRes, secRes, specRes] = await Promise.all([
        getAllUsers(),
        getSecretaries(),
        getSpecialists()
      ]);
      setUsers(uRes);
      setSecretaries(secRes);
      setSpecialists(specRes);
    } catch (err) {
      toast.error('Failed to load system data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateSecretary = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Create Firestore secretary record first
      const newSec = await addSecretary({
        name: formData.name,
        email: formData.email,
        active: true
      });

      // Create Firebase Auth + User Profile
      await createUserAccount({
        email: formData.email,
        password: formData.password,
        displayName: formData.name,
        role: 'secretary',
        secretaryId: newSec.id
      });

      toast.success(isRtl ? 'تم إضافة السكرتير بنجاح' : 'Secretary created successfully');
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Error creating secretary account');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateSpecialistAccount = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (!formData.specialistId) throw new Error('Please select a specialist');

      const spec = specialists.find(s => s.id === formData.specialistId);
      
      const newAcc = await createUserAccount({
        email: formData.email,
        password: formData.password,
        displayName: spec.name,
        role: 'specialist',
        specialistId: spec.id,
        specialistSubRole: formData.subRole
      });

      // Link UID and subRole back to the specialist record
      await updateSpecialist(spec.id, { 
        uid: newAcc.uid,
        email: formData.email,
        subRole: formData.subRole
      });

      toast.success(isRtl ? 'تم إنشاء الحساب بنجاح' : 'Specialist account created successfully');
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Error creating account');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleUserStatus = async (uid, currentStatus) => {
    try {
      if (currentStatus) {
        await deactivateUser(uid);
        toast.success(isRtl ? 'تم إيقاف החساب' : 'Account deactivated');
      } else {
        await reactivateUser(uid);
        toast.success(isRtl ? 'تم تفعيل الحساب' : 'Account reactivated');
      }
      loadData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const openSecModal = () => {
    setFormData({ name: '', email: '', password: '', specialistId: '', subRole: 'employee' });
    setIsModalOpen(true);
  };

  return (
    <div className={`space-y-8 animate-in fade-in duration-500 ${isRtl ? 'text-right rtl' : 'text-left'}`}>
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-navy tracking-tight">{isRtl ? 'إدارة المستخدمين' : 'User Management'}</h2>
          <p className="text-gray-500 font-medium">System Administration Console</p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-gray-200">
        <button
          className={`pb-4 px-4 font-bold text-lg transition-colors border-b-4 ${activeTab === 'secretaries' ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
          onClick={() => setActiveTab('secretaries')}
        >
          {isRtl ? 'السكرتارية' : 'Secretaries'}
        </button>
        <button
          className={`pb-4 px-4 font-bold text-lg transition-colors border-b-4 ${activeTab === 'specialists' ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
          onClick={() => setActiveTab('specialists')}
        >
          {isRtl ? 'حسابات الأخصائيين' : 'Specialist Accounts'}
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
          <h3 className="font-bold text-navy text-lg">
            {activeTab === 'secretaries' ? (isRtl ? 'قائمة السكرتارية' : 'Secretary Roster') : (isRtl ? 'وصول الأخصائيين' : 'Specialist Access')}
          </h3>
          <button
            onClick={openSecModal}
            className="bg-navy text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-black transition-all text-sm"
          >
            <PlusCircle size={18} />
            {activeTab === 'secretaries' ? (isRtl ? 'إضافة سكرتير' : 'Add Secretary') : (isRtl ? 'إنشاء حساب أخصائي' : 'Create Access Account')}
          </button>
        </div>

        {loading ? (
           <div className="p-20 text-center text-gray-400 font-bold animate-pulse">Loading identities...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr className="text-xs font-black text-gray-400 uppercase tracking-widest">
                  <th className="px-6 py-4">{isRtl ? 'الاسم' : 'Name'}</th>
                  <th className="px-6 py-4">{isRtl ? 'البريد الإلكتروني' : 'Email Account'}</th>
                  {activeTab === 'specialists' && <th className="px-6 py-4">{isRtl ? 'نوع الحساب' : 'Sub-Role'}</th>}
                  <th className="px-6 py-4">{isRtl ? 'الحالة' : 'Status'}</th>
                  <th className="px-6 py-4 text-center">{isRtl ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(activeTab === 'secretaries' ? users.filter(u => u.role === 'secretary') : users.filter(u => u.role === 'specialist')).map(user => (
                  <tr key={user.uid} className="hover:bg-orange-50/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-navy">{user.displayName}</td>
                    <td className="px-6 py-4 text-gray-500 font-medium">{user.email}</td>
                    {activeTab === 'specialists' && (
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${user.specialistSubRole === 'trainee' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                          {user.specialistSubRole || 'Unknown'}
                        </span>
                      </td>
                    )}
                    <td className="px-6 py-4">
                      {user.active ? (
                        <span className="text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full text-xs font-bold border border-emerald-100">Active</span>
                      ) : (
                         <span className="text-red-500 bg-red-50 px-3 py-1 rounded-full text-xs font-bold border border-red-100">Deactivated</span>
                      )}
                    </td>
                    <td className="px-6 py-4 flex justify-center gap-2">
                       <button
                          onClick={() => toggleUserStatus(user.uid, user.active)}
                          className={`p-2 rounded-lg transition-colors ${user.active ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                          title={user.active ? 'Deactivate' : 'Reactivate'}
                       >
                         {user.active ? <ShieldBan size={18} /> : <ShieldAlert size={18} />}
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-navy/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50">
              <h3 className="text-xl font-bold text-navy">
                {activeTab === 'secretaries' ? 'Add New Secretary' : 'Create Specialist Account'}
              </h3>
            </div>
            <form onSubmit={activeTab === 'secretaries' ? handleCreateSecretary : handleCreateSpecialistAccount} className="p-6 space-y-4">
              
              {activeTab === 'secretaries' ? (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Full Name</label>
                  <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-primary outline-none" />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Select Specialist</label>
                  <select required name="specialistId" value={formData.specialistId} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-primary outline-none font-bold">
                    <option value="">-- Choose Specialist --</option>
                    {specialists.filter(s => !s.uid).map(s => (
                      <option key={s.id} value={s.id}>{s.name} - {s.specialization}</option>
                    ))}
                  </select>
                </div>
              )}

              {activeTab === 'specialists' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Role Type</label>
                  <select required name="subRole" value={formData.subRole} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-primary outline-none font-bold">
                    <option value="employee">Employee</option>
                    <option value="trainee">Trainee</option>
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Login Email</label>
                <input required type="email" name="email" value={formData.email} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-primary outline-none" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Initial Password</label>
                <input required type="password" name="password" minLength={6} value={formData.password} onChange={handleChange} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:border-primary outline-none" />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 bg-navy text-white rounded-xl font-bold shadow hover:bg-black transition-colors disabled:opacity-50">
                  {isSubmitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
