import type { PluginListenerHandle } from '@capacitor/core';

/**
 * SDK environment.
 * @since 0.1.0
 */
export type TappEnvironment = 'PRODUCTION' | 'SANDBOX';

/**
 * Credentials and environment used to initialize Tapp.
 * @since 0.1.0
 */
export interface TappStartOptions {
  /**
   * Authentication token.
   * @since 0.1.0
   */
  authToken: string;
  /**
   * SDK environment.
   * @since 0.1.0
   */
  env: TappEnvironment;
  /**
   * Tapp application token.
   * @since 0.1.0
   */
  tappToken: string;
}

/**
 * Resolved link data. SDK and backend failures resolve with { error: true, message };
 * only invalid input rejects. Optional fields are omitted when unavailable.
 * @since 0.1.0
 */
export interface TappLinkData {
  /**
   * Whether link resolution failed.
   * @since 0.1.0
   */
  error: boolean;
  /**
   * Failure description, when available.
   * @since 0.1.0
   */
  message?: string;
  /**
   * Resolved Tapp URL.
   * @since 0.1.0
   */
  tappUrl?: string;
  /**
   * Attribution Tapp URL.
   * @since 0.1.0
   */
  attrTappUrl?: string;
  /**
   * Influencer associated with the link.
   * @since 0.1.0
   */
  influencer?: string;
  /**
   * Custom string data associated with the link.
   * @since 0.1.0
   */
  data?: Record<string, string>;
  /**
   * Whether this is the first session.
   * @since 0.1.0
   */
  isFirstSession?: boolean;
  /**
   * Original deep link, when available; omitted on iOS.
   * @since 0.1.0
   */
  deepLink?: string;
}

/**
 * URL resolution failure event payload.
 * @since 0.1.0
 */
export interface TappResolveFailure {
  /**
   * URL that could not be resolved.
   * @since 0.1.0
   */
  url: string;
  /**
   * Resolution error description.
   * @since 0.1.0
   */
  error: string;
}

/**
 * Flat event metadata. Only strings, finite numbers, and booleans are kept;
 * invalid values are dropped without throwing.
 * @since 0.1.0
 */
export type TappMetadata = Record<string, string | number | boolean>;

/**
 * Event identifiers shared with the native SDKs.
 * @since 0.1.0
 */
export enum EventAction {
  /**
   * Add payment info event.
   * @since 0.1.0
   */
  TAPP_ADD_PAYMENT_INFO = 1,
  /**
   * Add to cart event.
   * @since 0.1.0
   */
  TAPP_ADD_TO_CART = 2,
  /**
   * Add to wishlist event.
   * @since 0.1.0
   */
  TAPP_ADD_TO_WISHLIST = 3,
  /**
   * Complete registration event.
   * @since 0.1.0
   */
  TAPP_COMPLETE_REGISTRATION = 4,
  /**
   * Contact event.
   * @since 0.1.0
   */
  TAPP_CONTACT = 5,
  /**
   * Customize product event.
   * @since 0.1.0
   */
  TAPP_CUSTOMIZE_PRODUCT = 6,
  /**
   * Donate event.
   * @since 0.1.0
   */
  TAPP_DONATE = 7,
  /**
   * Find location event.
   * @since 0.1.0
   */
  TAPP_FIND_LOCATION = 8,
  /**
   * Initiate checkout event.
   * @since 0.1.0
   */
  TAPP_INITIATE_CHECKOUT = 9,
  /**
   * Generate lead event.
   * @since 0.1.0
   */
  TAPP_GENERATE_LEAD = 10,
  /**
   * Purchase event.
   * @since 0.1.0
   */
  TAPP_PURCHASE = 11,
  /**
   * Schedule event.
   * @since 0.1.0
   */
  TAPP_SCHEDULE = 12,
  /**
   * Search event.
   * @since 0.1.0
   */
  TAPP_SEARCH = 13,
  /**
   * Start trial event.
   * @since 0.1.0
   */
  TAPP_START_TRIAL = 14,
  /**
   * Submit application event.
   * @since 0.1.0
   */
  TAPP_SUBMIT_APPLICATION = 15,
  /**
   * Subscribe event.
   * @since 0.1.0
   */
  TAPP_SUBSCRIBE = 16,
  /**
   * View content event.
   * @since 0.1.0
   */
  TAPP_VIEW_CONTENT = 17,
  /**
   * Click button event.
   * @since 0.1.0
   */
  TAPP_CLICK_BUTTON = 18,
  /**
   * Download file event.
   * @since 0.1.0
   */
  TAPP_DOWNLOAD_FILE = 19,
  /**
   * Join group event.
   * @since 0.1.0
   */
  TAPP_JOIN_GROUP = 20,
  /**
   * Achieve level event.
   * @since 0.1.0
   */
  TAPP_ACHIEVE_LEVEL = 21,
  /**
   * Create group event.
   * @since 0.1.0
   */
  TAPP_CREATE_GROUP = 22,
  /**
   * Create role event.
   * @since 0.1.0
   */
  TAPP_CREATE_ROLE = 23,
  /**
   * Link click event.
   * @since 0.1.0
   */
  TAPP_LINK_CLICK = 24,
  /**
   * Link impression event.
   * @since 0.1.0
   */
  TAPP_LINK_IMPRESSION = 25,
  /**
   * Apply for loan event.
   * @since 0.1.0
   */
  TAPP_APPLY_FOR_LOAN = 26,
  /**
   * Loan approval event.
   * @since 0.1.0
   */
  TAPP_LOAN_APPROVAL = 27,
  /**
   * Loan disbursal event.
   * @since 0.1.0
   */
  TAPP_LOAN_DISBURSAL = 28,
  /**
   * Login event.
   * @since 0.1.0
   */
  TAPP_LOGIN = 29,
  /**
   * Rate event.
   * @since 0.1.0
   */
  TAPP_RATE = 30,
  /**
   * Spend credits event.
   * @since 0.1.0
   */
  TAPP_SPEND_CREDITS = 31,
  /**
   * Unlock achievement event.
   * @since 0.1.0
   */
  TAPP_UNLOCK_ACHIEVEMENT = 32,
  /**
   * Add shipping info event.
   * @since 0.1.0
   */
  TAPP_ADD_SHIPPING_INFO = 33,
  /**
   * Earn virtual currency event.
   * @since 0.1.0
   */
  TAPP_EARN_VIRTUAL_CURRENCY = 34,
  /**
   * Start level event.
   * @since 0.1.0
   */
  TAPP_START_LEVEL = 35,
  /**
   * Complete level event.
   * @since 0.1.0
   */
  TAPP_COMPLETE_LEVEL = 36,
  /**
   * Post score event.
   * @since 0.1.0
   */
  TAPP_POST_SCORE = 37,
  /**
   * Select content event.
   * @since 0.1.0
   */
  TAPP_SELECT_CONTENT = 38,
  /**
   * Begin tutorial event.
   * @since 0.1.0
   */
  TAPP_BEGIN_TUTORIAL = 39,
  /**
   * Complete tutorial event.
   * @since 0.1.0
   */
  TAPP_COMPLETE_TUTORIAL = 40,
  /**
   * Custom event.
   * @since 0.1.0
   */
  CUSTOM = 0,
}

