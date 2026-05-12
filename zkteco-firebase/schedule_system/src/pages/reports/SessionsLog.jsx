import React, { useState, useEffect } from 'react';
import { useTranslation } from '../../contexts/LanguageContext';
import { db } from '../../config/firebase';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { format } from 'date-fns';
import { FileText, Search, Filter } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function SessionsLog() {
  const { t, lang } = useTranslation();
  const isRtl = lang === 'ar';

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadSessions();
  }, [statusFilter]);

  const loadSessions = async () => {
    setLoading(true);
    try {
      let q;
      if (statusFilter === 'all') {
        q = query(collection(db, 'sessions'), orderBy('date', 'desc'), limit(100));
      } else {
        q = query(collection(db, 'sessions'), where('status', '==', statusFilter), orderBy('date', 'desc'), limit(100));
      }
      
      const snap = await getDocs(q);
      setSessions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error("Sessions Log Error:", err);
      if (err.message?.includes('index')) {
        toast.error('Firestore Index required. Check console for link.');
      } else {
        toast.error(t('failed_load_history'));
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredSessions = sessions.filter(s => 
    s.childName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.specialistName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`space-y-10 animate-in fade-in duration-700 ${isRtl ? 'text-right' : 'text-left'}`}>
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div>
          <h2 className="text-3xl md:text-4xl font-display font-black text-slate-900 tracking-tight">{t('sessions_log')}</h2>
          <p className="text-slate-500 font-medium text-sm md:text-base">{t('detailed_history')}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
          <div className="relative flex-1 sm:w-64">
             <Search className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-gray-400`} size={18} />
             <input 
               type="text" 
               placeholder={t('search_placeholder')} 
               className={`${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-3 md:py-2 bg-white border border-gray-200 rounded-xl outline-none focus:border-primary w-full text-sm font-bold shadow-sm`}
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
          </div>
          <div className="relative flex-1 sm:w-48">
            <Filter className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-gray-400`} size={18} />
            <select
              className={`${isRtl ? 'pr-10 pl-8' : 'pl-10 pr-8'} py-3 md:py-2 bg-white border border-gray-200 rounded-xl outline-none focus:border-primary text-sm font-bold appearance-none w-full shadow-sm`}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">{t('all_statuses')}</option>
              <option value="completed">{t('completed_label')}</option>
              <option value="scheduled">{t('scheduled_booked')}</option>
              <option value="cancelled">{t('cancelled_label')}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-20 text-center text-gray-400 font-bold animate-pulse">{t('loading_secure_log')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className={`w-full ${isRtl ? 'text-right' : 'text-left'}`}>
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <th className="px-6 py-4">{t('date_time')}</th>
                  <th className="px-6 py-4">{t('participant_record')}</th>
                  <th className="px-6 py-4">{t('clinical_specialist')}</th>
                  <th className="px-6 py-4">{t('status')}</th>
                  <th className="px-6 py-4">{t('clinical_notes')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredSessions.map(session => {
                   const sDate = session.date ? new Date(session.date) : null;
                   return (
                  <tr key={session.id} className="hover:bg-primary/5 transition-colors hidden-print">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800">{sDate ? format(sDate, 'MMM dd, yyyy') : t('no_date')}</div>
                      <div className="text-xs text-primary font-black uppercase tracking-wider">{session.time || t('no_time')}</div>
                    </td>
                    <td className="px-6 py-4 font-black text-slate-900">{session.childName || t('unknown_patient')}</td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-500">{session.specialistName || 'System'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        session.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                        session.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-primary/10 text-primary'
                      }`}>
                        {session.status === 'completed' ? t('completed_label') : (session.status === 'cancelled' ? t('cancelled_label') : t('scheduled_label'))}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-gray-500 max-w-xs truncate" title={session.notes}>
                      {session.notes || '-'}
                    </td>
                  </tr>
                )})}
                {filteredSessions.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-gray-400 font-bold italic">{t('no_session_records')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
