import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TarotResult } from './tarot-result';
import { TarotService } from '../../core/services/tarot.service';
import { of, throwError } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';
import { vi } from 'vitest';
import { AuthService } from '../../core/services/auth.service';
import { AccountService } from '../../core/services/account.service';
import { AnalyticsService } from '../../core/services/analytics.service';
import { signal } from '@angular/core';

describe('TarotResult', () => {
  let component: TarotResult;
  let fixture: ComponentFixture<TarotResult>;
  let tarotService: any;
  let analyticsService: any;

  beforeEach(async () => {
    tarotService = {
      getDailyCard: vi.fn().mockReturnValue(
        of({
          card: {
            name: 'The Magician',
            meaning_upright: 'Focus',
            description: 'Use your tools',
          },
        }),
      ),
    };
    analyticsService = {
      trackFeatureUse: vi.fn(),
      trackEvent: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [TarotResult, RouterTestingModule],
      providers: [
        { provide: TarotService, useValue: tarotService },
        { provide: AuthService, useValue: { isLoggedIn: signal(false) } },
        {
          provide: AccountService,
          useValue: {
            getMe: vi
              .fn()
              .mockReturnValue(of({ subscription: { isPremium: false } })),
          },
        },
        { provide: AnalyticsService, useValue: analyticsService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TarotResult);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load daily card on init', () => {
    expect(tarotService.getDailyCard).toHaveBeenCalled();
    expect(component.card()?.name).toBe('The Magician');
    expect(component.isLoading()).toBe(false);
  });

  it('should handle error', () => {
    tarotService.getDailyCard.mockReturnValue(
      throwError(() => new Error('API Error')),
    );
    fixture = TestBed.createComponent(TarotResult);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component.error()).toBe('Nie udało się pobrać karty dnia.');
  });

  it('should render premium teaser below free card meaning', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent || '';

    expect(text).toContain('Focus');
    expect(text).toContain('Pełna analiza karty');
    expect(
      (fixture.nativeElement as HTMLElement)
        .querySelector('[data-test="tarot-premium-preview"] a')
        ?.getAttribute('href'),
    ).toBe('/premium');
  });
});
