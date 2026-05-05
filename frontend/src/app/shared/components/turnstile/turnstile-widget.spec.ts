import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { vi } from 'vitest';

import { RuntimeConfigService } from '../../../core/services/runtime-config.service';
import {
  TurnstileRenderOptions,
  TurnstileService,
} from '../../../core/services/turnstile.service';
import { TurnstileWidget } from './turnstile-widget';

describe('TurnstileWidget', () => {
  let fixture: ComponentFixture<TurnstileWidget>;
  let component: TurnstileWidget;
  let turnstileEnabled: ReturnType<typeof signal<boolean>>;
  let turnstileConfig: ReturnType<
    typeof signal<{ enabled: boolean; siteKey: string }>
  >;
  let turnstileService: {
    render: ReturnType<typeof vi.fn>;
    reset: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    turnstileEnabled = signal(false);
    turnstileConfig = signal({ enabled: false, siteKey: '' });
    turnstileService = {
      render: vi.fn().mockResolvedValue('widget-id'),
      reset: vi.fn(),
      remove: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [TurnstileWidget],
      providers: [
        {
          provide: RuntimeConfigService,
          useValue: {
            turnstileEnabled,
            turnstile: turnstileConfig,
          },
        },
        { provide: TurnstileService, useValue: turnstileService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TurnstileWidget);
    component = fixture.componentInstance;
  });

  it('should stay hidden when Turnstile is disabled', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.trim()).toBe('');
    expect(turnstileService.render).not.toHaveBeenCalled();
  });

  it('should render Turnstile when runtime config is enabled', async () => {
    turnstileEnabled.set(true);
    turnstileConfig.set({ enabled: true, siteKey: 'site-key' });

    fixture.detectChanges();
    await fixture.whenStable();
    await Promise.resolve();

    expect(turnstileService.render).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({
        sitekey: 'site-key',
        action: 'form',
      }),
    );
  });

  it('should emit token and validation updates from callbacks', async () => {
    const tokenSpy = vi.fn();
    const validationSpy = vi.fn();
    turnstileService.render.mockImplementation(
      async (_host: HTMLElement, options: TurnstileRenderOptions) => {
        options.callback('token-123');
        options['expired-callback']();
        options['error-callback']();
        return 'widget-id';
      },
    );
    component.tokenChange.subscribe(tokenSpy);
    component.validationChange.subscribe(validationSpy);
    turnstileEnabled.set(true);
    turnstileConfig.set({ enabled: true, siteKey: 'site-key' });

    fixture.detectChanges();
    await fixture.whenStable();
    await Promise.resolve();

    expect(tokenSpy).toHaveBeenCalledWith('token-123');
    expect(tokenSpy).toHaveBeenCalledWith('');
    expect(validationSpy).toHaveBeenCalledWith(true);
    expect(validationSpy).toHaveBeenCalledWith(false);
  });

  it('should reset and remove rendered widget', async () => {
    turnstileEnabled.set(true);
    turnstileConfig.set({ enabled: true, siteKey: 'site-key' });
    fixture.detectChanges();
    await fixture.whenStable();
    await Promise.resolve();

    component.reset();
    component.ngOnDestroy();

    expect(turnstileService.reset).toHaveBeenCalledWith('widget-id');
    expect(turnstileService.remove).toHaveBeenCalledWith('widget-id');
  });
});
