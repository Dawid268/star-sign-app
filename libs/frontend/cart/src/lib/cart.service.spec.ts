import { TestBed } from '@angular/core/testing';
import { CartService } from './cart.service';
import { Product } from '@star-sign-monorepo/shared-types';

describe('CartService', () => {
  let service: CartService;

  const mockProduct: Product = {
    documentId: 'p1',
    name: 'Crystal Ball',
    price: 100,
    slug: 'crystal-ball',
  } as any;

  const mockProduct2: Product = {
    documentId: 'p2',
    name: 'Tarot Deck',
    price: 50,
    slug: 'tarot-deck',
  } as any;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CartService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should add item to cart', () => {
    service.addToCart(mockProduct);
    expect(service.count()).toBe(1);
    expect(service.total()).toBe(100);
    expect(service.items()[0].product.name).toBe('Crystal Ball');
  });

  it('should increment quantity if same item added and keep other items unchanged', () => {
    service.addToCart(mockProduct);
    service.addToCart(mockProduct2);
    service.addToCart(mockProduct, 2);
    expect(service.count()).toBe(4);
    expect(service.items().length).toBe(2);
    expect(service.total()).toBe(350); // (1*100 + 2*100) + (1*50) = 350

    const p1Item = service.items().find((i) => i.product.documentId === 'p1');
    const p2Item = service.items().find((i) => i.product.documentId === 'p2');
    expect(p1Item?.quantity).toBe(3);
    expect(p2Item?.quantity).toBe(1);
  });

  it('should remove item from cart', () => {
    service.addToCart(mockProduct);
    service.addToCart(mockProduct2);
    expect(service.items().length).toBe(2);
    service.removeFromCart('p1');
    expect(service.items().length).toBe(1);
    expect(service.items()[0].product.documentId).toBe('p2');
  });

  it('should update quantity', () => {
    service.addToCart(mockProduct);
    service.updateQuantity('p1', 5);
    expect(service.count()).toBe(5);
  });

  it('should remove item if quantity updated to 0', () => {
    service.addToCart(mockProduct);
    service.updateQuantity('p1', 0);
    expect(service.items().length).toBe(0);
  });

  it('should clear cart', () => {
    service.addToCart(mockProduct);
    service.clearCart();
    expect(service.items().length).toBe(0);
  });
});
