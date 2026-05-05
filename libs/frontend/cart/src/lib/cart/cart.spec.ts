import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CartComponent } from './cart';
import { CartService } from '../cart.service';
import { signal } from '@angular/core';
import { vi } from 'vitest';

describe('Cart', () => {
  let component: CartComponent;
  let fixture: ComponentFixture<CartComponent>;
  let cartService: any;

  beforeEach(async () => {
    cartService = {
      items: signal([]),
      total: signal(0),
      count: signal(0),
      updateQuantity: vi.fn(),
      removeFromCart: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [CartComponent],
      providers: [{ provide: CartService, useValue: cartService }],
    }).compileComponents();

    fixture = TestBed.createComponent(CartComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle visibility', () => {
    expect(component.isOpen()).toBe(false);
    component.toggle();
    expect(component.isOpen()).toBe(true);
  });

  it('should call service increment', () => {
    component.increment('p1', 2);
    expect(cartService.updateQuantity).toHaveBeenCalledWith('p1', 3);
  });

  it('should call service decrement', () => {
    component.decrement('p1', 2);
    expect(cartService.updateQuantity).toHaveBeenCalledWith('p1', 1);
  });

  it('should call service remove', () => {
    component.remove('p1');
    expect(cartService.removeFromCart).toHaveBeenCalledWith('p1');
  });

  it('should emit checkoutRequested', () => {
    const emitSpy = vi.spyOn(component.checkoutRequested, 'emit');
    cartService.items.set([{ product: { name: 'P' }, quantity: 1 }]);
    component.checkout();
    expect(emitSpy).toHaveBeenCalled();
  });

  it('should toggle when clicking backdrop', () => {
    component.isOpen.set(true);
    fixture.detectChanges();
    const backdrop = fixture.nativeElement.querySelector(
      'button[aria-label="Zamknij koszyk"]',
    );
    backdrop.click();
    expect(component.isOpen()).toBe(false);
  });

  it('should show empty state when no items', () => {
    cartService.items.set([]);
    cartService.count.set(0);
    component.isOpen.set(true); // Open it to see the content
    fixture.detectChanges();
    const emptyMsg = Array.from(
      fixture.nativeElement.querySelectorAll('.serif-display'),
    ).find((el: any) => el.textContent.includes('Koszyk jest pusty'));
    expect(emptyMsg).toBeTruthy();
  });
});