/**
 * Options for generating a Tapp link.
 * @since 0.1.0
 */
export interface TappUrlOptions {
  /**
   * Influencer identifier.
   * @since 0.1.0
   */
  influencer: string;
  /**
   * Advertising group.
   * @since 0.1.0
   */
  adGroup?: string;
  /**
   * Creative identifier.
   * @since 0.1.0
   */
  creative?: string;
  /**
   * Custom string data to attach to the link.
   * @since 0.1.0
   */
  data?: Record<string, string>;
}

/**
 * Options for sending a Tapp event.
 * @since 0.1.0
 */
export interface TappEventOptions {
  /**
   * Standard event identifier or CUSTOM.
   * @since 0.1.0
   */
  eventAction: EventAction;
  /**
   * Custom event name used with CUSTOM.
   * @since 0.1.0
   */
  customValue?: string;
  /**
   * Flat metadata; invalid value types are dropped without throwing.
   * @since 0.1.0
   */
  metadata?: TappMetadata;
}

/**
 * Tapp native plugin API. Link-data SDK and backend failures resolve with
 * { error: true, message }; only invalid input rejects. Web methods follow
 * the documented unsupported-platform behavior.
 * @since 0.1.0
 */
export interface TappPlugin {
  /**
   * Initialize the SDK. Subsequent calls are no-ops. On web, validates input
   * and resolves with a warning once.
   * @since 0.1.0
   */
  start(options: TappStartOptions): Promise<void>;
  /**
   * Generate a Tapp link. Unimplemented on web.
   * @since 0.1.0
   */
  url(options: TappUrlOptions): Promise<{ url: string }>;
  /**
   * Send an event, dropping invalid metadata values. Unimplemented on web.
   * @since 0.1.0
   */
  handleTappEvent(options: TappEventOptions): Promise<void>;
  /**
   * Check whether Tapp can process a nonempty URL. Returns false on web.
   * @since 0.1.0
   */
  shouldProcess(options: { url: string }): Promise<{ value: boolean }>;
  /**
   * Resolve a nonempty URL. SDK and backend errors resolve with
   * { error: true, message }; only invalid input rejects.
   * @since 0.1.0
   */
  fetchLinkData(options: { url: string }): Promise<TappLinkData>;
  /**
   * Resolve the original install link. SDK and backend errors resolve with
   * { error: true, message }; only invalid input rejects.
   * @since 0.1.0
   */
  fetchOriginLinkData(): Promise<TappLinkData>;
  /**
   * Listen for a deferred link. Native events are retained until a listener attaches.
   * @since 0.1.0
   */
  addListener(
    eventName: 'deferredLinkReceived',
    fn: (data: TappLinkData) => void,
  ): Promise<PluginListenerHandle>;
  /**
   * Listen for URL resolution failures.
   * @since 0.1.0
   */
  addListener(
    eventName: 'didFailResolvingURL',
    fn: (failure: TappResolveFailure) => void,
  ): Promise<PluginListenerHandle>;
  /**
   * Remove all plugin event listeners.
   * @since 0.1.0
   */
  removeAllListeners(): Promise<void>;
}
