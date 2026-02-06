import { Platform } from 'react-native';
import { permissions } from '../utils/permissions';

// Try to import expo-notifications, but handle if not available in Expo Go
let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
  // Configure notification handler only if available
  if (Notifications) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }
} catch (error) {
  console.log('Push notifications not available in Expo Go. Use a development build for full notification support.');
}

class NotificationService {
  private notificationListener: any;
  private responseListener: any;

  // Initialize notifications
  async initialize() {
    if (!Notifications) {
      console.log('Notifications not available. Use a development build for push notification support.');
      return null;
    }

    const hasPermission = await permissions.requestNotificationPermission();
    if (!hasPermission) {
      console.log('Notification permission not granted');
      return null;
    }

    // Get push token
    const token = await this.getExpoPushToken();
    
    // Set up notification listeners
    this.setupListeners();
    
    return token;
  }

  // Get Expo push token
  async getExpoPushToken(): Promise<string | null> {
    if (!Notifications) return null;
    
    try {
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log('Expo Push Token:', token);
      return token;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  // Set up listeners
  setupListeners() {
    if (!Notifications) return;
    
    // Notification received while app is in foreground
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    // Notification tapped/opened
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      // Handle navigation based on notification data
      this.handleNotificationResponse(response);
    });
  }

  // Handle notification response
  handleNotificationResponse(response: any) {
    const data = response.notification.request.content.data;
    
    // Navigate based on notification type
    if (data.type === 'ORDER') {
      // Navigate to order detail
      console.log('Navigate to order:', data.orderId);
    } else if (data.type === 'PAYMENT') {
      // Navigate to payment
      console.log('Navigate to payment:', data.paymentId);
    }
  }

  // Schedule local notification
  async scheduleNotification(title: string, body: string, data?: any, trigger?: any) {
    if (!Notifications) return;
    
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: true,
        },
        trigger: trigger || null,
      });
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  }

  // Show instant notification
  async showNotification(title: string, body: string, data?: any) {
    await this.scheduleNotification(title, body, data, null);
  }

  // Cancel notification
  async cancelNotification(notificationId: string) {
    if (!Notifications) return;
    
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  }

  // Cancel all notifications
  async cancelAllNotifications() {
    if (!Notifications) return;
    
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error canceling all notifications:', error);
    }
  }

  // Get badge count
  async getBadgeCount(): Promise<number> {
    if (!Notifications) return 0;
    
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.error('Error getting badge count:', error);
      return 0;
    }
  }

  // Set badge count
  async setBadgeCount(count: number) {
    if (!Notifications) return;
    
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  }

  // Clear badge
  async clearBadge() {
    await this.setBadgeCount(0);
  }

  // Remove listeners
  removeListeners() {
    if (!Notifications) return;
    
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }
}

export const notificationService = new NotificationService();

