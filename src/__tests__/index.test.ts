import { registerPlugin } from '@capacitor/core';

import { Tapp } from '../index';
import { TappWeb } from '../web';

jest.mock('@capacitor/core', () => ({
  ...jest.requireActual('@capacitor/core'),
  registerPlugin: jest.fn(() => ({ name: 'registered-plugin' })),
}));

const registration = jest.mocked(registerPlugin).mock.calls[0];
const registeredInstance = jest.mocked(registerPlugin).mock.results[0].value;

describe('plugin registration', () => {
  it('registers the native bridge name Tapp and exports the registered instance', () => {
    expect(registration).toEqual(['Tapp', { web: expect.any(Function) }]);
    expect(Tapp).toBe(registeredInstance);
  });

  it('loads the web implementation lazily', async () => {
    expect(await registration[1]?.web?.()).toBeInstanceOf(TappWeb);
  });
});
