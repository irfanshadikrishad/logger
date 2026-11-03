export const REDACTED = '[REDACTED]';
/** Keys masked by default. Matching ignores case, `_`, `-` and other separators. */
export const DEFAULT_REDACT_KEYS = [
    'password',
    'passwd',
    'pwd',
    'secret',
    'clientSecret',
    'token',
    'accessToken',
    'refreshToken',
    'idToken',
    'apiKey',
    'xApiKey',
    'authorization',
    'cookie',
    'setCookie',
    'privateKey',
    'creditCard',
    'cardNumber',
    'cvv',
    'ssn',
];
const normalizeKey = (key) => key.toLowerCase().replace(/[^a-z0-9]/g, '');
export function createRedactor(extraKeys = []) {
    const keys = new Set([...DEFAULT_REDACT_KEYS, ...extraKeys].map(normalizeKey).filter((k) => k.length > 0));
    return (key) => keys.has(normalizeKey(key));
}
//# sourceMappingURL=redact.js.map