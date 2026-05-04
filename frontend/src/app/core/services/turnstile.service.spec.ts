import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { TurnstileService } from './turnstile.service';

describe('TurnstileService', () => {
  afterEach(() => {
    document.head
      .querySelectorAll('script[data-turnstile-script="true"]')
      .forEach((script) => script.remove());
    window.turnstile = undefined;
  });

  it('should render using existing Turnstile API', async () => {
    const render = vi.fn().mockReturnValue('widget-id');
    window.turnstile = {
      render,
      reset: vi.fn(),
      remove: vi.fn(),
    };
    const container = document.createElement('div');
    const service = TestBed.inject(TurnstileService);

    const widgetId = await service.render(container, {
      sitekey: 'site-key',
      callback: vi.fn(),
      'error-callback': vi.fn(),
      'expired-callback': vi.fn(),
    });

    expect(widgetId).toBe('widget-id');
    expect(render).toHaveBeenCalledWith(
      container,
      expect.objectContaining({ sitekey: 'site-key' }),
    );
  });

  it('should reset and remove widgets through Turnstile API', () => {
    const reset = vi.fn();
    const remove = vi.fn();
    window.turnstile = {
      render: vi.fn(),
      reset,
      remove,
    };
    const service = TestBed.inject(TurnstileService);

    service.reset('widget-id');
    service.remove('widget-id');

    expect(reset).toHaveBeenCalledWith('widget-id');
    expect(remove).toHaveBeenCalledWith('widget-id');
  });

  it('should inject script and resolve after it exposes Turnstile API', async () => {
    const service = TestBed.inject(TurnstileService);
    const container = document.createElement('div');
    const renderPromise = service.render(container, {
      sitekey: 'site-key',
      callback: vi.fn(),
      'error-callback': vi.fn(),
      'expired-callback': vi.fn(),
    });
    const script = document.head.querySelector(
      'script[data-turnstile-script="true"]',
    ) as HTMLScriptElement;

    window.turnstile = {
      render: vi.fn().mockReturnValue('widget-id'),
      reset: vi.fn(),
    };
    script.dispatchEvent(new Event('load'));

    await expect(renderPromise).resolves.toBe('widget-id');
  });

  it('should reject when Turnstile is rendered outside the browser', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
    });
    const service = TestBed.inject(TurnstileService);

    await expect(
      service.render(document.createElement('div'), {
        sitekey: 'site-key',
        callback: vi.fn(),
        'error-callback': vi.fn(),
        'expired-callback': vi.fn(),
      }),
    ).rejects.toThrow('Turnstile can only be loaded in the browser.');
  });
});
