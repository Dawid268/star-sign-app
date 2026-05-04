import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ShopHome } from './shop-home';
import { ProductService } from '../../core/services/product.service';
import { NewsletterService } from '../../core/services/newsletter.service';
import { CartService } from '@org/cart';
import { of, throwError } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';
import { vi } from 'vitest';
import { AnalyticsService } from '../../core/services/analytics.service';

describe('ShopHome', () => {
  let component: ShopHome;
  let fixture: ComponentFixture<ShopHome>;
  let productService: any;
  let newsletterService: any;
  let cartService: any;
  let analyticsService: any;

  const mockProducts = [
    { id: '1', name: 'Product 1', category: 'Category A' },
    { id: '2', name: 'Product 2', category: 'Category B' },
  ];

  beforeEach(async () => {
    productService = {
      getProducts: vi.fn().mockReturnValue(of(mockProducts)),
    };
    newsletterService = {
      subscribe: vi.fn().mockReturnValue(of({})),
    };
    cartService = {
      addToCart: vi.fn(),
    };
    analyticsService = {
      trackAddToCart: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ShopHome, RouterTestingModule],
      providers: [
        { provide: ProductService, useValue: productService },
        { provide: NewsletterService, useValue: newsletterService },
        { provide: CartService, useValue: cartService },
        { provide: AnalyticsService, useValue: analyticsService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ShopHome);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load products and extract categories', () => {
    expect(productService.getProducts).toHaveBeenCalled();
    expect(component.products().length).toBe(2);
    expect(component.categories()).toEqual([
      'Wszystko',
      'Category A',
      'Category B',
    ]);
  });

  it('should filter products', () => {
    component.setCategory('Category A');
    expect(component.filteredProducts.length).toBe(1);
    expect(component.filteredProducts[0].name).toBe('Product 1');
  });

  it('should add to cart', () => {
    const event = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as any;
    component.addToCart(mockProducts[0] as any, event);
    expect(cartService.addToCart).toHaveBeenCalledWith(mockProducts[0]);
    expect(analyticsService.trackAddToCart).toHaveBeenCalledWith(
      mockProducts[0],
    );
  });

  it('should handle newsletter submission', () => {
    const input = { value: 'test@example.com' } as HTMLInputElement;
    const event = { preventDefault: vi.fn() } as any;
    component.onNewsletterSubmit(event, input);
    expect(newsletterService.subscribe).toHaveBeenCalled();
    expect(component.newsletterSent()).toBe(true);
  });
});
