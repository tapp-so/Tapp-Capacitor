import { normalizeLinkData, sanitizeMetadata } from '../utils';

describe('sanitizeMetadata', () => {
  it('keeps valid primitives and drops all invalid value types', () => {
    expect(
      sanitizeMetadata({
        text: 'campaign',
        empty: '',
        number: 12.5,
        zero: 0,
        negative: -1,
        yes: true,
        no: false,
        object: {},
        array: [],
        nil: null,
        missing: undefined,
        nan: NaN,
        infinity: Infinity,
        negativeInfinity: -Infinity,
        fn: () => 'value',
        symbol: Symbol('value'),
      }),
    ).toEqual({
      text: 'campaign',
      empty: '',
      number: 12.5,
      zero: 0,
      negative: -1,
      yes: true,
      no: false,
    });
  });

  it.each([null, undefined, [], 'text', 1, true])('returns an empty map for %p', (value) => {
    expect(sanitizeMetadata(value)).toEqual({});
  });

  it('keeps own string keys and safely handles special keys without mutating input', () => {
    const input: Record<string, unknown> = { own: 'keep', [Symbol('hidden')]: 'omit' };
    Object.setPrototypeOf(input, { inherited: 'omit' });
    Object.defineProperty(input, '__proto__', { value: 'keep', enumerable: true });
    const result = sanitizeMetadata(input);
    expect(Object.keys(result)).toEqual(['own', '__proto__']);
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(result['__proto__']).toBe('keep');
    expect(input.own).toBe('keep');
  });
});

describe('normalizeLinkData', () => {
  it('preserves the complete response shape without mutating input', () => {
    const raw = {
      error: false,
      message: '',
      tappUrl: 'tapp://campaign',
      attrTappUrl: 'tapp://attribution',
      influencer: 'alice',
      data: { campaign: 'spring' },
      isFirstSession: true,
      deepLink: 'https://example.com/link',
    };
    const result = normalizeLinkData(raw);
    expect(result).toEqual(raw);
    expect(result).not.toBe(raw);
    expect(result.data).not.toBe(raw.data);
  });

  it('omits unavailable fields and drops unknown or invalid fields', () => {
    expect(
      normalizeLinkData({
        error: false,
        tappUrl: 123,
        attrTappUrl: null,
        influencer: false,
        isFirstSession: 'true',
        data: { valid: 'value', invalid: 1, nested: {} },
        unknown: 'omit',
      }),
    ).toEqual({ error: false, data: { valid: 'value' } });
    expect(normalizeLinkData({ error: false })).toEqual({ error: false });
  });

  it('preserves SDK failure payloads', () => {
    expect(normalizeLinkData({ error: true, message: 'Network timeout' })).toEqual({
      error: true,
      message: 'Network timeout',
    });
  });

  it.each([null, undefined, [], 'text', {}, { error: 'false' }])(
    'normalizes malformed input %p to an error response',
    (raw) => {
      expect(normalizeLinkData(raw)).toEqual({
        error: true,
        message: 'Invalid link data response.',
      });
    },
  );
});
