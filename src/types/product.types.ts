export enum Category {
  WATER = 'water',
  BEVERAGE = 'beverage',
}

export interface ProductImage {
  id: number;
  menuItemId: number;
  imageUrl: string;
  isPrimary: boolean;
  displayOrder: number;
  createdAt: string;
  // Backward/forward compatibility (backend may expose url/primary getters)
  url?: string;
  primary?: boolean;
}

export interface ProductVideo {
  id: number;
  menuItemId: number;
  videoUrl: string;
  createdAt: string;
  // Backward/forward compatibility
  url?: string;
}

export interface MenuItem {
  id: number;
  name: string;
  description?: string | null;
  packSize?: string;
  category: string; // 'water' or 'beverage'
  image?: string | null;
  stockQuantity: number;
  lowStockThreshold?: number;
  rate: number;
  createdAt: string;
  updatedAt: string;
  images?: ProductImage[];
  videos?: ProductVideo[];
  // Backward compatibility
  quantity?: number;
}

export interface CreateMenuItemRequest {
  name: string;
  category: Category;
  image?: string;
  description?: string | null;
  stockQuantity: number;
  lowStockThreshold?: number;
  rate: number;
}

export interface UpdateMenuItemRequest {
  name?: string;
  category?: Category;
  image?: string;
  description?: string | null;
  stockQuantity?: number;
  lowStockThreshold?: number;
  rate?: number;
}

export interface UpdateStockRequest {
  quantity: number;
  changedBy: string;
  notes?: string;
}

export interface AddProductImageRequest {
  imageUrl: string;
  isPrimary?: boolean;
  displayOrder?: number;
}

export interface AddProductVideoRequest {
  videoUrl: string;
}

