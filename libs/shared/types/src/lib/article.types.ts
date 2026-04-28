export interface Article {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  read_time_minutes?: number;
  excerpt?: string;
  content?: string;
  author?: string;
  createdAt?: string;
  updatedAt?: string;
  publishedAt?: string;
  category?: {
    name: string;
    slug: string;
  };
}
