import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap, map } from 'rxjs';

import { ZodiacService } from '../../core/services/zodiac.service';
import { ZodiacSign } from '@star-sign-monorepo/shared-types';

@Component({
  selector: 'app-zodiac-profile',
  imports: [RouterLink],
  templateUrl: './zodiac-profile.html',
  styleUrl: './zodiac-profile.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ZodiacProfile {
  private readonly route = inject(ActivatedRoute);
  private readonly zodiacService = inject(ZodiacService);

  /**
   * Reaktywne pobranie znaku zodiaku na podstawie parametru :sign z URL.
   * toSignal obsługuje subskrypcję/anulowanie automatycznie.
   */
  public readonly sign = toSignal<ZodiacSign | undefined>(
    this.route.paramMap.pipe(
      map(params => params.get('sign')),
      switchMap(slug =>
        this.zodiacService.getZodiacSigns().pipe(
          map(signs => signs.find(s => s.slug === slug))
        )
      )
    )
  );

  public readonly horoscopeLinks = [
    { label: 'Dzienny', icon: '☀️', description: 'Sprawdź co przyniesie dzisiejszy dzień.', type: 'dzienny' },
    { label: 'Tygodniowy', icon: '🌙', description: 'Zaplanuj nadchodzące dni z gwiazdami.', type: 'tygodniowy' },
    { label: 'Miesięczny', icon: '✨', description: 'Długoterminowa prognoza astrologiczna.', type: 'miesieczny' },
    { label: 'Roczny', icon: '⭐', description: 'Szeroki obraz roku pod wpływem planet.', type: 'roczny' }
  ];
}
