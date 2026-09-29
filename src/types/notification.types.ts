// Admin/Seller Notification types matching backend entity
export interface AdminNotification {
  id: number;
  orderId: number;
  customerName: string;
  total: number;
  itemCount: number;
  message?: string;
  isRead: boolean;
  createdAt: string;
}

// Buyer Notification types matching backend entity
export interface BuyerNotification {
  id: number;
  buyerId: number;
  orderId: number;
  message: string;
  isRead: boolean;
  createdAt: string;
}

