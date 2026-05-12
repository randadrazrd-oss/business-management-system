import { useState, useEffect, useCallback } from 'react';
import {
  subscribeToNotifications,
  markNotificationRead,
  markAllNotificationsRead
} from '../services/notificationService';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToNotifications(
      (data) => {
        setNotifications(data);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const dismiss = useCallback(async (id) => {
    // Optimistic update — remove from local state immediately
    setNotifications(prev => prev.filter(n => n.id !== id));
    try {
      await markNotificationRead(id);
    } catch (err) {
      console.error('Failed to dismiss notification:', err);
    }
  }, []);

  const dismissAll = useCallback(async () => {
    setNotifications([]);
    try {
      await markAllNotificationsRead();
    } catch (err) {
      console.error('Failed to dismiss all:', err);
    }
  }, []);

  return { notifications, loading, error, dismiss, dismissAll };
};
