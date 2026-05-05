import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MaintenanceMode } from './maintenance-mode';
import { PublicMaintenanceModeSettings } from '@star-sign-monorepo/shared-types';

describe('MaintenanceMode', () => {
  let fixture: ComponentFixture<MaintenanceMode>;

  const settings: PublicMaintenanceModeSettings = {
    enabled: true,
    title: 'Pracujemy nad Star Sign',
    message: 'Dopracowujemy stronę i wrócimy za chwilę.',
    eta: '2026-05-05T18:00:00.000Z',
    contactUrl: 'mailto:pomoc@example.com',
    allowedPaths: ['/polityka-prywatnosci'],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MaintenanceMode],
    }).compileComponents();

    fixture = TestBed.createComponent(MaintenanceMode);
    fixture.componentRef.setInput('settings', settings);
  });

  it('should render maintenance title, message and eta', () => {
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(
      element.querySelector('[data-test="maintenance-title"]')?.textContent,
    ).toContain('Pracujemy nad Star Sign');
    expect(
      element.querySelector('[data-test="maintenance-message"]')?.textContent,
    ).toContain('Dopracowujemy stronę');
    expect(
      element.querySelector('[data-test="maintenance-eta"]'),
    ).not.toBeNull();
  });

  it('should render contact link only when configured', () => {
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const link = element.querySelector<HTMLAnchorElement>(
      '[data-test="maintenance-contact-link"]',
    );

    expect(link?.href).toBe('mailto:pomoc@example.com');
  });

  it('should render checking copy without eta and contact link', () => {
    fixture.componentRef.setInput('checking', true);

    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;

    expect(
      element.querySelector('[data-test="maintenance-title"]')?.textContent,
    ).toContain('Sprawdzamy status Star Sign');
    expect(element.querySelector('[data-test="maintenance-eta"]')).toBeNull();
    expect(
      element.querySelector('[data-test="maintenance-contact-link"]'),
    ).toBeNull();
  });
});
