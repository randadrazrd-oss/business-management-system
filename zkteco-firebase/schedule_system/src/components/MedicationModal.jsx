import React, { useState } from 'react';
import { X, Pill, CheckCircle2, Loader2 } from 'lucide-react';
import { addMedication, updateMedication } from '../services/medicationService';
import { toast } from 'react-hot-toast';

export default function MedicationModal({ isOpen, onClose, childId, editMed, onRefresh }) {
  const [formData, setFormData] = useState({
    name: editMed ? editMed.name : '',
    dosage: editMed ? editMed.dosage : '',
    time: editMed ? editMed.time : '',
    instructions: editMed ? editMed.instructions : ''
  });
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { sendNotification } = await import('../services/notificationService');
      if (editMed) {
        await updateMedication(childId, editMed.id, formData);
        toast.success('Medication updated successfully');
        await sendNotification({
          title: 'Medication Updated',
          message: `${formData.name} dosage/time has been changed.`,
          type: 'medication',
          childId
        });
      } else {
        await addMedication(childId, formData);
        toast.success('Medication added successfully');
        await sendNotification({
          title: 'New Medication Added',
          message: `${formData.name} (${formData.dosage}) scheduled for ${formData.time}.`,
          type: 'medication',
          childId
        });
      }
      onRefresh();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save medication');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-white/20 flex flex-col">
        <div className="px-8 py-6 bg-indigo-900 text-white flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
               <Pill className="opacity-80" /> {editMed ? 'Edit Medication' : 'Add Medication'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
           <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Medication Name</label>
              <input 
                required
                type="text"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-4 font-bold focus:border-indigo-500 focus:bg-white outline-none transition-all"
                placeholder="e.g. Adderall"
              />
           </div>
           
           <div className="flex gap-4">
             <div className="space-y-2 flex-1">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Dosage</label>
                <input 
                  required
                  type="text"
                  value={formData.dosage}
                  onChange={e => setFormData({...formData, dosage: e.target.value})}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-4 font-bold focus:border-indigo-500 focus:bg-white outline-none transition-all"
                  placeholder="e.g. 10mg"
                />
             </div>
             <div className="space-y-2 flex-1">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Time</label>
                <input 
                  required
                  type="time"
                  value={formData.time}
                  onChange={e => setFormData({...formData, time: e.target.value})}
                  className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-4 font-bold focus:border-indigo-500 focus:bg-white outline-none transition-all"
                />
             </div>
           </div>

           <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest px-1">Special Instructions</label>
              <textarea 
                rows="3"
                value={formData.instructions}
                onChange={e => setFormData({...formData, instructions: e.target.value})}
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-4 font-medium min-h-[100px] outline-none focus:bg-white focus:border-indigo-500 transition-all resize-none"
                placeholder="e.g. Take with food"
              />
           </div>

           <button 
            type="submit" 
            disabled={saving}
            className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-lg shadow-sm hover:opacity-90 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
           >
             {saving ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={24} />}
             {saving ? 'Saving...' : 'Save Medication'}
           </button>
        </form>
      </div>
    </div>
  );
}
