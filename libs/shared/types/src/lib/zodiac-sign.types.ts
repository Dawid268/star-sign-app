export interface ZodiacSign {
  id: number;
  documentId: string;
  name: string;
  slug: string;
  date_range: string;
  element: string;
  planet?: string;
  symbol?: string;
  description?: string;
  strengths?: string[];
  challenges?: string[];
  compatibility?: string[];
  image?: any;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
}
