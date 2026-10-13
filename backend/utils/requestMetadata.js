export function getClientIpAddress(req) {
    const ip = String(req?.ip || req?.socket?.remoteAddress || '').trim();
    return ip || 'unknown-ip';
}
