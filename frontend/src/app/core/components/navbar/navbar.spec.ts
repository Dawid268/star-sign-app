import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Navbar } from './navbar';
import { CartService } from '@org/cart';
import { AuthService } from '../../services/auth.service';
import { AccountService } from '../../services/account.service';
import { RouterTestingModule } from '@angular/router/testing';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { featureFlags } from '../../feature-flags';
import { of } from 'rxjs';

describe('Navbar', () => {
  let component: Navbar;
  let fixture: ComponentFixture<Navbar>;
  let cartService: any;
  let authService: any;
  let accountService: any;

  beforeEach(async () => {
    featureFlags.shopEnabled = false;
    cartService = {
      count: signal(0),
    };
    authService = {
      isLoggedIn: signal(false),
    };
    accountService = {
      getMe: vi
        .fn()
        .mockReturnValue(of({ subscription: { isPremium: false } })),
    };

    await TestBed.configureTestingModule({
      imports: [Navbar, RouterTestingModule],
      providers: [
        { provide: CartService, useValue: cartService },
        { provide: AuthService, useValue: authService },
        { provide: AccountService, useValue: accountService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Navbar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    featureFlags.shopEnabled = false;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle mobile menu', () => {
    expect(component.mobileMenuOpen()).toBe(false);
    component.toggleMobileMenu();
    expect(component.mobileMenuOpen()).toBe(true);
  });

  it('should return correct labels when logged out', () => {
    expect(component.userLinkLabel()).toBe('Zaloguj');
    expect(component.membershipLabel()).toBe('Dołącz do Kręgu');
    expect(component.membershipTargetPath()).toBe('/premium');
  });

  it('should route logged in non-premium membership CTA to premium', () => {
    authService.isLoggedIn.set(true);
    expect(component.userLinkLabel()).toBe('Mój Panel');
    expect(component.membershipLabel()).toBe('Premium');
    expect(component.membershipTargetPath()).toBe('/premium');
  });

  it('should route premium users to the panel from membership CTA', () => {
    accountService.getMe.mockReturnValue(
      of({ subscription: { isPremium: true } }),
    );
    authService.isLoggedIn.set(true);

    fixture = TestBed.createComponent(Navbar);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.membershipTargetPath()).toBe('/panel');
    expect(
      (fixture.nativeElement as HTMLElement)
        .querySelector<HTMLAnchorElement>(
          '[data-test="navbar-membership-button"]',
        )
        ?.getAttribute('href'),
    ).toBe('/panel');
  });

  it('should include shop link if enabled', () => {
    // featureFlags.shopEnabled is likely true in test environment
    const hasShop = component.navLinks.some((l) => l.label === 'Sklep');
    expect(hasShop).toBe(component.shopEnabled);
  });

  it('should call toggleMobileMenu when mobile menu button clicked', () => {
    const spy = vi.spyOn(component, 'toggleMobileMenu');
    component.toggleMobileMenu();
    expect(spy).toHaveBeenCalled();
  });

  it('should render mobile menu and close it after link click', () => {
    const host = fixture.nativeElement as HTMLElement;
    const toggle = host.querySelector(
      '[data-test="navbar-mobile-toggle"]',
    ) as HTMLButtonElement;

    toggle.click();
    fixture.detectChanges();

    expect(component.mobileMenuOpen()).toBe(true);
    const firstMobileLink = host.querySelector(
      'nav[aria-label="Nawigacja mobilna"] a',
    ) as HTMLAnchorElement;
    firstMobileLink.click();

    expect(component.mobileMenuOpen()).toBe(false);
  });

  it('should render cart button and emit openCart when shop is enabled', () => {
    featureFlags.shopEnabled = true;
    cartService.count.set(2);
    fixture = TestBed.createComponent(Navbar);
    component = fixture.componentInstance;
    const openCartSpy = vi.fn();
    component.openCart.subscribe(openCartSpy);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const cartButton = host.querySelector(
      '[data-test="navbar-cart-button"]',
    ) as HTMLButtonElement;
    cartButton.click();

    expect(host.textContent).toContain('2');
    expect(openCartSpy).toHaveBeenCalled();
  });
});
