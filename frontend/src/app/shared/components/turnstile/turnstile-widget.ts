import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';

import { RuntimeConfigService } from '../../../core/services/runtime-config.service';
import { TurnstileService } from '../../../core/services/turnstile.service';

@Component({
  selector: 'app-turnstile-widget',
  standalone: true,
  template: `
    @if (enabled()) {
      <div class="turnstile-shell" [attr.data-action]="action()">
        <div #container></div>
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .turnstile-shell {
        display: flex;
        min-height: 70px;
        justify-content: center;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TurnstileWidget implements OnDestroy {
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private readonly turnstileService = inject(TurnstileService);
  private readonly container = viewChild<ElementRef<HTMLElement>>('container');

  private widgetId?: string;
  private rendering = false;
  private renderedSiteKey = '';

  public readonly action = input('form');
  public readonly tokenChange = output<string>();
  public readonly validationChange = output<boolean>();
  public readonly enabled = computed(() =>
    this.runtimeConfig.turnstileEnabled(),
  );

  constructor() {
    effect(() => {
      const host = this.container()?.nativeElement;
      const turnstile = this.runtimeConfig.turnstile();

      if (!turnstile.enabled || !turnstile.siteKey || !host) {
        this.validationChange.emit(!turnstile.enabled);
        return;
      }

      queueMicrotask(() => void this.render(host, turnstile.siteKey));
    });
  }

  public reset(): void {
    if (this.widgetId) {
      this.turnstileService.reset(this.widgetId);
    }

    this.tokenChange.emit('');
    this.validationChange.emit(!this.enabled());
  }

  public ngOnDestroy(): void {
    this.turnstileService.remove(this.widgetId);
  }

  private async render(host: HTMLElement, siteKey: string): Promise<void> {
    if (this.rendering || (this.widgetId && this.renderedSiteKey === siteKey)) {
      return;
    }

    if (this.widgetId) {
      this.turnstileService.remove(this.widgetId);
      this.widgetId = undefined;
    }

    this.rendering = true;

    try {
      this.widgetId = await this.turnstileService.render(host, {
        sitekey: siteKey,
        action: this.action(),
        theme: 'auto',
        callback: (token) => {
          this.tokenChange.emit(token);
          this.validationChange.emit(true);
        },
        'error-callback': () => {
          this.tokenChange.emit('');
          this.validationChange.emit(false);
        },
        'expired-callback': () => {
          this.tokenChange.emit('');
          this.validationChange.emit(false);
        },
      });
      this.renderedSiteKey = siteKey;
    } catch {
      this.tokenChange.emit('');
      this.validationChange.emit(false);
    } finally {
      this.rendering = false;
    }
  }
}
