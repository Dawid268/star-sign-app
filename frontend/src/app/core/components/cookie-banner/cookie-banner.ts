import {
  Component,
  ChangeDetectionStrategy,
  signal,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CookieService } from 'ngx-cookie-service';
import { AnalyticsService } from '../../services/analytics.service';
import { featureFlags } from '../../feature-flags';

export interface CookieConsent {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}

@Component({
  selector: 'app-cookie-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cookie-banner.html',
  styleUrl: './cookie-banner.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CookieBanner implements OnInit {
  private readonly cookieService = inject(CookieService);
  private readonly analyticsService = inject(AnalyticsService);

  public readonly isVisible = signal(false);
  public readonly showSettings = signal(false);
  public readonly adsEnabled = featureFlags.adsEnabled;

  public readonly consent = signal<CookieConsent>({
    necessary: true,
    analytics: false,
    marketing: false,
  });

  ngOnInit() {
    const consentJson = this.cookieService.get('cookie-consent-v2');
    if (!consentJson) {
      setTimeout(() => this.isVisible.set(true), 1500);
    }
  }

  public acceptAll(): void {
    const consent: CookieConsent = {
      necessary: true,
      analytics: true,
      marketing: this.adsEnabled,
    };
    this.saveConsent(consent);
  }

  public acceptSelected(): void {
    this.saveConsent(this.consent());
  }

  public declineAll(): void {
    const consent: CookieConsent = {
      necessary: true,
      analytics: false,
      marketing: false,
    };
    this.saveConsent(consent);
  }

  public toggleSettings(): void {
    this.showSettings.update((v) => !v);
  }

  public updateOption(key: keyof CookieConsent, event: Event): void {
    if (key === 'marketing' && !this.adsEnabled) {
      return;
    }

    const checked = (event.target as HTMLInputElement).checked;
    this.consent.update((prev) => ({ ...prev, [key]: checked }));
  }

  private saveConsent(consent: CookieConsent): void {
    const normalizedConsent: CookieConsent = {
      ...consent,
      marketing: this.adsEnabled && consent.marketing,
    };

    this.cookieService.set(
      'cookie-consent-v2',
      JSON.stringify(normalizedConsent),
      365,
      '/',
    );
    this.isVisible.set(false);

    if (normalizedConsent.analytics) {
      this.analyticsService.onConsentGranted();
    }
  }
}
