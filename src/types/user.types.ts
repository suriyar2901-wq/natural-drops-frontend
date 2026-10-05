export enum UserRole {
  BUYER = 'buyer',
  ADMIN = 'admin',
  SELLER = 'seller',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export interface StructuredAddress {
  houseDoorNo: string;
  streetArea: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  landmark?: string;
}

export interface User {
  id: number;
  username: string;
  fullName?: string;
  email: string;
  phone?: string;
  phoneNumber?: string; // Alias for phone
  address?: string; // Legacy field for backward compatibility
  role: UserRole;
  status?: string; // PENDING, APPROVED, REJECTED, BLOCKED
  isActive?: boolean; // Admin-controlled activation
  createdAt: string;
  createdBy?: string;
  // New fields
  gender?: Gender | string;
  dateOfBirth?: string; // ISO date string
  alternatePhone?: string;
  profilePhoto?: string; // URL or base64
  // Structured address fields
  houseDoorNo?: string;
  streetArea?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
  landmark?: string;
  linkedSellerId?: number;
  companyCode?: string;
  shopName?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email?: string;
  phone: string; // Required
  role: UserRole;
  // New optional fields
  gender?: Gender | string;
  dateOfBirth?: string; // ISO date string
  alternatePhone?: string;
  profilePhoto?: string; // base64 or URL
  // Structured address fields (required)
  houseDoorNo: string;
  streetArea: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  landmark?: string;
  // Legacy field (optional, will be built from structured fields if not provided)
  address?: string;
  companyName?: string;
  companyCode?: string;
}

export interface AuthResponse {
  user: User;
  token?: string;
  message: string;
}

export interface UpdateUserRequest {
  username?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  address?: string; // Legacy field
  role?: UserRole;
  // New fields
  gender?: Gender | string;
  dateOfBirth?: string; // ISO date string
  alternatePhone?: string;
  profilePhoto?: string; // base64 or URL
  // Structured address fields
  houseDoorNo?: string;
  streetArea?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
  landmark?: string;
}

