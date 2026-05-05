import {
  ErrorHandler,
  inject,
  provideAppInitializer,
  type ApplicationConfig,
} from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { environment } from './environments/environment';

type RuntimeSentryConfig = {
  dsn: string;
  environment: string;
  release: string;
  tracesSampleRate: number;
};

type RuntimeConfigPayload = {
  sentry?: Partial<RuntimeSentryConfig>;
};

const normalizeString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const normalizeNumber = (value: unknown, fallback: number): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const defaultSentryConfig = (): RuntimeSentryConfig => ({
  dsn: normalizeString(environment.sentry.dsn),
  environment: normalizeString(environment.sentry.environment) || 'production',
  release: normalizeString(environment.sentry.release),
  tracesSampleRate: normalizeNumber(environment.sentry.tracesSampleRate, 0),
});

const loadRuntimeSentryConfig = async (): Promise<RuntimeSentryConfig> => {
  const defaults = defaultSentryConfig();

  try {
    const response = await fetch('/runtime-config.json', {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      return defaults;
    }

    const payload = (await response.json()) as RuntimeConfigPayload;
    const sentry = payload.sentry ?? {};

    return {
      dsn: normalizeString(sentry.dsn) || defaults.dsn,
      environment: normalizeString(sentry.environment) || defaults.environment,
      release: normalizeString(sentry.release) || defaults.release,
      tracesSampleRate: normalizeNumber(
        sentry.tracesSampleRate,
        defaults.tracesSampleRate,
      ),
    };
  } catch {
    return defaults;
  }
};

const withSentryProviders = async (
  config: ApplicationConfig,
  sentry: RuntimeSentryConfig,
): Promise<ApplicationConfig> => {
  if (!sentry.dsn) {
    return config;
  }

  const { browserTracingIntegration, createErrorHandler, init, TraceService } =
    await import('@sentry/angular');

  init({
    dsn: sentry.dsn,
    environment: sentry.environment,
    release: sentry.release || undefined,
    integrations: [browserTracingIntegration()],
    tracePropagationTargets: environment.sentry.tracePropagationTargets,
    tracesSampleRate: sentry.tracesSampleRate,
  });

  return {
    ...config,
    providers: [
      ...(config.providers ?? []),
      {
        provide: ErrorHandler,
        useValue: createErrorHandler({
          logErrors: !environment.production,
          showDialog: false,
        }),
      },
      provideAppInitializer(() => {
        inject(TraceService);
      }),
    ],
  };
};

const markAppReady = (): void => {
  document.documentElement.dataset['starSignAppReady'] = 'true';
};

const bootstrap = async (): Promise<void> => {
  const sentry = await loadRuntimeSentryConfig();
  await bootstrapApplication(App, await withSentryProviders(appConfig, sentry));
  markAppReady();
};

bootstrap().catch((err) => console.error(err));
