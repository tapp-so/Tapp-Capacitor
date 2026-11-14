import { registerPlugin } from '@capacitor/core';

import type { TappPlugin } from './definitions';

/**
 * Capacitor Tapp plugin for iOS and Android, with a limited web fallback.
 * Register listeners before start(); await start() before native link generation,
 * event delivery, or link-data resolution. Forward incoming URLs from @capacitor/app.
 * See TappPlugin for each method's rejection codes and resolved error payloads.
 * @example
 * await Tapp.start({ authToken: AUTH_TOKEN, env: 'SANDBOX', tappToken: TAPP_TOKEN });
 * @since 0.1.0
 */
const Tapp = registerPlugin<TappPlugin>('Tapp', {
  web: () => import('./web').then((m) => new m.TappWeb()),
});

export * from './definitions';
export { Tapp };
