import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';
import { vi } from 'vitest';

import { NatalChartComponent } from './natal-chart';
import { AstrologyService } from '../../core/services/astrology.service';
import { AccountService } from '../../core/services/account.service';
import { AnalyticsService } from '../../core/services/analytics.service';

describe('NatalChartComponent', () => {
  let fixture: ComponentFixture<NatalChartComponent>;
  let component: NatalChartComponent;
  let accountService: any;
  let astrologyService: any;

  beforeEach(async () => {
    accountService = {
      getMe: vi.fn().mockReturnValue(
        of({
          profile: {
            birthDate: '1990-01-01',
            birthTime: '12:00',
            birthPlace: 'Warszawa',
          },
          subscription: { isPremium: false },
        }),
      ),
    };
    astrologyService = {
      calculateNatalChart: vi.fn().mockReturnValue({
        sun: 'Baran',
        moon: 'Rak',
        rising: 'Waga',
      }),
    };

    await TestBed.configureTestingModule({
      imports: [NatalChartComponent, RouterTestingModule],
      providers: [
        {
          provide: AstrologyService,
          useValue: astrologyService,
        },
        { provide: AccountService, useValue: accountService },
        {
          provide: AnalyticsService,
          useValue: { trackFeatureUse: vi.fn() },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NatalChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render natal chart and premium preview for non-premium users', () => {
    const host = fixture.nativeElement as HTMLElement;

    expect(host.textContent).toContain('Baran');
    expect(host.textContent).toContain('Pełna analiza kosmogramu');
    expect(
      host
        .querySelector('[data-test="natal-chart-premium-preview"] a')
        ?.getAttribute('href'),
    ).toBe('/premium');
  });

  it('should render natal chart with birth date only and leave rising sign empty', () => {
    accountService.getMe.mockReturnValue(
      of({
        profile: {
          birthDate: '1990-01-01',
          birthTime: null,
          birthPlace: null,
        },
        subscription: { isPremium: true },
      }),
    );
    astrologyService.calculateNatalChart.mockReturnValue({
      sun: 'Koziorożec',
      moon: 'Rak',
      rising: null,
    });

    const dateOnlyFixture = TestBed.createComponent(NatalChartComponent);
    dateOnlyFixture.detectChanges();

    const host = dateOnlyFixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Koziorożec');
    expect(host.textContent).toContain('Uzupełnij godzinę');
    expect(astrologyService.calculateNatalChart).toHaveBeenCalledWith(
      new Date('1990-01-01'),
      null,
      '',
    );
  });

  it('should explain missing birth data for logged-in users', () => {
    accountService.getMe.mockReturnValue(
      of({
        profile: {
          birthDate: null,
          birthTime: null,
          birthPlace: null,
        },
        subscription: { isPremium: false },
      }),
    );

    const emptyFixture = TestBed.createComponent(NatalChartComponent);
    emptyFixture.detectChanges();

    const host = emptyFixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Uzupełnij dane urodzeniowe');
    expect(host.textContent).toContain('Do kosmogramu potrzebujemy daty');
    expect(host.querySelector('a')?.getAttribute('href')).toBe('/panel');
  });

  it('should show login action for guests instead of an endless skeleton', () => {
    accountService.getMe.mockReturnValue(of(null));

    const guestFixture = TestBed.createComponent(NatalChartComponent);
    guestFixture.detectChanges();

    const host = guestFixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Kosmogram czeka na Twój profil');
    expect(host.textContent).toContain('Zaloguj się lub załóż konto');
    expect(host.querySelector('a')?.getAttribute('href')).toBe('/logowanie');
  });
});
