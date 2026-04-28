export interface Product {
  id: number;
  documentId: string;
  name: string;
  sku?: string;
  slug: string;
  price: number;
  currency?: 'PLN' | 'EUR' | 'USD';
  stock_status?: 'in_stock' | 'out_of_stock' | 'preorder';
  description: string;
  image?: {
    url: string;
    alternativeText?: string;
  };
  category?: string;
  symbol?: string;
  tag?: string;
  rating?: number;
  reviews?: number;
  features?: string[];
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface CheckoutSessionRequest {
  items: Array<{
    productDocumentId: string;
    quantity: number;
  }>;
  customerEmail?: string;
}

export interface CheckoutSessionResponse {
  checkoutUrl: string;
  sessionId: string;
}
