import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CheckoutCancel } from './checkout-cancel';
import { RouterTestingModule } from '@angular/router/testing';
import { featureFlags } from '../../core/feature-flags';

describe('CheckoutCancel', () => {
  let component: CheckoutCancel;
  let fixture: ComponentFixture<CheckoutCancel>;

  beforeEach(async () => {
    featureFlags.shopEnabled = false;
    await TestBed.configureTestingModule({
      imports: [CheckoutCancel, RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(CheckoutCancel);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    featureFlags.shopEnabled = false;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should hide shop CTA when shop feature flag is disabled', () => {
    const host = fixture.nativeElement as HTMLElement;

    expect(component.shopEnabled).toBe(false);
    expect(host.textContent).not.toContain('Wróć do Sklepu');
    expect(
      host
        .querySelector<HTMLAnchorElement>('a.btn-primary')
        ?.getAttribute('href'),
    ).toBe('/');
  });
});
