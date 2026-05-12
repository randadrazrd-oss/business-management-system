import { db, USE_MOCK } from '../config/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

export const getTreatmentPlansForChild = async (childId) => {
  try {
    if (USE_MOCK) return [];
    const q = query(
      collection(db, 'treatmentPlans'),
      where("childId", "==", childId)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching treatment plans:", error);
    throw error;
  }
};

export const updateTreatmentPlan = async (planId, data) => {
  const { doc, updateDoc } = await import('firebase/firestore');
  try {
    if (USE_MOCK) return;
    await updateDoc(doc(db, 'treatmentPlans', planId), {
      ...data,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error("Error updating treatment plan:", err);
    throw err;
  }
};

export const addGoalToPlan = async (planId, goal) => {
  const { doc, updateDoc, arrayUnion } = await import('firebase/firestore');
  try {
    if (USE_MOCK) return;
    await updateDoc(doc(db, 'treatmentPlans', planId), {
      goals: arrayUnion({
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        ...goal
      }),
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error("Error adding goal:", err);
    throw err;
  }
};
