import {
  Component,
  ChangeDetectionStrategy,
  computed,
  signal,
  inject,
  OnInit,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '@org/cart';
import { Product } from '@star-sign-monorepo/shared-types';
import { ProductService } from '../../core/services/product.service';
import { NewsletterService } from '../../core/services/newsletter.service';
import { RuntimeConfigService } from '../../core/services/runtime-config.service';
import { TurnstileWidget } from '../../shared/components/turnstile/turnstile-widget';
import { AnalyticsService } from '../../core/services/analytics.service';

@Component({
  selector: 'app-shop-home',
  imports: [RouterLink, TurnstileWidget],
  templateUrl: './shop-home.html',
  styleUrl: './shop-home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShopHome implements OnInit {
  private readonly cartService: CartService = inject(CartService);
  private readonly productService = inject(ProductService);
  private readonly newsletterService = inject(NewsletterService);
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private readonly analyticsService = inject(AnalyticsService);
  private readonly newsletterTurnstileWidget = viewChild(TurnstileWidget);

  public readonly categories = signal(['Wszystko']);
  public readonly activeCategory = signal('Wszystko');
  public readonly products = signal<Product[]>([]);
  public readonly isLoading = signal(false);
  public readonly newsletterLoading = signal(false);
  public readonly newsletterSent = signal(false);
  public readonly newsletterError = signal<string | null>(null);
  public readonly newsletterTurnstileToken = signal('');
  public readonly newsletterTurnstileRequired = computed(() =>
    this.runtimeConfig.turnstileEnabled(),
  );

  ngOnInit() {
    this.loadProducts();
  }

  private loadProducts() {
    this.isLoading.set(true);
    this.productService.getProducts().subscribe({
      next: (products) => {
        this.products.set(products);
        const uniqueCategories = Array.from(
          new Set(
            products
              .map((product) => product.category)
              .filter((category): category is string => Boolean(category)),
          ),
        );
        this.categories.set(['Wszystko', ...uniqueCategories]);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  public get filteredProducts(): Product[] {
    const cat = this.activeCategory();
    return cat === 'Wszystko'
      ? this.products()
      : this.products().filter((p) => p.category === cat);
  }

  public setCategory(category: string): void {
    this.activeCategory.set(category);
  }

  public addToCart(product: Product, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.cartService.addToCart(product);
    this.analyticsService.trackAddToCart(product);
  }

  public onNewsletterSubmit(event: Event, emailInput: HTMLInputElement): void {
    event.preventDefault();
    if (this.newsletterLoading()) {
      return;
    }

    const email = emailInput.value.trim();
    if (!email) {
      this.newsletterError.set('Podaj adres e-mail.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.newsletterError.set('Podaj poprawny adres e-mail.');
      return;
    }

    if (
      this.newsletterTurnstileRequired() &&
      !this.newsletterTurnstileToken()
    ) {
      this.newsletterError.set('Potwierdź, że nie jesteś botem.');
      return;
    }

    this.newsletterLoading.set(true);
    this.newsletterError.set(null);

    this.newsletterService
      .subscribe({
        email,
        marketingConsent: true,
        source: 'shop-newsletter',
        turnstileToken: this.newsletterTurnstileToken() || undefined,
      })
      .subscribe({
        next: () => {
          this.newsletterSent.set(true);
          this.newsletterLoading.set(false);
          emailInput.value = '';
          this.resetNewsletterTurnstile();
        },
        error: () => {
          this.newsletterError.set('Nie udało się zapisać. Spróbuj ponownie.');
          this.newsletterLoading.set(false);
          this.resetNewsletterTurnstile();
        },
      });
  }

  public handleNewsletterTurnstileToken(token: string): void {
    this.newsletterTurnstileToken.set(token);
  }

  private resetNewsletterTurnstile(): void {
    this.newsletterTurnstileToken.set('');
    this.newsletterTurnstileWidget()?.reset();
  }
}
