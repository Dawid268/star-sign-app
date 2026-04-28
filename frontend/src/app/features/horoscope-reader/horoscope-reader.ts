import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap, map, combineLatest, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroSparkles, heroCalendar, heroArrowLeft } from '@ng-icons/heroicons/outline';

import { ZodiacService } from '../../core/services/zodiac.service';

@Component({
  selector: 'app-horoscope-reader',
  imports: [RouterLink, NgIcon, TitleCasePipe],
  viewProviders: [provideIcons({ heroSparkles, heroCalendar, heroArrowLeft })],
  templateUrl: './horoscope-reader.html',
  styleUrl: './horoscope-reader.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HoroscopeReader {
  private readonly route = inject(ActivatedRoute);
  private readonly zodiacService = inject(ZodiacService);
  public readonly loading = signal(true);
  public readonly error = signal<string | null>(null);

  public readonly data = toSignal(
    combineLatest([
      this.route.paramMap.pipe(map((params) => params.get('type'))),
      this.route.paramMap.pipe(map((params) => params.get('sign'))),
    ]).pipe(
      switchMap(([type, sign]) => {
        this.loading.set(true);
        this.error.set(null);
        if (!type || !sign) {
          this.loading.set(false);
          return of(undefined);
        }
        return this.zodiacService.getHoroscope(type, sign).pipe(
          map((horoscope) => ({ horoscope, type, sign })),
          catchError(() => {
            this.error.set('Nie udało się pobrać tego horoskopu.');
            return of(undefined);
          }),
          finalize(() => this.loading.set(false))
        );
      })
    )
  );

  public getTypeLabel(type: string | undefined): string {
    if (!type) {
      return 'Astrologiczny';
    }
    switch (type) {
      case 'dzienny':
        return 'Dzienny';
      case 'tygodniowy':
        return 'Tygodniowy';
      case 'miesieczny':
        return 'Miesięczny';
      case 'roczny':
        return 'Roczny';
      default:
        return 'Astrologiczny';
    }
  }
}
