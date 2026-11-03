import type { TappLinkData, TappMetadata } from './definitions';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Keep own string-keyed metadata values that are strings, finite numbers, or booleans.
 * Invalid values are dropped without throwing.
 * @since 0.1.0
 */
export function sanitizeMetadata(metadata: unknown): TappMetadata {
  if (!isRecord(metadata)) return {};

  const result: TappMetadata = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (
      typeof value === 'string' ||
      typeof value === 'boolean' ||
      (typeof value === 'number' && Number.isFinite(value))
    ) {
      Object.defineProperty(result, key, {
        value,
        enumerable: true,
        writable: true,
        configurable: true,
      });
    }
  }
  return result;
}

/**
 * Copy supported link-data fields, dropping unknown fields and invalid value types.
 * A payload without a boolean error flag becomes an error response.
 * @since 0.1.0
 */
export function normalizeLinkData(raw: unknown): TappLinkData {
  if (!isRecord(raw) || typeof raw.error !== 'boolean') {
    return { error: true, message: 'Invalid link data response.' };
  }

  const result: TappLinkData = { error: raw.error };
  for (const key of ['message', 'tappUrl', 'attrTappUrl', 'influencer', 'deepLink'] as const) {
    if (typeof raw[key] === 'string') result[key] = raw[key];
  }
  if (typeof raw.isFirstSession === 'boolean') result.isFirstSession = raw.isFirstSession;
  if (isRecord(raw.data)) {
    result.data = {};
    for (const [key, value] of Object.entries(raw.data)) {
      if (typeof value === 'string') {
        Object.defineProperty(result.data, key, {
          value,
          enumerable: true,
          writable: true,
          configurable: true,
        });
      }
    }
  }
  return result;
}
