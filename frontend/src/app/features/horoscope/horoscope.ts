import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { ZodiacService } from '../../core/services/zodiac.service';
import { ZodiacSign } from '@star-sign-monorepo/shared-types';

@Component({
  selector: 'app-horoscope',
  imports: [RouterLink],
  templateUrl: './horoscope.html',
  styleUrl: './horoscope.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Horoscope {
  private readonly zodiacService = inject(ZodiacService);

  public readonly signs = toSignal(this.zodiacService.getZodiacSigns(), {
    initialValue: [] as ZodiacSign[],
  });
}
