import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  heroSparkles,
  heroMoon,
  heroHeart,
  heroLockClosed,
} from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-tarot',
  imports: [RouterLink, NgIcon],
  viewProviders: [
    provideIcons({ heroSparkles, heroMoon, heroHeart, heroLockClosed }),
  ],
  templateUrl: './tarot.html',
  styleUrl: './tarot.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Tarot {
  public readonly spreads = [
    {
      id: 'karta-dnia',
      name: 'Karta Dnia',
      description:
        'Poznaj swoje jednokartowe przesłanie na dzisiaj. Idealny punkt startowy na każdy poranek.',
      icon: 'heroSparkles',
      locked: false,
      link: '/tarot/karta-dnia',
    },
    {
      id: 'rozkad-milosny',
      name: 'Rozkład Miłosny',
      description:
        'Zgłęb tajemnice swojego życia uczuciowego za pomocą klasycznego rozkładu trzech kart.',
      icon: 'heroHeart',
      locked: true,
      link: null,
    },
    {
      id: 'tarot-ksiezycowy',
      name: 'Wróżba Księżycowa',
      description:
        'Przesłanie połączone z obecną fazą Księżyca. Odkryj co skrywa podświadomość.',
      icon: 'heroMoon',
      locked: true,
      link: null,
    },
  ];
}
