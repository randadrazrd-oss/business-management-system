import { db } from '../config/firebase';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from 'firebase/firestore';

const COLLECTION_NAME = 'secretaries';

export const getSecretaries = async () => {
  const snap = await getDocs(collection(db, COLLECTION_NAME));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const addSecretary = async (data) => {
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...data,
    createdAt: serverTimestamp()
  });
  return { id: docRef.id, ...data };
};

export const updateSecretary = async (id, data) => {
  await updateDoc(doc(db, COLLECTION_NAME, id), data);
};

export const deleteSecretary = async (id) => {
  await deleteDoc(doc(db, COLLECTION_NAME, id));
};
