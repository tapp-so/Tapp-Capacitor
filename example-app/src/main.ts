import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { EventAction, Tapp } from 'tapp-capacitor-sdk';
import type { TappEnvironment, TappMetadata } from 'tapp-capacitor-sdk';
import './style.css';

function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing element: ${id}`);
  return found as T;
}

const authToken = element<HTMLInputElement>('auth-token');
const tappToken = element<HTMLInputElement>('tapp-token');
const environment = element<HTMLSelectElement>('environment');
const startButton = element<HTMLButtonElement>('start');
const actions = element<HTMLFieldSetElement>('actions');
const status = element<HTMLParagraphElement>('status');
const influencer = element<HTMLInputElement>('influencer');
const linkUrl = element<HTMLInputElement>('link-url');
const eventAction = element<HTMLSelectElement>('event-action');
const logPanel = element<HTMLPreElement>('log');

function log(label: string, data?: unknown): void {
  const entry = document.createElement('span');
  const details = data === undefined ? '' : `\n${JSON.stringify(data, null, 2)}`;
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${label}${details}\n\n`;
  logPanel.append(entry);
  while (logPanel.childElementCount > 100) logPanel.firstElementChild?.remove();
  logPanel.scrollTop = logPanel.scrollHeight;
}

function logError(label: string, error: unknown): void {
  log(label, error instanceof Error ? error.message : String(error));
}

// Used by both the launch URL and appUrlOpen. Resolution failures can resolve
// with { error: true, message }, so log the payload as well as rejected calls.
async function handleIncomingUrl(url: string): Promise<void> {
  try {
    const result = await Tapp.shouldProcess({ url });
    log('shouldProcess', { url, ...result });
    if (result.value) {
      const data = await Tapp.fetchLinkData({ url });
      log(data.error ? 'Link resolution failed' : 'Link data', data);
    }
  } catch (error) {
    logError('Incoming URL failed', error);
  }
}

// On Android cold start the launch URL is delivered twice: via the appUrlOpen
// listener and via App.getLaunchUrl(). Track handled URLs so it is processed once.
const handledLaunchUrls = new Set<string>();

async function handleLaunchUrlOnce(url: string): Promise<void> {
  if (handledLaunchUrls.has(url)) return;
  handledLaunchUrls.add(url);
  await handleIncomingUrl(url);
}

// Set before the first await: rapid taps cannot initialize the SDK twice.
// Once initialization succeeds, later bootstrap errors must not allow a restart.
let starting = false;
let started = false;

async function start(): Promise<void> {
  if (starting || started) return;
  if (!authToken.value.trim() || !tappToken.value.trim()) {
    log('Enter both tokens before starting.');
    return;
  }

  starting = true;
  startButton.disabled = true;
  status.textContent = 'Starting…';
  try {
    const env: TappEnvironment = environment.value === 'PRODUCTION' ? 'PRODUCTION' : 'SANDBOX';
    await Tapp.start({
      authToken: authToken.value.trim(),
      tappToken: tappToken.value.trim(),
      env,
    });
    started = true;
    authToken.disabled = tappToken.disabled = environment.disabled = true;
    log('start() completed', { env });

    // Intentionally attach AFTER start(): native events are retained until
    // listeners attach, including a deferred link received during startup.
    await Tapp.addListener('deferredLinkReceived', (data) => log('deferredLinkReceived', data));
    await Tapp.addListener('didFailResolvingURL', (failure) => log('didFailResolvingURL', failure));
    log('Tapp listeners attached after start().');
    actions.disabled = false;

    if (Capacitor.isNativePlatform()) {
      // Register warm-start handling before reading the launch URL so events
      // arriving during the launch lookup also have a listener.
      await App.addListener('appUrlOpen', (e) => {
        void handleLaunchUrlOnce(e.url);
      });
      const launch = await App.getLaunchUrl();
      if (launch?.url) await handleLaunchUrlOnce(launch.url);
    } else {
      log('Browser preview: native SDK features require iOS or Android.');
    }
    status.textContent = 'Ready — listeners attached.';
    startButton.textContent = 'Started';
  } catch (error) {
    status.textContent = started
      ? 'SDK started, but bootstrap failed. Reload to try again.'
      : 'Start failed — check credentials and try again.';
    logError('Bootstrap failed', error);
    startButton.disabled = started;
  } finally {
    starting = false;
  }
}

// All button operations report rejected promises in the on-screen log.
function onClick(id: string, action: () => Promise<void>): void {
  const button = element<HTMLButtonElement>(id);
  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      await action();
    } catch (error) {
      logError(`${button.textContent} failed`, error);
    } finally {
      button.disabled = false;
    }
  });
}

startButton.addEventListener('click', () => {
  void start();
});

onClick('generate', async () => {
  const creator = influencer.value.trim();
  if (!creator) throw new Error('Enter an influencer.');
  const result = await Tapp.url({
    influencer: creator,
    adGroup: 'example_ad_group',
    creative: 'example_creative',
    data: { campaign: 'example_campaign', source: 'capacitor_example' },
  });
  linkUrl.value = result.url;
  log('Generated URL', result);
});

onClick('send-event', async () => {
  const selected = {
    CUSTOM: EventAction.CUSTOM,
    TAPP_ADD_TO_WISHLIST: EventAction.TAPP_ADD_TO_WISHLIST,
    TAPP_PURCHASE: EventAction.TAPP_PURCHASE,
  }[eventAction.value];
  if (selected === undefined) throw new Error('Choose an event action.');

  const sampleMetadata = {
    currency: 'EUR',
    price: 10.34,
    count: 3,
    success: true,
    nested: { invalid: 'This value is dropped by the SDK.' },
  };
  // Deliberate type escape for this runtime validation demo only. Normal app
  // code should pass flat TappMetadata without an assertion.
  await Tapp.handleTappEvent({
    eventAction: selected,
    ...(selected === EventAction.CUSTOM ? { customValue: 'capacitor_example_event' } : {}),
    metadata: sampleMetadata as unknown as TappMetadata,
  });
  log('Event sent; SDK drops the nested metadata value', {
    action: eventAction.value,
    sampleMetadata,
  });
});

function enteredUrl(): string {
  const url = linkUrl.value.trim();
  if (!url) throw new Error('Enter a URL.');
  return url;
}

onClick('should-process', async () => {
  log('shouldProcess', await Tapp.shouldProcess({ url: enteredUrl() }));
});
onClick('fetch-link', () => handleIncomingUrl(enteredUrl()));
onClick('fetch-origin', async () => {
  const data = await Tapp.fetchOriginLinkData();
  log(data.error ? 'Origin link resolution failed' : 'Origin link data', data);
});
element<HTMLButtonElement>('clear-log').addEventListener('click', () => {
  logPanel.textContent = '';
});

log('Ready to start. Credentials are held in memory and are never written to this log.');
