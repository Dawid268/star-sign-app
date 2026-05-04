import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { catchError, finalize, map, switchMap } from 'rxjs/operators';
import { ZodiacSign } from '@star-sign-monorepo/shared-types';

import { ZodiacService } from '../../core/services/zodiac.service';
import { SeoService } from '../../core/services/seo.service';
import { findSpecialHoroscopeType } from '../../core/horoscope-type-definitions';

@Component({
  selector: 'app-horoscope-type',
  imports: [RouterLink],
  templateUrl: './horoscope-type.html',
  styleUrl: './horoscope-type.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HoroscopeType {
  private readonly route = inject(ActivatedRoute);
  private readonly zodiacService = inject(ZodiacService);
  private readonly seoService = inject(SeoService);

  public readonly loading = signal(false);
  public readonly error = signal<string | null>(null);

  public readonly typeSlug = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('type'))),
    { initialValue: null },
  );
  public readonly typeDefinition = computed(() =>
    findSpecialHoroscopeType(this.typeSlug()),
  );

  public readonly signs = toSignal(
    toObservable(this.typeDefinition).pipe(
      switchMap((type) => {
        if (!type) {
          this.loading.set(false);
          return of([] as ZodiacSign[]);
        }

        this.loading.set(true);
        this.error.set(null);

        return this.zodiacService.getZodiacSigns().pipe(
          catchError(() => {
            this.error.set('Nie udało się pobrać znaków zodiaku.');
            return of([] as ZodiacSign[]);
          }),
          finalize(() => this.loading.set(false)),
        );
      }),
    ),
    { initialValue: [] as ZodiacSign[] },
  );

  constructor() {
    effect(() => {
      const type = this.typeDefinition();

      if (type) {
        this.seoService.updateSeo(
          `${type.title} | Star Sign`,
          `${type.description} Wybierz swój znak i przeczytaj dzienną interpretację.`,
        );
        return;
      }

      if (this.typeSlug()) {
        this.seoService.updateSeo(
          'Nie znaleziono horoskopu | Star Sign',
          'Ten typ horoskopu nie jest dostępny.',
        );
      }
    });
  }
}
