import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap, map, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

import { ZodiacService } from '../../core/services/zodiac.service';
import { SeoService } from '../../core/services/seo.service';
import { ZodiacSign } from '@star-sign-monorepo/shared-types';
import { effect } from '@angular/core';
import { StrapiImagePipe } from '../../core/pipes/strapi-image-pipe';
import { StrapiSrcsetPipe } from '../../core/pipes/strapi-srcset-pipe';
import { SocialShare } from '../../shared/components/social-share';

@Component({
  selector: 'app-zodiac-profile',
  imports: [RouterLink, StrapiImagePipe, StrapiSrcsetPipe, SocialShare],
  templateUrl: './zodiac-profile.html',
  styleUrl: './zodiac-profile.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ZodiacProfile {
  private readonly route = inject(ActivatedRoute);
  private readonly zodiacService = inject(ZodiacService);
  private readonly seoService = inject(SeoService);

  public readonly isLoading = signal(true);
  public readonly error = signal<string | null>(null);

  constructor() {
    effect(() => {
      const sign = this.sign();
      if (sign) {
        const title = `Znak zodiaku ${sign.name} — Cechy, Charakter i Horoskop`;
        const description = `Poznaj tajemnice znaku zodiaku ${sign.name}. Sprawdź cechy charakteru, żywioł i dopasowanie. Dowiedz się, co gwiazdy mówią o Tobie.`;

        this.seoService.updateSeo(title, description, {
          canonicalUrl: this.seoService.absoluteUrl(`/znaki/${sign.slug}`),
          jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'ProfilePage',
            name: title,
            description: description,
            mainEntity: {
              '@type': 'Thing',
              name: sign.name,
              description: sign.description || description,
            },
          },
        });
      }
    });
  }

  public getSiteUrl(): string {
    return this.seoService.absoluteUrl('/').replace(/\/$/, '');
  }

  public readonly sign = toSignal<ZodiacSign | undefined>(
    this.route.paramMap.pipe(
      map((params) => params.get('sign')),
      switchMap((slug) => {
        this.isLoading.set(true);
        this.error.set(null);
        return this.zodiacService.getZodiacSigns().pipe(
          map((signs) => {
            const found = signs.find((s) => s.slug === slug);
            if (!found && slug) {
              this.error.set(
                `Znak o uproszczonej nazwie "${slug}" nie został znaleziony.`,
              );
            }
            return found;
          }),
          catchError((err) => {
            this.error.set(
              'Wystąpił problem podczas pobierania danych z gwiazd.',
            );
            return of(undefined);
          }),
          finalize(() => this.isLoading.set(false)),
        );
      }),
    ),
    { initialValue: undefined },
  );

  public readonly horoscopeLinks = [
    {
      label: 'Dzienny',
      icon: '☀️',
      description: 'Sprawdź co przyniesie dzisiejszy dzień.',
      type: 'dzienny',
    },
    {
      label: 'Tygodniowy',
      icon: '🌙',
      description: 'Zaplanuj nadchodzące dni z gwiazdami.',
      type: 'tygodniowy',
    },
    {
      label: 'Miesięczny',
      icon: '✨',
      description: 'Długoterminowa prognoza astrologiczna.',
      type: 'miesieczny',
    },
    {
      label: 'Roczny',
      icon: '⭐',
      description: 'Szeroki obraz roku pod wpływem planet.',
      type: 'roczny',
    },
  ];
}
