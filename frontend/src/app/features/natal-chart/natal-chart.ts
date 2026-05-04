import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AstrologyService } from '../../core/services/astrology.service';
import { AccountService } from '../../core/services/account.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { Skeleton } from '../../shared/components/skeleton/skeleton';
import { PremiumPreviewBlock } from '../../shared/components/premium-preview-block/premium-preview-block';

import { AnalyticsService } from '../../core/services/analytics.service';

@Component({
  selector: 'app-natal-chart',
  standalone: true,
  imports: [CommonModule, RouterLink, Skeleton, PremiumPreviewBlock],
  templateUrl: './natal-chart.html',
  styleUrl: './natal-chart.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NatalChartComponent {
  private readonly astrologyService = inject(AstrologyService);
  private readonly accountService = inject(AccountService);
  private readonly analyticsService = inject(AnalyticsService);

  public readonly me = toSignal(this.accountService.getMe(), {
    initialValue: undefined,
  });

  public readonly chart = computed(() => {
    const profile = this.me()?.profile;
    if (profile?.birthDate) {
      return this.astrologyService.calculateNatalChart(
        new Date(profile.birthDate),
        profile.birthTime || null,
        profile.birthPlace || '',
      );
    }
    return null;
  });

  public readonly hasData = computed(() => !!this.chart());
  public readonly isPremium = computed(() =>
    Boolean(this.me()?.subscription?.isPremium),
  );

  constructor() {
    effect(() => {
      if (this.hasData()) {
        this.analyticsService.trackFeatureUse('natal_chart_view');
      }
    });
  }
}
