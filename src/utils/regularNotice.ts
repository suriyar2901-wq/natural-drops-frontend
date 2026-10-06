export type RegularNoticeTone = 'pause' | 'resume' | 'created';

export const regularNoticeTone = (title?: string): RegularNoticeTone | null => {
  const value = (title || '').toLowerCase();
  if (value.includes('paused')) return 'pause';
  if (value.includes('resumed')) return 'resume';
  if (value.includes('created')) return 'created';
  return null;
};

export const regularNoticeLook = {
  pause: { badge: 'PAUSED', background: '#FFF7ED', border: '#EA580C', text: '#9A3412' },
  resume: { badge: 'RESUMED', background: '#ECFDF5', border: '#059669', text: '#065F46' },
  created: { badge: 'NEW', background: '#EFF6FF', border: '#2563EB', text: '#1E3A8A' },
};
