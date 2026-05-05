import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';

export type TurnstileRenderOptions = {
  sitekey: string;
  action?: string;
  theme?: 'auto' | 'light' | 'dark';
  callback: (token: string) => void;
  'error-callback': () => void;
  'expired-callback': () => void;
};

export type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
  reset: (widgetId?: string) => void;
  remove?: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const TURNSTILE_SCRIPT_URL =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

@Injectable({
  providedIn: 'root',
})
export class TurnstileService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private scriptPromise?: Promise<TurnstileApi>;

  public render(
    container: HTMLElement,
    options: TurnstileRenderOptions,
  ): Promise<string> {
    return this.loadScript().then((api) => api.render(container, options));
  }

  public reset(widgetId?: string): void {
    if (!this.isBrowser) {
      return;
    }

    window.turnstile?.reset(widgetId);
  }

  public remove(widgetId?: string): void {
    if (!this.isBrowser || !widgetId) {
      return;
    }

    window.turnstile?.remove?.(widgetId);
  }

  private loadScript(): Promise<TurnstileApi> {
    if (!this.isBrowser) {
      return Promise.reject(
        new Error('Turnstile can only be loaded in the browser.'),
      );
    }

    if (window.turnstile) {
      return Promise.resolve(window.turnstile);
    }

    if (this.scriptPromise) {
      return this.scriptPromise;
    }

    this.scriptPromise = new Promise<TurnstileApi>((resolve, reject) => {
      const resolveApi = (): void => {
        if (window.turnstile) {
          resolve(window.turnstile);
          return;
        }

        reject(
          new Error(
            'Turnstile script loaded without exposing window.turnstile.',
          ),
        );
      };

      const existingScript = document.querySelector<HTMLScriptElement>(
        'script[data-turnstile-script="true"]',
      );
      if (existingScript) {
        existingScript.addEventListener('load', resolveApi, { once: true });
        existingScript.addEventListener(
          'error',
          () => reject(new Error('Turnstile script failed to load.')),
          {
            once: true,
          },
        );
        return;
      }

      const script = document.createElement('script');
      script.src = TURNSTILE_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.dataset['turnstileScript'] = 'true';
      script.addEventListener('load', resolveApi, { once: true });
      script.addEventListener(
        'error',
        () => reject(new Error('Turnstile script failed to load.')),
        { once: true },
      );

      document.head.appendChild(script);
    });

    return this.scriptPromise;
  }
}
