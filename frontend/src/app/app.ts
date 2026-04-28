import { Component, ChangeDetectionStrategy, inject, signal, viewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './core/components/navbar/navbar';
import { Footer } from './core/components/footer/footer';
import { CartComponent } from '@org/cart';
import { CartItem } from '@star-sign-monorepo/shared-types';
import { CheckoutService } from './core/services/checkout.service';
import { featureFlags } from './core/feature-flags';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, Footer, CartComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App {
  private readonly checkoutService = inject(CheckoutService);
  protected readonly title = signal('Star Sign');
  public readonly shopEnabled = featureFlags.shopEnabled;
  public readonly cart = viewChild<CartComponent>(CartComponent);
  public readonly checkoutInProgress = signal(false);

  public openCart(): void {
    if (!this.shopEnabled) {
      return;
    }

    this.cart()?.toggle();
  }

  public startCheckout(items: CartItem[]): void {
    if (!this.shopEnabled || !items.length || this.checkoutInProgress()) {
      return;
    }

    this.checkoutInProgress.set(true);
    this.checkoutService
      .createSession({
        items: items.map((item) => ({
          productDocumentId: item.product.documentId,
          quantity: item.quantity,
        })),
      })
      .subscribe({
        next: (response) => {
          window.location.assign(response.checkoutUrl);
        },
        error: (error) => {
          console.error('Nie udało się zainicjalizować płatności.', error);
          this.checkoutInProgress.set(false);
        },
      });
  }
}
