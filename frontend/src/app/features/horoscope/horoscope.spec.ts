import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Horoscope } from './horoscope';
import { ZodiacService } from '../../core/services/zodiac.service';
import { of, throwError } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';
import { vi } from 'vitest';

describe('Horoscope', () => {
  let component: Horoscope;
  let fixture: ComponentFixture<Horoscope>;
  let zodiacService: any;

  beforeEach(async () => {
    zodiacService = {
      getZodiacSigns: vi
        .fn()
        .mockReturnValue(of([{ name: 'Baran', slug: 'baran' }])),
    };

    await TestBed.configureTestingModule({
      imports: [Horoscope, RouterTestingModule],
      providers: [{ provide: ZodiacService, useValue: zodiacService }],
    }).compileComponents();

    fixture = TestBed.createComponent(Horoscope);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load signs', () => {
    expect(zodiacService.getZodiacSigns).toHaveBeenCalled();
    expect(component.signs()?.length).toBe(1);
    expect(component.loading()).toBe(false);
  });

  it('should handle error', () => {
    zodiacService.getZodiacSigns.mockReturnValue(
      throwError(() => new Error('Error')),
    );
    fixture = TestBed.createComponent(Horoscope);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component.error()).toBe('Nie udało się pobrać znaków zodiaku.');
  });

  it('should show user-facing empty state without seed instructions', () => {
    zodiacService.getZodiacSigns.mockReturnValue(of([]));
    fixture = TestBed.createComponent(Horoscope);
    component = fixture.componentInstance;
    fixture.detectChanges();

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
