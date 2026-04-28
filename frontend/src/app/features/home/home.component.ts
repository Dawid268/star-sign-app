import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { simpleInstagram, simpleTiktok, simplePinterest } from '@ng-icons/simple-icons';

import { ZodiacService } from '../../core/services/zodiac.service';
import { ArticleService } from '../../core/services/article.service';
import { SeoService } from '../../core/services/seo.service';
import { NewsletterService } from '../../core/services/newsletter.service';
import { ZodiacSign } from '@star-sign-monorepo/shared-types';
import { Article } from '@star-sign-monorepo/shared-types';
import { ProductService } from '../../core/services/product.service';
import { Product } from '@star-sign-monorepo/shared-types';
import { featureFlags } from '../../core/feature-flags';

@Component({
  selector: 'app-home',
  imports: [RouterLink, NgIcon],
  viewProviders: [provideIcons({ simpleInstagram, simpleTiktok, simplePinterest })],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  private readonly zodiacService = inject(ZodiacService);
  private readonly articleService = inject(ArticleService);
  private readonly seoService = inject(SeoService);
  private readonly productService = inject(ProductService);
  private readonly newsletterService = inject(NewsletterService);

  constructor() {
    this.seoService.updateSeo(
      'Twoja Droga Przez Gwiazdy',
      'Odkryj magię astrologii, horoskopy, tarot i unikalne talizmany w Star Sign.'
    );
  }

  public readonly signsLoading = signal(true);
  public readonly signsError = signal<string | null>(null);
  public readonly articlesLoading = signal(true);
  public readonly articlesError = signal<string | null>(null);
  public readonly shopItemsLoading = signal(featureFlags.shopEnabled);
  public readonly shopItemsError = signal<string | null>(null);

  public readonly signs = toSignal(
    this.zodiacService.getZodiacSigns().pipe(
      catchError(() => {
        this.signsError.set('Nie udało się pobrać znaków zodiaku.');
        return of([] as ZodiacSign[]);
      }),
      finalize(() => this.signsLoading.set(false))
    ),
    { initialValue: [] as ZodiacSign[] }
  );
  public readonly articles = toSignal(
    this.articleService.getRecentArticles(3).pipe(
      catchError(() => {
        this.articlesError.set('Nie udało się pobrać najnowszych artykułów.');
        return of([] as Article[]);
      }),
      finalize(() => this.articlesLoading.set(false))
    ),
    { initialValue: [] as Article[] }
  );
  public readonly shopEnabled = featureFlags.shopEnabled;
  public readonly shopItems = toSignal(
    this.shopEnabled
      ? this.productService.getProducts().pipe(
          map((products) => products.slice(0, 3)),
          catchError(() => {
            this.shopItemsError.set('Nie udało się pobrać produktów.');
            return of([] as Product[]);
          }),
          finalize(() => this.shopItemsLoading.set(false))
        )
      : of([] as Product[]),
    { initialValue: [] as Product[] }
  );

  public readonly newsletterSent = signal(false);
  public readonly newsletterError = signal<string | null>(null);
  public readonly newsletterLoading = signal(false);

  public onSubmitNewsletter(event: Event, emailInput: HTMLInputElement): void {
    event.preventDefault();
    if (this.newsletterLoading()) {
      return;
    }

    const email = emailInput.value.trim();
    if (!email) {
      this.newsletterError.set('Podaj adres e-mail.');
      return;
    }

    this.newsletterLoading.set(true);
    this.newsletterError.set(null);

    this.newsletterService
      .subscribe({
        email,
        marketingConsent: true,
        source: 'home-newsletter',
      })
      .subscribe({
        next: () => {
          this.newsletterSent.set(true);
          this.newsletterLoading.set(false);
          emailInput.value = '';
        },
        error: () => {
          this.newsletterError.set('Nie udało się zapisać. Spróbuj ponownie za chwilę.');
          this.newsletterLoading.set(false);
        },
      });
  }

  public readonly horoscopeTypes = [
    {
      icon: '☯',
      title: 'Horoskop Chiński',
      description: 'Odkryj mądrość Wschodu opartą na dwunastu zwierzętach chińskiego zodiaku.',
    },
    {
      icon: '☘',
      title: 'Horoskop Celtycki',
      description: 'Poznaj swój celtycki odpowiednik oparty na horoskopie drzew i naturze.',
    },
    {
      icon: '☥',
      title: 'Horoskop Egipski',
      description: 'Starożytne bóstwa Egiptu i ich wpływ na Twoją ścieżkę życiową.',
    },
  ];

  public readonly socials = [
    { label: 'Instagram', icon: 'simpleInstagram', href: '#' },
    { label: 'TikTok', icon: 'simpleTiktok', href: '#' },
    { label: 'Pinterest', icon: 'simplePinterest', href: '#' },
  ];
}
