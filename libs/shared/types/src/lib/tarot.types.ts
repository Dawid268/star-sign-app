export interface TarotCard {
  id: number;
  documentId: string;
  name: string;
  arcana: string;
  meaning_upright: string;
  meaning_reversed?: string;
  description: string;
  symbol: string;
  slug: string;
}

export interface DailyTarotDrawResponse {
  date: string;
  card: TarotCard | null;
  message?: string;
}
