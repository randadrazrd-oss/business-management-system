import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { generateDailySlots } from '../utils/scheduleLogic';

const DEFAULT_CLINIC_SLOTS = ["09:00", "09:45", "10:30", "11:15", "12:00", "13:00", "13:45", "14:30"];

const daysMap = {
  "Sunday": 0, "Monday": 1, "Tuesday": 2, "Wednesday": 3, "Thursday": 4, "Friday": 5, "Saturday": 6
};

export const useAllSchedules = (specialists, dateStr) => {
  const [schedules, setSchedules] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!specialists || specialists.length === 0 || !dateStr) {
      setLoading(false);
      return;
    }

    const unsubscribes = specialists.map(spec => {
      const dayRef = doc(db, `specialists/${spec.id}/days/${dateStr}`);
      
      return onSnapshot(dayRef, (snapshot) => {
        const dateObj = new Date(dateStr);
        const dayIndex = dateObj.getDay();
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = days[dayIndex];

        let baseSlots = generateDailySlots('10:00', '21:00', 45);
        if (spec.daySchedules && spec.daySchedules[dayName]) {
            baseSlots = generateDailySlots(spec.daySchedules[dayName].start, spec.daySchedules[dayName].end, 45);
        }

        let currentSlots = {};
        if (snapshot.exists()) {
          currentSlots = snapshot.data().slots || {};
        }

        const structuredSlots = baseSlots.map(slotObj => {
          if (slotObj.type === 'break') {
            return { time: slotObj.time, status: 'break', type: 'break', session: null, endTime: slotObj.endTime };
          }
          const slotEntry = currentSlots[slotObj.time] || { status: 'free' };
          return {
            time: slotObj.time,
            status: slotEntry.status,
            type: 'session',
            endTime: slotObj.endTime,
            session: (slotEntry.status === "booked" || slotEntry.status === "completed") ? {
              sessionId: slotEntry.sessionId,
              childId: slotEntry.childId,
              childName: slotEntry.childName,
              diagnosis: slotEntry.diagnosis,
              sessionType: slotEntry.sessionType,
              recurringId: slotEntry.recurringId,
              time: slotEntry.time || slotObj.time
            } : null
          };
        });

        // Append any legacy/extra slots that might exist in Firestore but aren't in baseSlots
        const extraTimes = Object.keys(currentSlots).filter(t => !baseSlots.find(s => s.time === t));
        extraTimes.forEach(t => {
          const slotEntry = currentSlots[t];
          structuredSlots.push({
            time: t,
            status: slotEntry.status,
            type: 'session',
            endTime: '',
            session: (slotEntry.status === "booked" || slotEntry.status === "completed") ? {
              sessionId: slotEntry.sessionId,
              childId: slotEntry.childId,
              childName: slotEntry.childName,
              diagnosis: slotEntry.diagnosis,
              sessionType: slotEntry.sessionType,
              recurringId: slotEntry.recurringId,
              time: slotEntry.time || t
            } : null
          });
        });

        structuredSlots.sort((a, b) => a.time.localeCompare(b.time));

        setSchedules(prev => ({
          ...prev,
          [spec.id]: structuredSlots
        }));
      });
    });

    setLoading(false); 

    return () => unsubscribes.forEach(unsub => unsub());
  }, [specialists, dateStr]);

  return { schedules, loading };
};
