import { EventAction } from '../definitions';

describe('EventAction native identifiers', () => {
  it.each([
    ['CUSTOM', 0],
    ['TAPP_ADD_PAYMENT_INFO', 1],
    ['TAPP_PURCHASE', 11],
    ['TAPP_VIEW_CONTENT', 17],
    ['TAPP_LINK_CLICK', 24],
    ['TAPP_LOGIN', 29],
    ['TAPP_ADD_SHIPPING_INFO', 33],
    ['TAPP_COMPLETE_TUTORIAL', 40],
  ] as const)('%s is %i', (name, value) => {
    expect(EventAction[name]).toBe(value);
  });

  it('contains exactly 41 numeric members covering 0 through 40', () => {
    const values = Object.values(EventAction).filter((value) => typeof value === 'number');
    expect(values).toHaveLength(41);
    expect(values.sort((a, b) => a - b)).toEqual(Array.from({ length: 41 }, (_, index) => index));
  });
});
