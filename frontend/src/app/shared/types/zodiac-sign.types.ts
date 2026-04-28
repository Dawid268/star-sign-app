export interface ZodiacSign {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  date_range: string;
  element: 'Ogień' | 'Ziemia' | 'Powietrze' | 'Woda';
  planet?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
}
