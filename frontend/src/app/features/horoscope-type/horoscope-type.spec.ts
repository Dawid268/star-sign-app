import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HoroscopeType } from './horoscope-type';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { ZodiacService } from '../../core/services/zodiac.service';
import { SeoService } from '../../core/services/seo.service';
import { vi } from 'vitest';

describe('HoroscopeType', () => {
  let component: HoroscopeType;
  let fixture: ComponentFixture<HoroscopeType>;
  let zodiacService: { getZodiacSigns: ReturnType<typeof vi.fn> };
  let seoService: { updateSeo: ReturnType<typeof vi.fn> };

  const createComponent = async (type: string) => {
    await TestBed.resetTestingModule()
      .configureTestingModule({
        imports: [HoroscopeType, RouterTestingModule],
        providers: [
          { provide: ZodiacService, useValue: zodiacService },
          { provide: SeoService, useValue: seoService },
          {
            provide: ActivatedRoute,
            useValue: {
              paramMap: of(convertToParamMap({ type })),
            },
          },
        ],
      })
      .compileComponents();

    fixture = TestBed.createComponent(HoroscopeType);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    zodiacService = {
      getZodiacSigns: vi.fn().mockReturnValue(
        of([
          {
            id: 1,
            name: 'Baran',
            slug: 'baran',
            date_range: '21.03 - 19.04',
            element: 'Ogień',
          },
        ]),
      ),
    };
    seoService = {
      updateSeo: vi.fn(),
    };

    await createComponent('chinski');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render type title, zodiac grid and sign links', () => {
    const host = fixture.nativeElement as HTMLElement;

    expect(
      host.querySelector('[data-test="horoscope-type-title"]')?.textContent,
    ).toContain('Horoskop Chiński');
    expect(
      host.querySelector('[data-test="horoscope-type-sign-baran"]')
        ?.textContent,
    ).toContain('Baran');
    expect(
      host
        .querySelector<HTMLAnchorElement>(
          '[data-test="horoscope-type-sign-baran"]',
        )
        ?.getAttribute('href'),
    ).toBe('/horoskopy/chinski/baran');
    expect(seoService.updateSeo).toHaveBeenCalledWith(
      'Horoskop Chiński | Star Sign',
      expect.stringContaining('Wybierz swój znak'),
    );
  });

  it('should show error state for unknown type', async () => {
    await createComponent('nieznany');

    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Nie znaleziono typu horoskopu');
    expect(
      host
        .querySelector<HTMLAnchorElement>('a.btn-primary')
        ?.getAttribute('href'),
    ).toBe('/horoskopy');
  });

  it('should show user-facing empty state when signs are unavailable', async () => {
    zodiacService.getZodiacSigns.mockReturnValue(of([]));
    await createComponent('chinski');

    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Treści są chwilowo niedostępne');
    expect(host.textContent).not.toContain('seed danych');
    expect(
      host
        .querySelector<HTMLAnchorElement>('a.btn-outline')
        ?.getAttribute('href'),
    ).toBe('/tarot/karta-dnia');
  });
});
