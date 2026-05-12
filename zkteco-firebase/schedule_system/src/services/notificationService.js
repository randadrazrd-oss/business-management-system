import { db } from '../config/firebase';
import {
  collection, addDoc, query, where,
  onSnapshot, doc, updateDoc, getDocs, limit
} from 'firebase/firestore';

/**
 * Send a new notification to Firestore.
 */
export const sendNotification = async (data) => {
  await addDoc(collection(db, 'notifications'), {
    ...data,
    status: 'unread',
    createdAt: new Date().toISOString()
  });
};

/**
 * Real-time listener for unread notifications.
 * Returns unsubscribe function.
 * NOTE: No orderBy to avoid Firestore composite index requirement.
 *       Sorting is done client-side.
 */
export const subscribeToNotifications = (callback, onError) => {
  const q = query(
    collection(db, 'notifications'),
    where('status', '==', 'unread'),
    limit(30)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const notifs = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      callback(notifs);
    },
    (err) => {
      console.error('Notification listener error:', err);
      onError?.(err);
    }
  );
};

/**
 * Mark a single notification as read (dismissed).
 */
export const markNotificationRead = async (notifId) => {
  await updateDoc(doc(db, 'notifications', notifId), { status: 'read' });
};

/**
 * Mark all unread notifications as read.
 */
export const markAllNotificationsRead = async () => {
  const snapshot = await getDocs(
    query(collection(db, 'notifications'), where('status', '==', 'unread'))
  );
  await Promise.all(
    snapshot.docs.map(d => updateDoc(doc(db, 'notifications', d.id), { status: 'read' }))
  );
};
