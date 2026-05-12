import { db, USE_MOCK } from '../config/firebase';
import { collection, getDocs, addDoc, query, where, Timestamp, runTransaction, doc } from 'firebase/firestore';
import { format, startOfDay, endOfDay, parse, getDay } from 'date-fns';
import { generateDailySlots } from '../utils/scheduleLogic';

const daysMap = {
  "Sunday": 0, "Monday": 1, "Tuesday": 2, "Wednesday": 3, "Thursday": 4, "Friday": 5, "Saturday": 6
};

const safe = (data) => {
  const cleaned = {};
  Object.keys(data).forEach(key => {
    cleaned[key] = data[key] === undefined ? "" : data[key];
  });
  return cleaned;
};

// Used by Dashboard to count raw numeric stats
export const getSessionsByChildId = async (childId) => {
  try {
    const sessQuery = query(collection(db, 'sessions'), where("childId", "==", childId));
    const querySnapshot = await getDocs(sessQuery);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => {
        const dateA = a.date || "";
        const dateB = b.date || "";
        const timeA = a.time || "";
        const timeB = b.time || "";
        return dateB.localeCompare(dateA) || timeB.localeCompare(timeA);
      });
  } catch (err) {
    console.error("Error fetching child sessions:", err);
    throw err;
  }
};

export const fetchDailySchedule = async (targetDate) => {
  const dateStr = format(targetDate, 'yyyy-MM-dd');
  const specsSnapshot = await getDocs(collection(db, 'specialists'));
  const dayOfWeek = getDay(targetDate);
  
  const availableSpecs = specsSnapshot.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(spec => {
      const specDays = Array.isArray(spec.workingDays) 
        ? spec.workingDays.map(d => typeof d === 'string' ? daysMap[d] : d)
        : [];
      return specDays.includes(dayOfWeek);
    });

  const sessQuery = query(collection(db, 'sessions'), where("date", "==", dateStr));
  const sessSnapshot = await getDocs(sessQuery);
  const sessionsList = sessSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

  const grid = availableSpecs.map(spec => {
    const slots = generateDailySlots(spec.startHour || '10:00', spec.endHour || '21:00', 45);
    return {
      specialistId: spec.id,
      specialistName: spec.name,
      specialization: spec.specialization,
      slots: slots.map(slotObj => {
        if (slotObj.type === 'break') {
          return {
            time: slotObj.time,
            endTime: slotObj.endTime,
            status: 'break',
            type: 'break',
            notes: '',
            session: null
          };
        }

        const timeStr = slotObj.time;
        const bookedSession = sessionsList.find(s => {
          if (s.specialistId !== spec.id) return false;
          let sessionTimeStr = '';
          if (s.startTime && typeof s.startTime.toDate === 'function') {
            sessionTimeStr = format(s.startTime.toDate(), 'HH:mm');
          } else if (s.startTime && typeof s.startTime === 'string') {
            sessionTimeStr = s.startTime.length >= 5 ? s.startTime.substring(0, 5) : s.startTime;
          } else if (s.time) {
            sessionTimeStr = s.time;
          }
          return sessionTimeStr === timeStr;
        });

        let currentStatus = bookedSession ? (bookedSession.status || "booked") : "free";
        let clinicalNotes = bookedSession ? (bookedSession.clinicalNotes || bookedSession.notes || "") : "";

        // Lazy auto-completion check
        if (currentStatus === 'booked' || currentStatus === 'scheduled') {
           const [sHour, sMin] = timeStr.split(':').map(Number);
           const slotEndTime = parse(dateStr, 'yyyy-MM-dd', new Date());
           slotEndTime.setHours(sHour, sMin + 45, 0, 0);

           if (new Date() > slotEndTime) {
               currentStatus = 'completed';
               if (bookedSession) {
                   // Background fire-and-forget update to officially mark as completed
                   import('firebase/firestore').then(({ updateDoc, doc }) => {
                       updateDoc(doc(db, 'sessions', bookedSession.id), { status: 'completed' }).catch(console.error);
                   });
               }
           }
        }

        return {
          time: timeStr,
          type: 'session',
          endTime: slotObj.endTime,
          status: currentStatus,
          notes: clinicalNotes,
          session: bookedSession ? {
            id: bookedSession.id,
            childId: bookedSession.childId,
            childName: bookedSession.childName,
            planFocus: bookedSession.planFocus,
            startTime: bookedSession.startTime,
            sessionType: bookedSession.sessionType,
            recurringId: bookedSession.recurringId
          } : null
        };
      })
    };
  });
  return grid;
};

// Isolated notes updater
export const updateSessionNotes = async (sessionId, notes) => {
    const { updateDoc, doc } = await import('firebase/firestore');
    await updateDoc(doc(db, 'sessions', sessionId), { 
      clinicalNotes: notes, 
      updatedAt: new Date().toISOString() 
    });
    return true;
};

export const addSession = async (sessionData) => {
  const startDateTime = parse(`${sessionData.date} ${sessionData.startTime}`, 'yyyy-MM-dd HH:mm', new Date());
  const endDateTime = new Date(startDateTime);
  endDateTime.setMinutes(endDateTime.getMinutes() + 45);

  const newSessionRef = doc(collection(db, 'sessions')); 

  await runTransaction(db, async (transaction) => {
    const sessQuery = query(
      collection(db, 'sessions'), 
      where("date", "==", sessionData.date),
      where("specialistId", "==", sessionData.specialistId)
    );
    
    const snapshot = await getDocs(sessQuery);
    const overlap = snapshot.docs.some(d => {
       const sTime = format(d.data().startTime.toDate(), 'HH:mm');
       return sTime === sessionData.startTime;
    });

    if (overlap) throw new Error("RACE_CONDITION: Slot was just booked by another user!");

    transaction.set(newSessionRef, safe({
      date: sessionData.date,
      childId: sessionData.childId,
      childName: sessionData.childName,
      specialistId: sessionData.specialistId,
      specialistName: sessionData.specialistName,
      planId: sessionData.planId,
      planFocus: sessionData.planFocus,
      startTime: Timestamp.fromDate(startDateTime),
      endTime: Timestamp.fromDate(endDateTime),
      status: "scheduled",
      notes: sessionData.notes
    }));
  });
  return true;
};
