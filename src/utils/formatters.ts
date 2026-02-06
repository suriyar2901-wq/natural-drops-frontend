// Currency formatter
export const formatCurrency = (amount: number | undefined | null): string => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '₹0.00';
  }
  return `₹${Number(amount).toFixed(2)}`;
};

// Phone number formatter
export const formatPhone = (phone: string): string => {
  if (phone.length === 10) {
    return `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`;
  }
  return phone;
};

// Date formatter
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Date and time formatter
export const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  const dateStr = formatDate(dateString);
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${dateStr} ${displayHours}:${minutes} ${ampm}`;
};

// Time ago formatter
export const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  
  const years = Math.floor(months / 12);
  return `${years}y ago`;
};

// Capitalize first letter
export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// Truncate text
export const truncate = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

// Format order status
export const formatOrderStatus = (status: string): string => {
  // Special case: "processing" should display as "On The Way"
  const normalizedStatus = status.toLowerCase().trim();
  if (normalizedStatus === 'processing') {
    return 'On The Way';
  }
  return status.split('_').map(capitalize).join(' ');
};

// Format quantity
export const formatQuantity = (quantity: number, unit: string = 'items'): string => {
  return `${quantity} ${quantity === 1 ? unit.slice(0, -1) : unit}`;
};

// Format file size
export const formatFileSize = (bytes: number | undefined | null): string => {
  if (bytes === undefined || bytes === null || bytes === 0 || isNaN(bytes)) {
    return '0 Bytes';
  }
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

// Format percentage
export const formatPercentage = (value: number | undefined | null, decimals: number = 0): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return '0%';
  }
  return `${Number(value).toFixed(decimals)}%`;
};

// Clean phone number (remove spaces and special characters)
export const cleanPhone = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

// Mask sensitive data
export const maskEmail = (email: string): string => {
  const [username, domain] = email.split('@');
  if (username.length <= 3) return email;
  const masked = username.slice(0, 2) + '*'.repeat(username.length - 2);
  return `${masked}@${domain}`;
};

export const maskPhone = (phone: string): string => {
  if (phone.length < 4) return phone;
  return '*'.repeat(phone.length - 4) + phone.slice(-4);
};

