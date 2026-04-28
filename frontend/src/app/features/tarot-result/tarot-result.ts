import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroShare } from '@ng-icons/heroicons/outline';
import { TarotService } from '../../core/services/tarot.service';
import { TarotCard } from '@star-sign-monorepo/shared-types';

@Component({
  selector: 'app-tarot-result',
  imports: [RouterLink, NgIcon],
  viewProviders: [provideIcons({ heroShare })],
  templateUrl: './tarot-result.html',
  styleUrl: './tarot-result.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TarotResult implements OnInit {
  private readonly tarotService = inject(TarotService);

  public readonly card = signal<TarotCard | null>(null);
  public readonly isLoading = signal(true);
  public readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadDailyCard();
  }

  private loadDailyCard(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.tarotService.getDailyCard().subscribe({
      next: (draw) => {
        this.card.set(draw.card);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('Nie udało się pobrać karty dnia.');
        this.isLoading.set(false);
      },
    });
  }
}
