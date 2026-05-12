import { db } from '../config/firebase';
import { collection, doc, setDoc, getDoc, updateDoc, query, where, getDocs, writeBatch, deleteDoc, runTransaction } from 'firebase/firestore';
import { addWeeks, format, parse, getDay } from 'date-fns';

const safe = (data) => {
  const cleaned = {};
  Object.keys(data).forEach(key => {
    cleaned[key] = data[key] === undefined ? "" : data[key];
  });
  return cleaned;
};

export const createRecurringSessionTemplate = async (templateData) => {
  // templateData: { specialistId, specialistName, childId, childName, diagnosis, date (startDate), time, notes }
  const recurringRef = doc(collection(db, 'recurringSessions'));
  const startDateObj = new Date(templateData.date);
  const dayOfWeek = getDay(startDateObj);

  const newTemplate = {
    ...templateData,
    id: recurringRef.id,
    dayOfWeek,
    isActive: true,
    createdAt: new Date().toISOString()
  };

  await runTransaction(db, async (transaction) => {
    // 1. Fetch all day documents for the next 8 weeks
    const dayRefs = [];
    for (let i = 0; i < 8; i++) {
      const sessionDate = format(addWeeks(startDateObj, i), 'yyyy-MM-dd');
      dayRefs.push({
        date: sessionDate,
        ref: doc(db, `specialists/${templateData.specialistId}/days/${sessionDate}`)
      });
    }

    const dayDocs = await Promise.all(dayRefs.map(d => transaction.get(d.ref)));

    // Ensure no conflict
    dayDocs.forEach((docSnap, index) => {
      if (docSnap.exists()) {
        const slots = docSnap.data().slots || {};
        if (slots[templateData.time]?.status === "booked") {
           throw new Error(`conflict_error on ${dayRefs[index].date}`);
        }
      }
    });

    // Write template
    transaction.set(recurringRef, safe(newTemplate));

    // Write 8 occurrences
    for (let i = 0; i < 8; i++) {
      const sessionDate = dayRefs[i].date;
      const dayRef = dayRefs[i].ref;
      const dayDocSnap = dayDocs[i];

      const sessionRef = doc(collection(db, 'sessions'));
      
      const startDateTime = parse(`${sessionDate} ${templateData.time}`, 'yyyy-MM-dd HH:mm', new Date());
      const endDateTime = new Date(startDateTime);
      endDateTime.setMinutes(endDateTime.getMinutes() + 45);

      // Update the day's grid
      let currentSlots = dayDocSnap.exists() ? dayDocSnap.data().slots || {} : {};
      currentSlots[templateData.time] = safe({
        status: "booked",
        childId: templateData.childId,
        childName: templateData.childName,
        diagnosis: templateData.diagnosis,
        sessionId: sessionRef.id,
        sessionType: 'recurring',
        recurringId: recurringRef.id
      });
      transaction.set(dayRef, { slots: currentSlots }, { merge: true });

      // Write session doc
      transaction.set(sessionRef, safe({
        date: sessionDate,
        time: templateData.time,
        childId: templateData.childId,
        childName: templateData.childName,
        specialistId: templateData.specialistId,
        specialistName: templateData.specialistName,
        diagnosis: templateData.diagnosis,
        status: "scheduled",
        notes: templateData.notes || '',
        sessionType: 'recurring',
        recurringId: recurringRef.id,
        isException: false,
        createdAt: new Date().toISOString()
      }));
    }
  });

  return newTemplate;
};

export const cancelRecurringSeries = async (recurringId, specialistId) => {
  // We need to fetch the sessions first
  const sessQuery = query(
    collection(db, 'sessions'), 
    where("recurringId", "==", recurringId),
    where("status", "==", "scheduled")
  );
  
  const snapshot = await getDocs(sessQuery);
  const sessionDocs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

  if (sessionDocs.length === 0) {
    // Just update template
    const recurringRef = doc(db, 'recurringSessions', recurringId);
    await updateDoc(recurringRef, { isActive: false });
    return true;
  }

  // Get unique dates to fetch day docs
  const dates = [...new Set(sessionDocs.map(s => s.date))];

  await runTransaction(db, async (transaction) => {
    // 1. Fetch day docs
    const dayRefs = dates.map(date => ({
      date,
      ref: doc(db, `specialists/${specialistId}/days/${date}`)
    }));
    
    const dayDocs = await Promise.all(dayRefs.map(d => transaction.get(d.ref)));
    
    const dayDataMap = {};
    dayDocs.forEach((docSnap, index) => {
      dayDataMap[dayRefs[index].date] = {
        ref: dayRefs[index].ref,
        slots: docSnap.exists() ? docSnap.data().slots || {} : {}
      };
    });

    // 2. Process cancellations
    sessionDocs.forEach(session => {
      const dayInfo = dayDataMap[session.date];
      if (dayInfo && dayInfo.slots[session.time]) {
         dayInfo.slots[session.time] = { status: 'free' };
      }
      transaction.delete(doc(db, 'sessions', session.id));
    });

    // 3. Write back day docs
    Object.values(dayDataMap).forEach(dayInfo => {
      transaction.set(dayInfo.ref, { slots: dayInfo.slots }, { merge: true });
    });

    // 4. Deactivate template
    const recurringRef = doc(db, 'recurringSessions', recurringId);
    transaction.update(recurringRef, { isActive: false });
  });

  return true;
};

