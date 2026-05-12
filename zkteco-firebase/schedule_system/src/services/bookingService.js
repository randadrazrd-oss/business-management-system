import { collection, doc, runTransaction, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * bookingService.js
 * Professional Management & Atomic Booking Engine for Sunrise Nursery.
 * Includes absolute safety guards to prevent 'undefined' field errors.
 */

const safe = (data) => {
  const cleaned = {};
  Object.keys(data).forEach(key => {
    cleaned[key] = data[key] === undefined ? "" : data[key];
  });
  return cleaned;
};

export const createSession = async (sessionData) => {
  const { childId, childName, specialistId, specialistName, date, time, diagnosis } = sessionData;

  const dayRef = doc(db, `specialists/${specialistId}/days/${date}`);
  const childLockRef = doc(db, `children/${childId}/locks/${date}_${time}`);
  const sessionRef = doc(collection(db, 'sessions'));

  await runTransaction(db, async (transaction) => {
    const dayDoc = await transaction.get(dayRef);
    const childLockDoc = await transaction.get(childLockRef);

    let currentSlots = {};
    if (dayDoc.exists()) {
      currentSlots = dayDoc.data().slots || {};
    }

    if (currentSlots[time]?.status === "booked" || childLockDoc.exists()) {
      throw new Error("conflict_error");
    }

    currentSlots[time] = safe({
      status: "booked",
      childId: childId,
      childName: childName,
      diagnosis: diagnosis,
      sessionId: sessionRef.id
    });

    transaction.set(dayRef, { slots: currentSlots }, { merge: true });
    
    transaction.set(childLockRef, safe({ 
      sessionId: sessionRef.id,
      specialistId: specialistId,
      createdAt: new Date().toISOString() 
    }));

    transaction.set(sessionRef, safe({
      childId: childId,
      childName: childName,
      specialistId: specialistId,
      specialistName: specialistName,
      date: date,
      time: time,
      diagnosis: diagnosis,
      status: "scheduled",
      createdAt: new Date().toISOString()
    }));
  });

  return sessionRef.id;
};

export const editSession = async (sessionId, oldSession, newSessionData) => {
  const { childId, childName, diagnosis, specialistId: newSpecId, date: newDate, time: newTime, specialistName } = newSessionData;
  const { specialistId: oldSpecId, date: oldDate, time: oldTime } = oldSession;

  const oldDayRef = doc(db, `specialists/${oldSpecId}/days/${oldDate}`);
  const newDayRef = doc(db, `specialists/${newSpecId}/days/${newDate}`);
  const oldChildLockRef = doc(db, `children/${childId}/locks/${oldDate}_${oldTime}`);
  const newChildLockRef = doc(db, `children/${childId}/locks/${newDate}_${newTime}`);
  const sessionRef = doc(db, 'sessions', sessionId);

  await runTransaction(db, async (transaction) => {
    const oldDayDoc = await transaction.get(oldDayRef);
    let oldSlots = oldDayDoc.exists() ? oldDayDoc.data().slots || {} : {};
    let newSlots = {};

    const needsTransfer = oldSpecId !== newSpecId || oldDate !== newDate;
    if (needsTransfer) {
       const newDayDoc = await transaction.get(newDayRef);
       newSlots = newDayDoc.exists() ? newDayDoc.data().slots || {} : {};
    } else {
       newSlots = oldSlots;
    }

    const timeChanged = oldDate !== newDate || oldTime !== newTime;
    if (timeChanged) {
      const newChildLockDoc = await transaction.get(newChildLockRef);
      if (newSlots[newTime]?.status === "booked" || newChildLockDoc.exists()) {
        throw new Error("conflict_error");
      }
      if (oldSlots[oldTime]) oldSlots[oldTime] = { status: "free" };
      transaction.delete(oldChildLockRef);
      transaction.set(newChildLockRef, safe({ sessionId, specialistId: newSpecId, createdAt: new Date().toISOString() }));
    }

    newSlots[newTime] = safe({
      status: "booked",
      childId: childId,
      childName: childName,
      diagnosis: diagnosis,
      sessionId
    });

    if (needsTransfer) {
      transaction.set(oldDayRef, { slots: oldSlots }, { merge: true });
      transaction.set(newDayRef, { slots: newSlots }, { merge: true });
    } else {
      transaction.set(oldDayRef, { slots: newSlots }, { merge: true }); 
    }

    transaction.update(sessionRef, safe({
      childId: childId,
      childName: childName,
      specialistId: newSpecId,
      specialistName: specialistName,
      date: newDate,
      time: newTime,
      diagnosis: diagnosis,
      isException: true,
      updatedAt: new Date().toISOString()
    }));
  });
};

export const cancelSession = async (sessionId, sessionData) => {
  const { childId, specialistId, date, time } = sessionData;

  const dayRef = doc(db, `specialists/${specialistId}/days/${date}`);
  const childLockRef = doc(db, `children/${childId}/locks/${date}_${time}`);
  const sessionRef = doc(db, 'sessions', sessionId);

  await runTransaction(db, async (transaction) => {
    const dayDoc = await transaction.get(dayRef);
    if (!dayDoc.exists()) return;

    const slots = dayDoc.data().slots || {};
    if (slots[time]) {
      slots[time] = { status: "free" };
      transaction.set(dayRef, { slots }, { merge: true });
    }

    transaction.delete(childLockRef);
    transaction.update(sessionRef, {
      status: "cancelled",
      cancelledAt: new Date().toISOString()
    });
  });
};

export const executeBookingTransaction = async (payload) => {
  const { date, startTime, childId, childName, diagnosis, specialistId, specialistName, planId, planFocus } = payload;
  const dayRef = doc(db, `specialists/${specialistId}/days/${date}`);
  const sessionRef = doc(collection(db, 'sessions'));

  return await runTransaction(db, async (transaction) => {
    const dayDoc = await transaction.get(dayRef);
    let slots = dayDoc.exists() ? dayDoc.data().slots || {} : {};
    if (slots[startTime]?.status === "booked") throw new Error("409_CONFLICT");

    slots[startTime] = safe({
      status: "booked",
      childId: childId,
      childName: childName,
      diagnosis: diagnosis,
      sessionId: sessionRef.id
    });
    transaction.set(dayRef, { slots }, { merge: true });

    transaction.set(sessionRef, safe({
      date: date,
      time: startTime,
      childId: childId,
      childName: childName,
      specialistId: specialistId,
      specialistName: specialistName,
      planId: planId,
      planFocus: planFocus,
      diagnosis: diagnosis,
      status: "scheduled",
      createdAt: new Date().toISOString(),
      startTime: Timestamp.fromDate(new Date(`${date} ${startTime}`))
    }));
    return true;
  });
};

export const completeSession = async (sessionId, payload) => {
  const { childId, specialistId, date, time, notes } = payload;

  const sessionRef = doc(db, 'sessions', sessionId);
  const childRef = doc(db, 'children', childId);
  const dayRef = doc(db, `specialists/${specialistId}/days/${date}`);

  await runTransaction(db, async (transaction) => {
    const sessionDoc = await transaction.get(sessionRef);
    const childDoc = await transaction.get(childRef);
    const dayDoc = await transaction.get(dayRef);

    if (!sessionDoc.exists() || !childDoc.exists() || !dayDoc.exists()) {
       throw new Error("Missing document for completion");
    }

    const currentSlots = dayDoc.data().slots || {};
    if (currentSlots[time]) {
      currentSlots[time].status = "completed";
    }

    const completedCount = (childDoc.data().completedSessions || 0);

    transaction.update(sessionRef, safe({
      status: "completed",
      clinicalNotes: notes,
      completedAt: new Date().toISOString()
    }));

    transaction.update(childRef, safe({
      completedSessions: completedCount + 1,
      lastNote: notes,
      updatedAt: new Date().toISOString()
    }));

    transaction.update(dayRef, { slots: currentSlots });
  });
};

export const getEligibleChildrenForSlot = async (specialization) => {
  const childrenSnap = await getDocs(collection(db, 'children'));
  return childrenSnap.docs.map(d => ({
    id: d.id,
    personalInfo: { name: d.data().name },
    diagnosis: d.data().diagnosis,
    matchedPlanId: "auto-gen-plan",
    planFocus: specialization,
    planPriority: 2
  }));
};
