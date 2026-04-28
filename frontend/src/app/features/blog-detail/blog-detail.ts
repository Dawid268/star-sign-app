import { Component, ChangeDetectionStrategy, inject, effect } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { DatePipe, DOCUMENT } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap, map, of } from 'rxjs';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroChevronLeft, heroClock, heroUser, heroShare } from '@ng-icons/heroicons/outline';

import { ArticleService } from '../../core/services/article.service';
import { SeoService } from '../../core/services/seo.service';
import { Article } from '@star-sign-monorepo/shared-types';
import { environment } from '../../../environments/environment';
import { featureFlags } from '../../core/feature-flags';

@Component({
  selector: 'app-blog-detail',
  imports: [RouterLink, NgIcon, DatePipe],
  viewProviders: [provideIcons({ heroChevronLeft, heroClock, heroUser, heroShare })],
  templateUrl: './blog-detail.html',
  styleUrl: './blog-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BlogDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly articleService = inject(ArticleService);
  private readonly seoService = inject(SeoService);
  private readonly document = inject(DOCUMENT);
  public readonly shopEnabled = featureFlags.shopEnabled;

  public readonly article = toSignal<Article | undefined>(
    this.route.paramMap.pipe(
      map(params => params.get('slug')),
      switchMap(slug => {
        if (!slug) return of(undefined);
        return this.articleService.getArticleBySlug(slug);
      })
    )
  );

  constructor() {
    effect(() => {
      const article = this.article();
      if (article) {
        const canonicalUrl = `${this.getSiteUrl()}/artykuly/${article.slug}`;
        this.seoService.updateSeo(
          article.title,
          article.excerpt || 'Czytaj więcej na blogu Star Sign.',
          {
            canonicalUrl,
            jsonLd: {
              '@context': 'https://schema.org',
              '@type': 'Article',
              headline: article.title,
              description: article.excerpt || '',
              datePublished: article.publishedAt,
              author: article.author ? { '@type': 'Person', name: article.author } : undefined,
              mainEntityOfPage: canonicalUrl,
            },
          }
        );
      }
    });
  }

  private getSiteUrl(): string {
    return this.document.location?.origin || environment.siteUrl;
  }
}
