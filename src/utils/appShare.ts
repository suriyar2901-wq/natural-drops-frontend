const STORAGE_KEY = 'nd-share-company';

export const appShareLink = (companyCode: string) => {
  const code = companyCode.trim();
  const path = `/Register?companyCode=${encodeURIComponent(code)}`;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${path}`;
  }
  return path;
};

export const appShareMessage = (companyName: string | null | undefined, companyCode: string, link: string) => {
  const shop = companyName?.trim() || 'this seller';
  return `Join ${shop} on Natural Drops.\nCreate your buyer account with this link. The account is added only under company code ${companyCode}.\n${link}`;
};

export const readSharedCompanyCode = (routeCode?: string) => {
  const fromRoute = String(routeCode || '').trim();
  if (fromRoute) {
    return fromRoute.toUpperCase();
  }
  if (typeof window === 'undefined') {
    return '';
  }
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('companyCode') || '';
    if (fromUrl.trim()) {
      return fromUrl.trim().toUpperCase();
    }
    return (sessionStorage.getItem(STORAGE_KEY) || '').trim().toUpperCase();
  } catch (_error) {
    return '';
  }
};

export const rememberSharedCompanyCode = (companyCode: string) => {
  if (typeof window === 'undefined' || !companyCode.trim()) {
    return;
  }
  try {
    sessionStorage.setItem(STORAGE_KEY, companyCode.trim().toUpperCase());
  } catch (_error) {
    // Private browsing can block storage. The URL still carries the code.
  }
};

export const clearSharedCompanyCode = () => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (_error) {
    // Ignore storage failures.
  }
};
