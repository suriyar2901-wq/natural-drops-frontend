import { Linking, Platform } from 'react-native';

export const phoneDigits = (value?: string | null) => String(value || '').replace(/\D/g, '').slice(-10);

export const openContact = async (url?: string) => {
  if (!url) {
    return;
  }
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    if (/^https?:\/\//i.test(url)) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    const link = document.createElement('a');
    link.href = url;
    link.rel = 'noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }
  try {
    await Linking.openURL(url);
  } catch (_error) {
    // The device has no app for this contact method.
  }
};

export const contactLinks = (phone?: string | null, email?: string | null, message = 'Hello from Natural Drops.') => {
  const digits = phoneDigits(phone);
  const encoded = encodeURIComponent(message);
  return {
    digits,
    call: digits.length === 10 ? `tel:+91${digits}` : '',
    sms: digits.length === 10 ? `sms:+91${digits}?body=${encoded}` : '',
    whatsapp: digits.length === 10 ? `https://wa.me/91${digits}?text=${encoded}` : '',
    email: email && email.includes('@') ? `mailto:${email.trim()}?subject=${encodeURIComponent('Natural Drops')}&body=${encoded}` : '',
  };
};
