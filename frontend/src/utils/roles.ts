export const MANAGEMENT_ROLES = new Set([
  'admin',
  'security_officer',
  'chief_security_officer',
  'dean_of_students',
  'warden',
  'secretary',
  'registrar',
  'maintenance',
]);

export function requiresTwoFactorAuthentication(role?: string) {
  return MANAGEMENT_ROLES.has(String(role || '').trim());
}
