/**
 * Validate a URL using the JavaScript URL parser, without requiring start().
 * Accepts strings that, after trimming, parse as absolute URLs with a scheme,
 * including custom schemes, except javascript:, data:, and file: (case-insensitive).
 * Missing or non-string values, blank strings, relative URLs, malformed URLs,
 * and the blocked schemes return null. Native platform parsers may differ on edge cases.
 * @returns The trimmed input, preserving its spelling, or null for invalid input.
 * Does not throw or return rejection codes; callers map null to INVALID_URL.
 * @example
 * const url = validateTappUrl(' https://example.com/path ');
 */
export function validateTappUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const { protocol } = new URL(trimmed);
    if (!protocol || ['javascript:', 'data:', 'file:'].includes(protocol.toLowerCase()))
      return null;
    return trimmed;
  } catch {
    return null;
  }
}
