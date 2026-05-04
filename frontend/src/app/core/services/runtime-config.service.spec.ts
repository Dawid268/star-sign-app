import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { RuntimeConfigService } from './runtime-config.service';

describe('RuntimeConfigService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should load Turnstile config from runtime endpoint', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            turnstile: {
              enabled: true,
              siteKey: 'site-key',
            },
            analytics: {
              ga4MeasurementId: 'G-TEST123',
            },
            sentry: {
              dsn: 'https://public@example.com/1',
              environment: 'production',
              release: 'star-sign@abc123',
              tracesSampleRate: 0.1,
            },
          }),
      }),
    );

    const service = TestBed.inject(RuntimeConfigService);
    const config = await service.load();

    expect(config.turnstile).toEqual({ enabled: true, siteKey: 'site-key' });
    expect(service.turnstileEnabled()).toBe(true);
    expect(config.analytics).toEqual({ ga4MeasurementId: 'G-TEST123' });
    expect(service.ga4MeasurementId()).toBe('G-TEST123');
    expect(config.sentry).toEqual({
      dsn: 'https://public@example.com/1',
      environment: 'production',
      release: 'star-sign@abc123',
      tracesSampleRate: 0.1,
    });
  });

  it('should disable Turnstile when runtime payload has no site key', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            turnstile: {
              enabled: true,
              siteKey: '   ',
            },
          }),
      }),
    );

    const service = TestBed.inject(RuntimeConfigService);
    const config = await service.load();

    expect(config.turnstile).toEqual({ enabled: false, siteKey: '' });
    expect(service.turnstileEnabled()).toBe(false);
  });

  it('should keep default config when runtime endpoint fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
      }),
    );

    const service = TestBed.inject(RuntimeConfigService);
    const config = await service.load();

    expect(config.turnstile.enabled).toBe(false);
    expect(config.turnstile.siteKey).toBe('');
  });

  it('should keep default config when runtime request rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    const service = TestBed.inject(RuntimeConfigService);
    const config = await service.load();

    expect(config.turnstile.enabled).toBe(false);
  });

  it('should ignore placeholder analytics measurement IDs', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            analytics: {
              ga4MeasurementId: 'G-XXXXXXXXXX',
            },
          }),
      }),
    );

    const service = TestBed.inject(RuntimeConfigService);
    const config = await service.load();

    expect(config.analytics.ga4MeasurementId).toBe('');
    expect(service.ga4MeasurementId()).toBe('');
  });
});
