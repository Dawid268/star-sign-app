import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { PremiumPreviewBlock } from './premium-preview-block';

describe('PremiumPreviewBlock', () => {
  let component: PremiumPreviewBlock;
  let fixture: ComponentFixture<PremiumPreviewBlock>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PremiumPreviewBlock, RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(PremiumPreviewBlock);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders teaser and premium CTA for non-premium users', () => {
    fixture.componentRef.setInput('hasPremiumContent', true);
    fixture.componentRef.setInput('previewItems', ['Relacje', 'Rytuał']);
    fixture.componentRef.setInput('ctaLabel', 'Zobacz Premium');
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Relacje');
    expect(host.textContent).toContain('Zobacz Premium');
    expect(host.querySelector('a')?.getAttribute('href')).toBe('/premium');
  });

  it('renders full premium content for premium users', () => {
    fixture.componentRef.setInput('isPremium', true);
    fixture.componentRef.setInput('premiumContent', 'Pełna treść premium');
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Pełna treść premium');
    expect(host.querySelector('a')).toBeNull();
  });

  it('renders nothing when premium extension is unavailable', () => {
    fixture.componentRef.setInput('hasPremiumContent', false);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(
      host.querySelector('[data-test="premium-preview-block"]'),
    ).toBeNull();
  });
});
