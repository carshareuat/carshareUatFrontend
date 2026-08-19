export function phoneHref(mobile: string | undefined | null): string {
  if (!mobile) return '';
  // keep only digits
  const digits = String(mobile).replace(/\D/g, '');
  return digits ? `tel:${digits}` : '';
}

export function sanitizeMobile(mobile: string | undefined | null): string {
  if (!mobile) return '';
  return String(mobile).replace(/\D/g, '');
}
