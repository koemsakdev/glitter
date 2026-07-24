/**
 * Cambodian phone number check — mirrors the API's server-side regex so the
 * client can validate before submitting:
 *   +85512345678  /  85512345678  /  012345678
 */
export function isValidPhone(phone: string): boolean {
    const p = phone.replace(/[\s-]/g, '');
    return /^(\+?855|0)\d{7,10}$/.test(p);
}
