import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CheckoutService } from '../../core/services/checkout.service';
import { AnalyticsService } from '../../core/services/analytics.service';
import { featureFlags } from '../../core/feature-flags';

@Component({
  selector: 'app-checkout-success',
  imports: [RouterLink],
  templateUrl: './checkout-success.html',
  styleUrl: './checkout-success.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutSuccess implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly checkoutService = inject(CheckoutService);
  private readonly analyticsService = inject(AnalyticsService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  public readonly analyticsStatus = signal<
    'idle' | 'pending' | 'sent' | 'skipped'
  >('idle');
  public readonly shopEnabled = featureFlags.shopEnabled;

  public ngOnInit(): void {
    if (!this.isBrowser) {
      return;
    }

    const sessionId = this.route.snapshot.queryParamMap
      .get('session_id')
      ?.trim();
    if (!sessionId || this.wasPurchaseTracked(sessionId)) {
      this.analyticsStatus.set('skipped');
      return;
    }

    this.loadPurchaseSummary(sessionId, 0);
  }

  private loadPurchaseSummary(sessionId: string, attempt: number): void {
    this.analyticsStatus.set('pending');
    this.checkoutService.getAnalyticsSummary(sessionId).subscribe({
      next: (summary) => {
        if (summary.status === 'paid') {
          this.analyticsService.trackPurchase(summary);
          this.markPurchaseTracked(sessionId);
          this.analyticsStatus.set('sent');
          return;
        }

        if (summary.status === 'pending' && attempt < 2) {
          window.setTimeout(
            () => this.loadPurchaseSummary(sessionId, attempt + 1),
            1500,
          );
          return;
        }

        this.analyticsStatus.set('skipped');
      },
      error: () => this.analyticsStatus.set('skipped'),
    });
  }

  private wasPurchaseTracked(sessionId: string): boolean {
    return (
      window.sessionStorage.getItem(this.purchaseStorageKey(sessionId)) ===
      'true'
    );
  }

  private markPurchaseTracked(sessionId: string): void {
    window.sessionStorage.setItem(this.purchaseStorageKey(sessionId), 'true');
  }

  private purchaseStorageKey(sessionId: string): string {
    return `star-sign:ga4:purchase:${sessionId}`;
  }
}
