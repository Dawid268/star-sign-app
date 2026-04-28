import { Component, ChangeDetectionStrategy, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartService } from '../cart.service';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroXMark, heroTrash, heroPlus, heroMinus, heroShoppingBag } from '@ng-icons/heroicons/outline';
import { CartItem } from '@star-sign-monorepo/shared-types';

@Component({
  selector: 'lib-cart',
  standalone: true,
  imports: [CommonModule, NgIcon],
  viewProviders: [provideIcons({ heroXMark, heroTrash, heroPlus, heroMinus, heroShoppingBag })],
  templateUrl: './cart.html',
  styleUrl: './cart.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CartComponent {
  public readonly checkoutRequested = output<CartItem[]>();
  private readonly cartService = inject(CartService);
  
  public readonly isOpen = signal(false);
  public readonly items = this.cartService.items;
  public readonly total = this.cartService.total;
  public readonly count = this.cartService.count;

  public toggle(): void {
    this.isOpen.update(open => !open);
  }

  public increment(documentId: string, current: number): void {
    this.cartService.updateQuantity(documentId, current + 1);
  }

  public decrement(documentId: string, current: number): void {
    this.cartService.updateQuantity(documentId, current - 1);
  }

  public remove(documentId: string): void {
    this.cartService.removeFromCart(documentId);
  }

  public checkout(): void {
    this.checkoutRequested.emit(this.items());
  }
}
