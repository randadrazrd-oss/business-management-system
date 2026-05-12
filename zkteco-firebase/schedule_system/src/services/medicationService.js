import { db } from '../config/firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, updateDoc, query, orderBy } from 'firebase/firestore';

export const getChildMedications = async (childId) => {
  const medsRef = collection(db, `children/${childId}/medications`);
  const q = query(medsRef, orderBy('time'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addMedication = async (childId, medicationData) => {
  const medsRef = collection(db, `children/${childId}/medications`);
  const newMedRef = doc(medsRef);
  const data = {
    ...medicationData,
    id: newMedRef.id,
    createdAt: new Date().toISOString()
  };
  await setDoc(newMedRef, data);
  return data;
};

export const updateMedication = async (childId, medicationId, medicationData) => {
  const medRef = doc(db, `children/${childId}/medications/${medicationId}`);
  await updateDoc(medRef, {
    ...medicationData,
    updatedAt: new Date().toISOString()
  });
};

export const deleteMedication = async (childId, medicationId) => {
  const medRef = doc(db, `children/${childId}/medications/${medicationId}`);
  await deleteDoc(medRef);
};
