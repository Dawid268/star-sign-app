import { Injectable, signal, computed } from '@angular/core';
import { Product, CartItem } from '@star-sign-monorepo/shared-types';

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private readonly cartItems = signal<CartItem[]>([]);

  public readonly items = this.cartItems.asReadonly();

  public readonly count = computed(() =>
    this.cartItems().reduce((acc, item) => acc + item.quantity, 0),
  );

  public readonly total = computed(() =>
    this.cartItems().reduce(
      (acc, item) => acc + item.product.price * item.quantity,
      0,
    ),
  );

  public addToCart(product: Product, quantity = 1): void {
    this.cartItems.update((items) => {
      const existing = items.find(
        (i) => i.product.documentId === product.documentId,
      );
      if (existing) {
        return items.map((i) =>
          i.product.documentId === product.documentId
            ? { ...i, quantity: i.quantity + quantity }
            : i,
        );
      }
      return [...items, { product, quantity }];
    });
  }

  public removeFromCart(documentId: string): void {
    this.cartItems.update((items) =>
      items.filter((i) => i.product.documentId !== documentId),
    );
  }

  public updateQuantity(documentId: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeFromCart(documentId);
      return;
    }
    this.cartItems.update((items) =>
      items.map((i) =>
        i.product.documentId === documentId ? { ...i, quantity } : i,
      ),
    );
  }

  public clearCart(): void {
    this.cartItems.set([]);
  }
}
