import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * scheduleService.js
 * Exposes a clean slot generation logic directly tied to the new document structures.
 */

// Basic clinic hours fallback mapping if not configured in DB yet
const DEFAULT_CLINIC_SLOTS = ["09:00", "09:45", "10:30", "11:15", "12:00", "13:00", "13:45", "14:30"];

import { generateDailySlots } from '../utils/scheduleLogic';

export const fetchOrCreateDaySchedule = async (specialistId, dateStr) => {
  const dayRef = doc(db, `specialists/${specialistId}/days/${dateStr}`);
  const dayDoc = await getDoc(dayRef);

  let currentSlots = {};
  if (dayDoc.exists()) {
    currentSlots = dayDoc.data().slots || {};
  }

  // Get start/end hours from specialist template
  let baseSlots = generateDailySlots('10:00', '21:00', 45);
  const specDoc = await getDoc(doc(db, 'specialists', specialistId));
  if (specDoc.exists()) {
      const specialist = specDoc.data();
      const dateObj = new Date(dateStr);
      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dateObj.getDay()];
      if (specialist.daySchedules && specialist.daySchedules[dayName]) {
          baseSlots = generateDailySlots(specialist.daySchedules[dayName].start, specialist.daySchedules[dayName].end, 45);
      }
  }

  const structuredSlots = baseSlots.map(slotObj => {
    if (slotObj.type === 'break') {
      return { time: slotObj.time, status: 'break', type: 'break', session: null, endTime: slotObj.endTime };
    }
    const data = currentSlots[slotObj.time] || { status: 'free' };
    return {
      time: slotObj.time,
      status: data.status,
      type: 'session',
      endTime: slotObj.endTime,
      session: (data.status === "booked" || data.status === "completed") ? {
        sessionId: data.sessionId,
        childId: data.childId,
        childName: data.childName,
        diagnosis: data.diagnosis,
        sessionType: data.sessionType,
        recurringId: data.recurringId
      } : null
    };
  });

  // Append legacy times if any
  const extraTimes = Object.keys(currentSlots).filter(t => !baseSlots.find(s => s.time === t));
  extraTimes.forEach(t => {
    const data = currentSlots[t];
    structuredSlots.push({
      time: t,
      status: data.status,
      type: 'session',
      endTime: '',
      session: (data.status === "booked" || data.status === "completed") ? {
        sessionId: data.sessionId,
        childId: data.childId,
        childName: data.childName,
        diagnosis: data.diagnosis,
        sessionType: data.sessionType,
        recurringId: data.recurringId
      } : null
    });
  });

  structuredSlots.sort((a, b) => a.time.localeCompare(b.time));

  return {
    specialistId,
    date: dateStr,
    slots: structuredSlots
  };
};
