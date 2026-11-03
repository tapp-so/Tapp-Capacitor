import { registerPlugin } from '@capacitor/core';

import type { TappPlugin } from './definitions';

const Tapp = registerPlugin<TappPlugin>('Tapp', {
  web: () => import('./web').then((m) => new m.TappWeb()),
});

export * from './definitions';
export { Tapp };
