export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  DELIVERED = 'delivered',
  CANCELED = 'canceled',
}

export interface OrderStatusHistory {
  id: number;
  orderId: number;
  oldStatus?: string;
  newStatus: string;
  changedBy: string;
  changedAt: string;
  notes?: string;
}

export interface OrderItem {
  id: number;
  menuItemId: number;
  itemName: string;
  quantity: number;
  rate: number;
  cartQuantity: number;
  subtotal: number;
}

export enum PaymentStatus {
  PAID = 'PAID',
  UNPAID = 'UNPAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
}

export interface Order {
  id: number;
  buyerId: number;
  buyerName: string;
  buyerPhone: string;
  buyerAddress: string;
  deliveryAddress?: string;
  latitude?: number;
  longitude?: number;
  total: number;
  status: OrderStatus;
  orderDate: string;
  statusUpdatedAt?: string;
  trackingNumber?: string;
  deliveryPartner?: string;
  estimatedDelivery?: string;
  confirmedBy?: string;
  deliveredBy?: string;
  deliveryTime?: number; // Delivery time in minutes (legacy, for backward compatibility)
  startTime?: string; // ISO timestamp when order was set to "On The Way" (legacy)
  deliveryTotalSeconds?: number; // Total delivery time in seconds
  deliveryStartTimestamp?: number; // Epoch timestamp (seconds) when countdown started
  finalBillAmount?: number; // Final bill amount (can differ from total)
  paymentStatus?: PaymentStatus; // Payment status: PAID, UNPAID, PARTIALLY_PAID
  billedBy?: string; // Username of seller who created/updated the bill
  billedAt?: string; // Timestamp when bill was created or last updated
  billingNotes?: string; // Optional notes about the billing
  scheduledDeliveryDate?: string;
  sellerUserId?: number;
  sellerBusinessName?: string;
  items: OrderItem[];
}

export interface CreateOrderRequest {
  buyerId: number;
  buyerName: string;
  buyerPhone: string;
  buyerAddress: string;
  deliveryAddress?: string;
  latitude?: number;
  longitude?: number;
  total: number;
  scheduledDeliveryDate?: string;
  deliveryTime?: string;
  items: {
    menuItemId: number;
    itemName: string;
    quantity: number;
    rate: number;
    cartQuantity: number;
    subtotal: number;
  }[];
}

export interface UpdateOrderRequest {
  deliveryAddress?: string | null;
  buyerPhone?: string | null;
  updatedBy?: string;
  items: {
    menuItemId: number;
    quantity: number;
  }[];
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
  notes?: string;
}

export interface ConfirmOrderRequest {
  confirmedBy: string;
}

export interface ProcessOrderRequest {
  trackingNumber: string;
  deliveryPartner: string;
  estimatedDelivery: string;
  updatedBy: string;
}

export interface SetOnTheWayRequest {
  deliveryTotalSeconds: number; // Total delivery time in seconds
  deliveryTime?: number; // Delivery time in minutes (legacy, optional)
  updatedBy?: string;
}

export interface DeliverOrderRequest {
  deliveredBy: string;
}

export interface CancelOrderRequest {
  canceledBy: string;
  reason?: string;
}

export interface UpdateOrderBillRequest {
  finalBillAmount: number;
  billingNotes?: string;
  billedBy?: string;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

import { MenuItem } from './product.types';

