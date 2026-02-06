import { useState, useEffect } from 'react';
import { notificationService } from '../services/notification.service';

export const useNotifications = () => {
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    initializeNotifications();

    return () => {
      notificationService.removeListeners();
    };
  }, []);

  const initializeNotifications = async () => {
    try {
      const token = await notificationService.initialize();
      setPushToken(token);
      setIsInitialized(true);
    } catch (error) {
      console.error('Error initializing notifications:', error);
      setIsInitialized(false);
    }
  };

  const showNotification = async (title: string, body: string, data?: any) => {
    await notificationService.showNotification(title, body, data);
  };

  const scheduleNotification = async (
    title: string,
    body: string,
    data?: any,
    trigger?: any
  ) => {
    await notificationService.scheduleNotification(title, body, data, trigger);
  };

  const clearBadge = async () => {
    await notificationService.clearBadge();
  };

  const setBadgeCount = async (count: number) => {
    await notificationService.setBadgeCount(count);
  };

  return {
    pushToken,
    isInitialized,
    showNotification,
    scheduleNotification,
    clearBadge,
    setBadgeCount,
  };
};

