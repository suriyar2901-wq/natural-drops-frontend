/** Paid bills are locked. Unpaid and partially paid bills stay editable, including after delivery. */
export const canEditOrderBill = (order: {
  status?: string;
  paymentStatus?: string;
} | null | undefined): boolean => {
  if (!order || order.status === 'canceled') return false;
  if (order.paymentStatus === 'PAID') return false;
  if (order.paymentStatus === 'PARTIALLY_PAID' || order.paymentStatus === 'UNPAID') return true;
  return order.status === 'confirmed' || order.status === 'processing';
};

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

export const formatClockAmPm = (time: string): string => {
  const match = String(time).match(/(\d{1,2}):(\d{2})/);
  if (!match) return '';
  const hours = Number(match[1]);
  const minutes = match[2];
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes} ${suffix}`;
};

const pad2 = (value: number) => String(value).padStart(2, '0');

/** Local calendar Y-M-D without UTC day-shift (handles YYYY-MM-DD, ISO, or [y,m,d]). */
export const parseLocalYmd = (value: unknown): { y: number; m: number; d: number } | null => {
  if (value == null || value === '') return null;
  if (Array.isArray(value) && value.length >= 3) {
    const y = Number(value[0]);
    const m = Number(value[1]);
    const d = Number(value[2]);
    if (!y || !m || !d) return null;
    return { y, m, d };
  }
  const raw = String(value).trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return { y: date.getFullYear(), m: date.getMonth() + 1, d: date.getDate() };
};

export const toLocalYmdString = (offsetDays = 0): string => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};

export const formatYmdDisplay = (value: unknown): string => {
  const ymd = parseLocalYmd(value);
  if (!ymd) return '';
  return `${pad2(ymd.d)}/${pad2(ymd.m)}/${ymd.y}`;
};

/** Wall-clock HH:mm from estimatedDelivery / deliveryTime without timezone shift. */
export const extractClockHm = (value: unknown): string => {
  if (value == null || value === '') return '';
  if (Array.isArray(value) && value.length >= 5) {
    return `${pad2(Number(value[3]))}:${pad2(Number(value[4]))}`;
  }
  const raw = String(value).trim();
  if (/^\d{1,2}:\d{2}/.test(raw) && !/[Tt ]/.test(raw.slice(0, 3))) {
    const match = raw.match(/^(\d{1,2}):(\d{2})/);
    return match ? `${pad2(Number(match[1]))}:${match[2]}` : '';
  }
  const match = raw.match(/[T\s](\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : '';
};

export const formatDeliverySlot = (order: {
  scheduledDeliveryDate?: string | number[] | null;
  estimatedDelivery?: string | number[] | null;
  deliveryTime?: string | number | null;
} | null | undefined): string => {
  const ymd =
    parseLocalYmd(order?.scheduledDeliveryDate) ||
    parseLocalYmd(order?.estimatedDelivery);
  if (!ymd) return '';

  const ymdKey = `${ymd.y}-${pad2(ymd.m)}-${pad2(ymd.d)}`;
  const todayKey = toLocalYmdString(0);
  const tomorrowKey = toLocalYmdString(1);
  const dateLabel =
    ymdKey === todayKey
      ? 'Today'
      : ymdKey === tomorrowKey
        ? 'Tomorrow'
        : formatYmdDisplay(ymdKey);

  const clockRaw =
    extractClockHm(order?.estimatedDelivery) ||
    (typeof order?.deliveryTime === 'string' ? extractClockHm(order.deliveryTime) : '');
  const clock = clockRaw ? formatClockAmPm(clockRaw) : '';
  return clock ? `${dateLabel}, ${clock}` : dateLabel;
};

// Date formatter
export const formatDate = (dateString: string): string => {
  const display = formatYmdDisplay(dateString);
  if (display) return display;
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
};

// Date and time formatter
export const formatDateTime = (dateString: string): string => {
  if (!dateString) return '';
  const dateStr = formatDate(dateString);
  const clock = extractClockHm(dateString);
  if (clock) {
    const formatted = formatClockAmPm(clock);
    return formatted ? `${dateStr} ${formatted}` : dateStr;
  }
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateStr;
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
  const normalizedStatus = status.toLowerCase().trim();
  if (normalizedStatus === 'processing') {
    return 'Confirmed';
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

