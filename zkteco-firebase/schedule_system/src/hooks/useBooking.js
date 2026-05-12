import { useState } from 'react';
import { createSession, editSession, cancelSession, completeSession } from '../services/bookingService';
import { useTranslation } from '../contexts/LanguageContext';

export const useBooking = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const { t } = useTranslation();

  const handleBooking = async (sessionData) => {
    setIsProcessing(true);
    setError(null);
    try {
      await createSession(sessionData);
      setIsProcessing(false);
      return { success: true };
    } catch (err) {
      setIsProcessing(false);
      if (err.message === "conflict_error") {
        setError(t('conflict_error'));
      } else {
        setError(err.message);
      }
      return { success: false, error: err.message };
    }
  };

  const handleEdit = async (sessionId, oldSession, newSessionData) => {
    setIsProcessing(true);
    setError(null);
    try {
      await editSession(sessionId, oldSession, newSessionData);
      setIsProcessing(false);
      return { success: true };
    } catch (err) {
      setIsProcessing(false);
      if (err.message === "conflict_error") {
        setError(t('conflict_error'));
      } else {
        setError(err.message);
      }
      return { success: false, error: err.message };
    }
  };

  const handleCancel = async (sessionId, sessionData) => {
    setIsProcessing(true);
    setError(null);
    try {
      await cancelSession(sessionId, sessionData);
      setIsProcessing(false);
      return { success: true };
    } catch (err) {
      setIsProcessing(false);
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const handleComplete = async (sessionId, sessionData, notes) => {
    setIsProcessing(true);
    setError(null);
    try {
      await completeSession(sessionId, sessionData, notes);
      setIsProcessing(false);
      return { success: true };
    } catch (err) {
      setIsProcessing(false);
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  return {
    isProcessing,
    error,
    clearError: () => setError(null),
    bookSlot: handleBooking,
    editSlot: handleEdit,
    cancelSlot: handleCancel,
    completeSlot: handleComplete
  };
};
