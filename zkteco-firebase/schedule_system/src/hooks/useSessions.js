import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, where } from 'firebase/firestore';
import { db } from '../config/firebase';

export const useSessions = (filters = {}) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    
    // Simplified query to avoid index requirements while in development/testing
    // We will do filtering and sorting in-memory for total reliability
    let sessQuery = query(
      collection(db, 'sessions')
    );

    const unsubscribe = onSnapshot(sessQuery, (snapshot) => {
      const sessList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Memory filter and sort for reliability
      const processed = sessList
        .filter(s => s.status !== 'cancelled')
        .sort((a, b) => {
           // Sort by date then time
           const dateCompare = b.date?.localeCompare(a.date);
           if (dateCompare !== 0) return dateCompare;
           return b.time?.localeCompare(a.time);
        });

      setSessions(processed);
      setLoading(false);
    }, (err) => {
      console.error("useSessions error:", err);
      setError(err.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { sessions, loading, error };
};
