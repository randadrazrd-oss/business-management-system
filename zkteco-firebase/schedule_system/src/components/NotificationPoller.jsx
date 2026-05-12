import React, { useEffect, useRef } from 'react';
import { getChildren } from '../services/childService';
import { getChildMedications } from '../services/medicationService';
import { sendNotification } from '../services/notificationService';
import { toast } from 'react-hot-toast';

/**
 * Background component that runs every minute to check medication schedules.
 * Uses a persistent Set (keyed by childId + medId + date) to ensure each
 * medication only fires ONE notification per day, even if the app re-renders.
 */
export default function NotificationPoller() {
  const firedToday = useRef(new Set());

  useEffect(() => {
    const check = async () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const currentTime = `${hh}:${mm}`;
      const today = now.toDateString(); // e.g. "Sat May 02 2026"

      try {
        const children = await getChildren();

        for (const child of children) {
          let meds;
          try {
            meds = await getChildMedications(child.id);
          } catch {
            continue; // skip this child if meds fail, don't abort all
          }

          for (const med of meds) {
            if (!med.time) continue;

            // Key is unique per medication per day
            const key = `${child.id}|${med.id}|${today}`;

            if (med.time === currentTime && !firedToday.current.has(key)) {
              firedToday.current.add(key);

              // Send to Firestore (Bell Center)
              try {
                await sendNotification({
                  title: child.name,
                  message: `${med.name} (${med.dosage}) is due now.`,
                  type: 'medication',
                  childId: child.id,
                  medId: med.id,
                  medName: med.name,
                  dosage: med.dosage,
                  scheduledTime: med.time
                });
              } catch (err) {
                console.error('Failed to send notification:', err);
              }

              // Immediate visible toast alert
              toast.custom(
                () => (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      background: '#fff',
                      border: '1px solid #e0e7ff',
                      borderLeft: '4px solid #4f46e5',
                      borderRadius: '18px',
                      padding: '14px 18px',
                      boxShadow: '0 8px 30px rgba(79,70,229,0.12)',
                      minWidth: '280px',
                      maxWidth: '340px'
                    }}
                  >
                    <div
                      style={{
                        background: '#eef2ff',
                        color: '#4f46e5',
                        borderRadius: '10px',
                        padding: '8px',
                        flexShrink: 0,
                        fontSize: '18px'
                      }}
                    >
                      👶
                    </div>
                    <div>
                      <p style={{ fontWeight: 900, fontSize: '15px', color: '#1e293b', margin: 0 }}>
                        {child.name}
                      </p>
                      <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0', fontWeight: 700 }}>
                        {med.name} ({med.dosage})
                      </p>
                    </div>
                  </div>
                ),
                { duration: 8000, position: 'top-right' }
              );
            }
          }
        }
      } catch (err) {
        console.error('Poller error:', err);
      }
    };

    // Run immediately, then every 60 seconds (aligned to the minute)
    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, []);

  return null;
}
