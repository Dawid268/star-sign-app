import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProductDetail } from './product-detail';
import { ProductService } from '../../core/services/product.service';
import { ActivatedRoute } from '@angular/router';
import { CartService } from '@org/cart';
import { of } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';
import { vi } from 'vitest';
import { AnalyticsService } from '../../core/services/analytics.service';

describe('ProductDetail', () => {
  let component: ProductDetail;
  let fixture: ComponentFixture<ProductDetail>;
  let productService: any;
  let cartService: any;
  let analyticsService: any;

  beforeEach(async () => {
    productService = {
      getProductById: vi.fn().mockReturnValue(
        of({
          name: 'Test Product',
          price: 10,
          documentId: '1',
          description: 'desc',
          category: 'cat',
        }),
      ),
      getProducts: vi.fn().mockReturnValue(of([])),
    };
    cartService = {
      addToCart: vi.fn(),
    };
    analyticsService = {
      trackViewItem: vi.fn(),
      trackAddToCart: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ProductDetail, RouterTestingModule],
      providers: [
        { provide: ProductService, useValue: productService },
        { provide: CartService, useValue: cartService },
        { provide: AnalyticsService, useValue: analyticsService },
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ id: '1' }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load product', () => {
    expect(component).toBeTruthy();
    expect(productService.getProductById).toHaveBeenCalledWith('1');
    expect(component.product()?.name).toBe('Test Product');
    expect(analyticsService.trackViewItem).toHaveBeenCalledWith(
      component.product(),
    );
  });

  it('should add to cart', () => {
    component.addToCart();
    expect(cartService.addToCart).toHaveBeenCalled();
    expect(analyticsService.trackAddToCart).toHaveBeenCalledWith(
      component.product(),
      1,
    );
  });
});
