import crypto from 'crypto';

export const MANAGEMENT_ROLES = new Set([
    'admin',
    'security_officer',
    'chief_security_officer',
    'dean_of_students',
    'warden',
    'secretary',
    'registrar',
    'maintenance'
]);

const DEFAULT_CODE_TTL_MINUTES = 10;
const MAX_CODE_TTL_MINUTES = 60;
const DEFAULT_TRUSTED_DEVICE_TTL_DAYS = 30;
const MAX_TRUSTED_DEVICE_TTL_DAYS = 90;

export function requiresTwoFactorAuthentication(role) {
    return MANAGEMENT_ROLES.has(String(role || '').trim());
}

export function getTwoFactorCodeTtlMs() {
    const configuredMinutes = Number.parseInt(process.env.TWO_FACTOR_CODE_TTL_MINUTES || '', 10);
    const minutes = Number.isFinite(configuredMinutes) && configuredMinutes > 0
        ? Math.min(configuredMinutes, MAX_CODE_TTL_MINUTES)
        : DEFAULT_CODE_TTL_MINUTES;

    return minutes * 60 * 1000;
}

export function getTrustedDeviceTtlMs() {
    const configuredDays = Number.parseInt(process.env.TRUSTED_DEVICE_TTL_DAYS || '', 10);
    const days = Number.isFinite(configuredDays) && configuredDays > 0
        ? Math.min(configuredDays, MAX_TRUSTED_DEVICE_TTL_DAYS)
        : DEFAULT_TRUSTED_DEVICE_TTL_DAYS;

    return days * 24 * 60 * 60 * 1000;
}

export function createTwoFactorChallenge() {
    const challengeId = crypto.randomBytes(32).toString('hex');
    const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');

    return {
        challengeId,
        challengeHash: hashTwoFactorChallenge(challengeId),
        code,
        expiresAt: new Date(Date.now() + getTwoFactorCodeTtlMs())
    };
}

export function hashTwoFactorChallenge(challengeId) {
    return crypto.createHash('sha256').update(String(challengeId || '')).digest('hex');
}

export function createTrustedDeviceToken() {
    const token = crypto.randomBytes(32).toString('hex');
    return {
        token,
        tokenHash: hashTrustedDeviceToken(token),
        expiresAt: new Date(Date.now() + getTrustedDeviceTtlMs())
    };
}

export function hashTrustedDeviceToken(token) {
    return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

export function isValidTwoFactorCode(code) {
    return /^\d{6}$/.test(String(code || '').trim());
}
