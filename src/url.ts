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
