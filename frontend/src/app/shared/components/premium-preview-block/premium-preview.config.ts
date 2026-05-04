import type { PremiumPreviewVariant } from './premium-preview-block';

export const PREMIUM_PREVIEW_ITEMS: Record<PremiumPreviewVariant, string[]> = {
  horoscope: [
    'Relacje: co dziś wzmacnia bliskość',
    'Praca: decyzja, której nie warto odkładać',
    'Energia dnia: rytm, który pomoże Ci działać spokojniej',
    'Rytuał: prosty gest na domknięcie dnia',
    'Pytanie refleksyjne do dziennika',
  ],
  article: [
    'Praktyczne ćwiczenie do tematu artykułu',
    'Rytuał do wykonania jeszcze dziś',
    'Pytanie refleksyjne do osobistego dziennika',
  ],
  tarot: [
    'Cień karty i to, czego możesz dziś nie zauważać',
    'Rada relacyjna na rozmowy i granice',
    'Rytuał dnia oparty na symbolice karty',
    'Pytanie do dziennika',
  ],
  'natal-chart': [
    'Planety w domach i ich praktyczne znaczenie',
    'Aspekty, które pokazują napięcia i talenty',
    'Dominujące żywioły w Twoim rytmie działania',
    'Relacje i rytm miesięczny w osobistej interpretacji',
  ],
  generic: [
    'Rozszerzona interpretacja',
    'Praktyczny rytuał',
    'Pytanie refleksyjne',
  ],
};
