/**
 * Copy only fields explicitly accepted by a write endpoint. This prevents
 * mass-assignment of schema fields such as role, password, ownership, or
 * timestamps when a client sends an otherwise valid JSON object.
 */
export function pickFields(source = {}, allowedFields = []) {
    const result = {};
    for (const field of allowedFields) {
        if (Object.prototype.hasOwnProperty.call(source, field)) {
            result[field] = source[field];
        }
    }
    return result;
}

export function escapeRegex(value = '') {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
