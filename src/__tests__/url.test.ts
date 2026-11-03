import { validateTappUrl } from '../url';

describe('validateTappUrl', () => {
  it.each([
    undefined,
    null,
    '',
    '   ',
    ' \n\t',
    'no-scheme/path',
    'https://[invalid',
    'http://exa mple.com',
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    'data:text/plain,x',
    'DATA:text/plain,x',
    'file:///etc/hosts',
    'FILE:///etc/hosts',
  ])('rejects %p', (value) => {
    expect(validateTappUrl(value)).toBeNull();
  });

  it.each([
    ['https://example.com/path', 'https://example.com/path'],
    ['http://example.com', 'http://example.com'],
    ['myapp://x', 'myapp://x'],
    ['  https://example.com/a  ', 'https://example.com/a'],
  ])('validates and trims %p', (value, expected) => {
    expect(validateTappUrl(value)).toBe(expected);
  });
});
