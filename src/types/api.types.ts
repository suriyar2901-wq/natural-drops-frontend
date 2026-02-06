export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

export interface ApiError {
  message: string;
  status?: number;
  errors?: Record<string, string[]>;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: 'ORDER' | 'PAYMENT' | 'SYSTEM' | 'PROMOTIONAL';
  isRead: boolean;
  data?: any;
  createdAt: string;
}

export interface Settings {
  id: number;
  businessName: string;
  businessPhone: string;
  businessEmail: string;
  businessAddress: string;
  whatsappNumber?: string;
  upiId?: string;
  upiQrCodeUrl?: string;
  gstNumber?: string;
  taxRate: number;
  deliveryCharge: number;
  minOrderAmount: number;
  updatedAt: string;
}

