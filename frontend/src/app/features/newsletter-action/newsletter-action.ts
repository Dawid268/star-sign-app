import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { take } from 'rxjs';
import { NewsletterService } from '../../core/services/newsletter.service';

type NewsletterAction = 'confirm' | 'unsubscribe';
type Status = 'loading' | 'success' | 'error';

@Component({
  selector: 'app-newsletter-action',
  imports: [RouterLink],
  template: `
    <main class="bg-[#FFFBFB] min-h-screen pt-16 pb-24">
      <section class="section-container max-w-2xl text-center">
        <p class="text-mystic-gold text-5xl mb-8">{{ icon() }}</p>
        <h1 class="serif-display text-4xl md:text-5xl text-mystic-cocoa mb-6">
          {{ title() }}
        </h1>
        <p class="text-mystic-cocoa leading-relaxed mb-10">
          {{ message() }}
        </p>
        <div
          class="flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <a routerLink="/" class="btn-primary inline-flex"
            >Wróć na stronę główną</a
          >
          @if (status() === 'error') {
            <a
              routerLink="/"
              fragment="newsletter"
              class="btn-outline inline-flex"
              >Zapisz się ponownie</a
            >
          }
        </div>
      </section>
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsletterActionPage {
  private readonly route = inject(ActivatedRoute);
  private readonly newsletterService = inject(NewsletterService);
  private readonly action =
    (this.route.snapshot.data['action'] as NewsletterAction) || 'confirm';

  public readonly status = signal<Status>('loading');

  public constructor() {
    this.route.queryParamMap.pipe(take(1)).subscribe((params) => {
      const token = params.get('token')?.trim();
      if (!token) {
        this.status.set('error');
        return;
      }

      const request =
        this.action === 'unsubscribe'
          ? this.newsletterService.unsubscribe(token)
          : this.newsletterService.confirm(token);

      request.subscribe({
        next: () => this.status.set('success'),
        error: () => this.status.set('error'),
      });
    });
  }

  public title(): string {
    if (this.status() === 'loading') {
      return 'Przetwarzamy link';
    }
    if (this.status() === 'error') {
      return 'Link jest nieaktywny';
    }
    return this.action === 'unsubscribe'
      ? 'Wypisano z newslettera'
      : 'Newsletter potwierdzony';
  }

  public message(): string {
    if (this.status() === 'loading') {
      return 'To potrwa tylko chwilę.';
    }
    if (this.status() === 'error') {
      return 'Token mógł wygasnąć albo został już użyty. Możesz ponownie zapisać się przez formularz newslettera.';
    }
    return this.action === 'unsubscribe'
      ? 'Twój adres został oznaczony jako wypisany z newslettera Star Sign.'
      : 'Dziękujemy. Od teraz możesz otrzymywać wiadomości Star Sign zgodnie z wyrażoną zgodą.';
  }

  public icon(): string {
    if (this.status() === 'loading') {
      return '✧';
    }
    if (this.status() === 'error') {
      return '!';
    }
    return this.action === 'unsubscribe' ? '✓' : '✦';
  }
}
