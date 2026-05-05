import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  ElementRef,
  PLATFORM_ID,
  viewChild,
  effect,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArticleService } from '../../core/services/article.service';
import { Article } from '@star-sign-monorepo/shared-types';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { StrapiImagePipe } from '../../core/pipes/strapi-image-pipe';

import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroMagnifyingGlass, heroXMark } from '@ng-icons/heroicons/outline';
import { SeoService } from '../../core/services/seo.service';

@Component({
  selector: 'app-blog-list',
  imports: [RouterLink, DatePipe, StrapiImagePipe, FormsModule, NgIcon],
  viewProviders: [provideIcons({ heroMagnifyingGlass, heroXMark })],
  templateUrl: './blog-list.html',
  styleUrl: './blog-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlogList {
  private readonly articleService = inject(ArticleService);
  private readonly seoService = inject(SeoService);
  private readonly scrollAnchor = viewChild<ElementRef>('scrollAnchor');
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  public readonly activeCategory = signal('Wszystko');
  public readonly searchQuery = signal('');
  public readonly articles = signal<Article[]>([]);
  public readonly loading = signal(true);
  public readonly loadingMore = signal(false);
  public readonly error = signal<string | null>(null);
  public readonly currentPage = signal(1);
  public readonly hasMore = signal(true);

  public readonly categories = computed(() => {
    // Note: In real app categories should come from a separate API call to show all categories
    // even if they don't have articles on the first page. For now keeping it dynamic from loaded articles.
    const dynamicCategories = this.articles()
      .map((article) => article.category?.name)
      .filter((name): name is string => Boolean(name));
    return ['Wszystko', ...Array.from(new Set(dynamicCategories))];
  });

  public readonly filteredArticles = computed(() => {
    const articles = this.articles();
    const cat = this.activeCategory();

    if (cat === 'Wszystko') {
      return articles;
    }

    return articles.filter((article) => article.category?.name === cat);
  });

  constructor() {
    const canonicalUrl = this.seoService.absoluteUrl('/artykuly');
    this.seoService.updateSeo(
      'Artykuły o astrologii, tarocie i numerologii',
      'Czytaj przewodniki Star Sign o astrologii, znakach zodiaku, tarocie i codziennych rytuałach.',
      {
        canonicalUrl,
        jsonLd: {
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Artykuły Star Sign',
          description:
            'Przewodniki Star Sign o astrologii, znakach zodiaku, tarocie i codziennych rytuałach.',
          url: canonicalUrl,
        },
      },
    );

    // Trigger load when anchor is visible
    effect(() => {
      if (!this.isBrowser || typeof IntersectionObserver === 'undefined') {
        return;
      }

      const anchor = this.scrollAnchor();
      if (!anchor) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (
            entry.isIntersecting &&
            this.hasMore() &&
            !this.loading() &&
            !this.loadingMore()
          ) {
            this.loadMore();
          }
        },
        { threshold: 0.1 },
      );

      observer.observe(anchor.nativeElement);

      return () => observer.disconnect();
    });

    // Reset when category or search changes
    effect(
      () => {
        this.activeCategory();
        this.searchQuery();
        this.resetAndLoad();
      },
      { allowSignalWrites: true },
    );
  }

  private resetAndLoad(): void {
    this.articles.set([]);
    this.currentPage.set(1);
    this.hasMore.set(true);
    this.loading.set(true);
    this.loadPage(1);
  }

  public loadMore(): void {
    if (!this.hasMore() || this.loadingMore()) return;

    this.loadingMore.set(true);
    const nextPage = this.currentPage() + 1;
    this.loadPage(nextPage);
  }

  private loadPage(page: number): void {
    this.articleService
      .getArticles(page, 12, this.activeCategory(), this.searchQuery())
      .subscribe({
        next: (response) => {
          const newArticles = response.data;
          const pagination = response.meta.pagination;

          this.articles.update((prev) => [...prev, ...newArticles]);
          this.currentPage.set(pagination.page);
          this.hasMore.set(pagination.page < pagination.pageCount);
          this.loading.set(false);
          this.loadingMore.set(false);
        },
        error: () => {
          this.error.set('Nie udało się pobrać artykułów.');
          this.loading.set(false);
          this.loadingMore.set(false);
        },
      });
  }

  public setCategory(category: string): void {
    this.activeCategory.set(category);
  }
}
