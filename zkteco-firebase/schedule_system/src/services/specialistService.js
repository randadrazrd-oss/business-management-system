import { db, USE_MOCK } from '../config/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { mockSpecialists, delay } from './mockData';

const COLLECTION_NAME = 'specialists';

const daysMap = {
  "Sunday": 0, "Monday": 1, "Tuesday": 2, "Wednesday": 3, "Thursday": 4, "Friday": 5, "Saturday": 6
};

const DEFAULT_CLINIC_SLOTS = ["09:00", "09:45", "10:30", "11:15", "12:00", "13:00", "13:45", "14:30"];

export const getSpecialists = async () => {
  try {
    if (USE_MOCK) {
      await delay(300);
      return [...mockSpecialists];
    }
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      const reverseDaysMap = {
        0: "Sunday", 1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday", 5: "Friday", 6: "Saturday"
      };
      const normalizedDays = Array.isArray(data.workingDays) 
        ? data.workingDays.map(d => typeof d === 'number' ? reverseDaysMap[d] : typeof d === 'string' && daysMap[d] !== undefined ? d : null).filter(d => d !== null)
        : [];
      return { id: doc.id, ...data, workingDays: normalizedDays, originalWorkingDays: data.workingDays };
    });
  } catch (error) {
    console.error("Error fetching specialists:", error);
    throw error;
  }
};

export const addSpecialist = async (specialistData) => {
  console.log("--> Attempting to add new specialist:", specialistData);
  try {
    if (!specialistData.name || !specialistData.specialization) {
      throw new Error("Specialist name and specialization are required");
    }

    if (USE_MOCK) {
      await delay(300);
      const newSpec = { ...specialistData, id: 's' + Date.now() };
      mockSpecialists.push(newSpec);
      console.log("--> [MOCK] Successfully added specialist:", newSpec);
      return newSpec;
    }
    
    const finalData = {
        ...specialistData,
        availability: specialistData.availability || {}
    };
    
    console.log(`--> Sending request to Firebase Firestore (collection: ${COLLECTION_NAME})...`);
    const docRef = await addDoc(collection(db, COLLECTION_NAME), finalData);
    
    console.log("--> [SUCCESS] Specialist saved to Firestore with ID:", docRef.id);
    return { id: docRef.id, ...finalData };
  } catch (error) {
    console.error("--> [ERROR] Failed to save specialist to Firestore:", error);
    throw error; // Re-throw to be handled by UI
  }
};

export const updateSpecialist = async (id, updatedData) => {
  try {
    if (USE_MOCK) {
      await delay(300);
      const index = mockSpecialists.findIndex(s => s.id === id);
      if (index !== -1) {
        mockSpecialists[index] = { ...mockSpecialists[index], ...updatedData };
      }
      return;
    }
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, updatedData);
  } catch (error) {
    console.error("Error updating specialist:", error);
    throw error;
  }
};

export const deleteSpecialist = async (id) => {
  try {
    if (USE_MOCK) {
      await delay(300);
      const index = mockSpecialists.findIndex(s => s.id === id);
      if (index !== -1) mockSpecialists.splice(index, 1);
      return;
    }
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting specialist:", error);
    throw error;
  }
};
