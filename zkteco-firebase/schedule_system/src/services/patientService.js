import { collection, query, getDocs, doc, getDoc, setDoc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * patientService.js
 * Clean CRUD for Patient (Child) Domain.
 */

const CHILDREN_COLLECTION = 'children';

export const getChildren = async () => {
  const q = query(collection(db, CHILDREN_COLLECTION));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ childId: doc.id, ...doc.data() }));
};

export const getChild = async (childId) => {
  const childDoc = await getDoc(doc(db, CHILDREN_COLLECTION, childId));
  if (!childDoc.exists()) return null;
  return { childId: childDoc.id, ...childDoc.data() };
};

export const createChild = async (data) => {
  // STRICT DATA MODEL: name, age, diagnosis, notes (NO IQ field)
  const childData = {
    name: data.name || '',
    age: data.age || null,
    diagnosis: data.diagnosis || '',
    notes: data.notes || '',
  };
  
  const docRef = await addDoc(collection(db, CHILDREN_COLLECTION), childData);
  return { childId: docRef.id, ...childData };
};

export const updateChild = async (childId, data) => {
  const childRef = doc(db, CHILDREN_COLLECTION, childId);
  const childData = {};
  if (data.name !== undefined) childData.name = data.name;
  if (data.age !== undefined) childData.age = data.age;
  if (data.diagnosis !== undefined) childData.diagnosis = data.diagnosis;
  if (data.notes !== undefined) childData.notes = data.notes;
  
  await updateDoc(childRef, childData);
};
