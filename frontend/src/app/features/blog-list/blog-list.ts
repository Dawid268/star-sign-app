import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

import { ArticleService } from '../../core/services/article.service';
import { Article } from '@star-sign-monorepo/shared-types';

import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-blog-list',
  imports: [RouterLink, DatePipe],
  templateUrl: './blog-list.html',
  styleUrl: './blog-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlogList {
  private readonly articleService = inject(ArticleService);

  public readonly activeCategory = signal('Wszystko');
  public readonly loading = signal(true);
  public readonly error = signal<string | null>(null);

  public readonly articles = toSignal(
    this.articleService.getRecentArticles(20).pipe(
      catchError(() => {
        this.error.set('Nie udało się pobrać artykułów.');
        return of([] as Article[]);
      }),
      finalize(() => this.loading.set(false))
    ),
    {
      initialValue: [] as Article[],
    }
  );

  public readonly categories = computed(() => {
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

  public setCategory(category: string): void {
    this.activeCategory.set(category);
  }
}
