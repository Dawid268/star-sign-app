import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroSparkles, heroArrowRight } from '@ng-icons/heroicons/outline';
import { NumerologyProfile } from '@star-sign-monorepo/shared-types';
import { NumerologyService } from '../../core/services/numerology.service';
import { featureFlags } from '../../core/feature-flags';

@Component({
  selector: 'app-numerology',
  standalone: true,
  imports: [FormsModule, RouterLink, NgIcon],
  viewProviders: [provideIcons({ heroSparkles, heroArrowRight })],
  templateUrl: './numerology.html',
  styleUrl: './numerology.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Numerology {
  private readonly numerologyService = inject(NumerologyService);

  public readonly birthDate = signal('');
  public readonly result = signal<number | null>(null);
  public readonly isCalculating = signal(false);
  public readonly activeProfile = signal<NumerologyProfile | null>(null);
  public readonly shopEnabled = featureFlags.shopEnabled;

  private readonly fallbackProfiles: Record<number, { title: string; description: string }> = {
    1: { title: 'Pionier i Lider', description: 'Jesteś urodzonym przywódcą, pełnym ambicji i niezależności.' },
    2: { title: 'Dyplomata i Partner', description: 'Cechuje Cię wrażliwość, intuicja i umiejętność współpracy.' },
    3: { title: 'Twórca i Artysta', description: 'Wyrażasz siebie poprzez komunikację i sztukę.' },
    4: { title: 'Budowniczy i Pracownik', description: 'Twoją siłą jest stabilność, porządek i systematyczność.' },
    5: { title: 'Podróżnik i Wolny Duch', description: 'Cenisz wolność, zmiany i przygodę.' },
    6: { title: 'Opiekun i Nauczyciel', description: 'Twoją misją jest służba innym i budowanie harmonii.' },
    7: { title: 'Mędrzec i Myśliciel', description: 'Szukasz prawdy, wiedzy i duchowego zrozumienia.' },
    8: { title: 'Strateg i Władca', description: 'Masz talent do zarządzania i osiągania sukcesu materialnego.' },
    9: { title: 'Humanitarysta i Idealista', description: 'Dążysz do pomocy innym i domykania ważnych cykli.' },
    11: { title: 'Mistrz Intuicji', description: 'Masz silną intuicję i wyjątkowy potencjał duchowy.' },
    22: { title: 'Mistrz Budowniczy', description: 'Potrafisz przekuwać wielkie wizje w realny wpływ.' },
    33: { title: 'Mistrz Nauczyciel', description: 'Niesiesz energię opieki i bezinteresownego przewodnictwa.' },
  };

  /**
   * Oblicza Liczbę Drogi Życia.
   * Sumuje wszystkie cyfry daty urodzenia do momentu uzyskania pojedynczej cyfry (lub 11, 22, 33 - liczby mistrzowskie).
   */
  public calculateLifePath(): void {
    if (!this.birthDate()) return;

    this.isCalculating.set(true);
    const dateStr = this.birthDate().replace(/-/g, '');
    let sum = 0;

    for (const char of dateStr) {
      sum += parseInt(char, 10);
    }

    const finalNumber = this.reduceNumber(sum);
    this.result.set(finalNumber);
    this.numerologyService.getProfileByNumber(finalNumber).subscribe({
      next: (profile) => {
        if (profile) {
          this.activeProfile.set(profile);
        } else {
          const fallback = this.fallbackProfiles[finalNumber];
          this.activeProfile.set(
            fallback
              ? {
                  id: 0,
                  documentId: `fallback-${finalNumber}`,
                  number: finalNumber,
                  title: fallback.title,
                  description: fallback.description,
                }
              : null
          );
        }
        this.isCalculating.set(false);
      },
      error: () => {
        const fallback = this.fallbackProfiles[finalNumber];
        this.activeProfile.set(
          fallback
            ? {
                id: 0,
                documentId: `fallback-${finalNumber}`,
                number: finalNumber,
                title: fallback.title,
                description: fallback.description,
              }
            : null
        );
        this.isCalculating.set(false);
      },
    });
  }

  private reduceNumber(num: number): number {
    // Liczby mistrzowskie nie podlegają redukcji w numerologii
    if (num === 11 || num === 22 || num === 33) {
      return num;
    }

    if (num < 10) {
      return num;
    }

    const nextSum = num.toString().split('').reduce((acc, curr) => acc + parseInt(curr, 10), 0);
    return this.reduceNumber(nextSum);
  }

  public reset(): void {
    this.result.set(null);
    this.birthDate.set('');
    this.activeProfile.set(null);
  }
}
