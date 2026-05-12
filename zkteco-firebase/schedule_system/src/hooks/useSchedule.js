import { useState, useEffect, useMemo } from 'react';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

import { generateDailySlots } from '../utils/scheduleLogic';

export const useSchedule = (specialistId, dateStr) => {
  const [data, setData] = useState({
    specialistId,
    date: dateStr,
    slots: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let unsubscribe = () => {};
    if (!specialistId || !dateStr) {
      setLoading(false);
      return;
    }

    const fetchAndSubscribe = async () => {
      try {
        setLoading(true);
        
        let baseSlots = generateDailySlots('10:00', '21:00', 45);
        const specDoc = await getDoc(doc(db, 'specialists', specialistId));
        if (specDoc.exists()) {
           const sData = specDoc.data();
           const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
           const dayName = days[new Date(dateStr).getDay()];
           if (sData.daySchedules && sData.daySchedules[dayName]) {
             baseSlots = generateDailySlots(sData.daySchedules[dayName].start, sData.daySchedules[dayName].end, 45);
           }
        }

        const dayRef = doc(db, `specialists/${specialistId}/days/${dateStr}`);

        unsubscribe = onSnapshot(dayRef, (snapshot) => {
          let currentSlots = {};
          if (snapshot.exists()) {
             currentSlots = snapshot.data().slots || {};
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

          // Append any legacy/extra slots that might exist in Firestore but aren't in baseSlots
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

          structuredSlots.sort((a,b) => a.time.localeCompare(b.time));

          setData({ specialistId, date: dateStr, slots: structuredSlots });
          setLoading(false);
        }, (err) => {
          setError(err.message);
          setLoading(false);
        });

      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchAndSubscribe();

    return () => unsubscribe();
  }, [specialistId, dateStr]);

  const memoizedData = useMemo(() => data, [data]);

  return { schedule: memoizedData, loading, error };
};
