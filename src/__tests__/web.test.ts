import { EventAction, type TappStartOptions } from '../definitions';
import { TappWeb } from '../web';

describe('TappWeb', () => {
  let web: TappWeb;
  const options: TappStartOptions = { authToken: 'auth', tappToken: 'tapp', env: 'PRODUCTION' };

  beforeEach(() => {
    web = new TappWeb();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('starts as a no-op and warns once across repeated calls', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(web.start(options)).resolves.toBeUndefined();
    await expect(web.start({ ...options, env: 'SANDBOX' })).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith('Tapp is not supported on web.');
  });

  it.each([
    undefined,
    null,
    {},
    { ...options, authToken: undefined },
    { ...options, authToken: '' },
    { ...options, authToken: '   ' },
    { ...options, authToken: 123 },
    { ...options, tappToken: undefined },
    { ...options, tappToken: '' },
    { ...options, tappToken: '   ' },
    { ...options, tappToken: false },
    { ...options, env: undefined },
    { ...options, env: 'production' },
    { ...options, env: 'OTHER' },
  ])('rejects invalid start input %p without warning', async (invalid) => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(web.start(invalid as TappStartOptions)).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
      message: 'authToken, tappToken, and a PRODUCTION or SANDBOX env are required.',
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it.each(['shouldProcess', 'fetchLinkData'] as const)(
    '%s rejects invalid URLs',
    async (method) => {
      for (const url of [
        undefined,
        null,
        '',
        '   ',
        ' \n\t',
        'no-scheme/path',
        'javascript:alert(1)',
        'JavaScript:alert(1)',
        'data:text/plain,x',
        'DATA:text/plain,x',
        'file:///etc/hosts',
        'FILE:///etc/hosts',
      ]) {
        await expect(web[method]({ url } as { url: string })).rejects.toMatchObject({
          code: 'INVALID_URL',
          message: 'url must be a nonempty, valid URL.',
        });
      }
      for (const options of [undefined, null, {}, { url: 123 }]) {
        await expect(web[method](options as unknown as { url: string })).rejects.toMatchObject({
          code: 'INVALID_URL',
          message: 'url must be a nonempty, valid URL.',
        });
      }
    },
  );

  it.each([
    'https://example.com/path',
    'http://example.com',
    'myapp://x',
    '  https://example.com/a  ',
  ])('accepts %p in both URL methods', async (url) => {
    await expect(web.shouldProcess({ url })).resolves.toEqual({ value: false });
    await expect(web.fetchLinkData({ url })).resolves.toEqual({
      error: true,
      message: 'Tapp is not supported on web.',
    });
  });

  it('resolves shouldProcess to false for a valid input', async () => {
    await expect(web.shouldProcess({ url: 'https://example.com/link' })).resolves.toEqual({
      value: false,
    });
  });

  it('resolves both link-data methods with an unsupported-platform payload', async () => {
    const failure = { error: true, message: 'Tapp is not supported on web.' };
    await expect(web.fetchLinkData({ url: 'https://example.com/link' })).resolves.toEqual(failure);
    await expect(web.fetchOriginLinkData()).resolves.toEqual(failure);
  });

  it('rejects URL generation and event delivery as unimplemented', async () => {
    const failure = { code: 'UNIMPLEMENTED', message: 'Not implemented on web.' };
    await expect(web.url({ influencer: 'alice' })).rejects.toMatchObject(failure);
    await expect(web.handleTappEvent({ eventAction: EventAction.CUSTOM })).rejects.toMatchObject(
      failure,
    );
  });

  it('inherits removable listener subscriptions from WebPlugin', async () => {
    const subscription = await web.addListener('deferredLinkReceived', jest.fn());
    await expect(subscription.remove()).resolves.toBeUndefined();
    await expect(web.removeAllListeners()).resolves.toBeUndefined();
  });
});
