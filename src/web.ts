import { CapacitorException, WebPlugin, type ExceptionCode } from '@capacitor/core';

import type {
  TappEventOptions,
  TappLinkData,
  TappPlugin,
  TappStartOptions,
  TappUrlOptions,
} from './definitions';
import { validateTappUrl } from './url';

function isNonemptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Web fallback for the native Tapp SDK.
 * @since 0.1.0
 */
export class TappWeb extends WebPlugin implements TappPlugin {
  private warned = false;

  /**
   * Validate credentials and resolve without initializing a native SDK. Warn once per instance.
   * @since 0.1.0
   */
  async start(options: TappStartOptions): Promise<void> {
    if (
      !isNonemptyString(options?.authToken) ||
      !isNonemptyString(options?.tappToken) ||
      (options?.env !== 'PRODUCTION' && options?.env !== 'SANDBOX')
    ) {
      throw new CapacitorException(
        'authToken, tappToken, and a PRODUCTION or SANDBOX env are required.',
        'INVALID_ARGUMENT' as ExceptionCode,
      );
    }
    if (!this.warned) {
      this.warned = true;
      console.warn('Tapp is not supported on web.');
    }
  }

  /**
   * Reject because link generation requires a native platform.
   * @since 0.1.0
   */
  async url(_options: TappUrlOptions): Promise<{ url: string }> {
    throw this.unimplemented('Not implemented on web.');
  }

  /**
   * Reject because event delivery requires a native platform.
   * @since 0.1.0
   */
  async handleTappEvent(_options: TappEventOptions): Promise<void> {
    throw this.unimplemented('Not implemented on web.');
  }

  /**
   * Validate a nonempty URL and resolve with false on web.
   * @since 0.1.0
   */
  async shouldProcess(options: { url: string }): Promise<{ value: boolean }> {
    this.validateUrl(options);
    return { value: false };
  }

  /**
   * Reject invalid input; otherwise resolve with an unsupported-platform error payload.
   * @since 0.1.0
   */
  async fetchLinkData(options: { url: string }): Promise<TappLinkData> {
    this.validateUrl(options);
    return this.unsupportedLinkData();
  }

  /**
   * Resolve with an unsupported-platform error payload.
   * @since 0.1.0
   */
  async fetchOriginLinkData(): Promise<TappLinkData> {
    return this.unsupportedLinkData();
  }

  private validateUrl(options: { url: string }): void {
    if (validateTappUrl(options?.url) === null)
      throw new CapacitorException(
        'url must be a nonempty, valid URL.',
        'INVALID_URL' as ExceptionCode,
      );
  }

  private unsupportedLinkData(): TappLinkData {
    return { error: true, message: 'Tapp is not supported on web.' };
  }
}
