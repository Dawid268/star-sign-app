import { Component, ChangeDetectionStrategy, inject, signal, OnInit } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { DOCUMENT } from '@angular/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroChevronLeft, heroShoppingBag, heroStar, heroShieldCheck, heroTruck } from '@ng-icons/heroicons/outline';

import { CartService } from '@org/cart';
import { Product } from '@star-sign-monorepo/shared-types';
import { ProductService } from '../../core/services/product.service';
import { SeoService } from '../../core/services/seo.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-product-detail',
  imports: [RouterLink, NgIcon],
  viewProviders: [provideIcons({ heroChevronLeft, heroShoppingBag, heroStar, heroShieldCheck, heroTruck })],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductDetail implements OnInit {
  private readonly cartService: CartService = inject(CartService);
  private readonly route = inject(ActivatedRoute);
  private readonly productService = inject(ProductService);
  private readonly seoService = inject(SeoService);
  private readonly document = inject(DOCUMENT);

  public readonly quantity = signal(1);
  public readonly product = signal<Product | null>(null);
  public readonly relatedProducts = signal<Product[]>([]);
  public readonly isLoading = signal(true);

  ngOnInit() {
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.loadProduct(id);
      }
    });
  }

  private loadProduct(id: string) {
    this.isLoading.set(true);
    this.productService.getProductById(id).subscribe({
      next: (product) => {
        this.product.set(product);
        const canonicalUrl = `${this.getSiteUrl()}/sklep/produkt/${product.documentId}`;
        this.seoService.updateSeo(product.name, product.description || 'Magiczny artefakt ze sklepu Star Sign.', {
          canonicalUrl,
          jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: product.name,
            description: product.description,
            sku: product.sku || product.documentId,
            offers: {
              '@type': 'Offer',
              priceCurrency: product.currency || 'PLN',
              price: product.price,
              availability:
                product.stock_status === 'out_of_stock'
                  ? 'https://schema.org/OutOfStock'
                  : 'https://schema.org/InStock',
              url: canonicalUrl,
            },
          },
        });
        this.loadRelatedProducts(product.category, product.documentId);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  public increment(): void {
    this.quantity.update(q => q + 1);
  }

  public decrement(): void {
    if (this.quantity() > 1) {
      this.quantity.update(q => q - 1);
    }
  }

  public addToCart(): void {
    const p = this.product();
    if (p) {
      this.cartService.addToCart(p, this.quantity());
    }
  }

  private loadRelatedProducts(category: string | undefined, currentDocumentId: string): void {
    this.productService.getProducts(category).subscribe({
      next: (products) => {
        this.relatedProducts.set(products.filter((item) => item.documentId !== currentDocumentId).slice(0, 4));
      },
      error: () => {
        this.relatedProducts.set([]);
      },
    });
  }

  private getSiteUrl(): string {
    return this.document.location?.origin || environment.siteUrl;
  }
}
