export interface NewsletterSubscribeRequest {
  email: string;
  marketingConsent: boolean;
  source?: string;
  turnstileToken?: string;
}

export interface NewsletterSubscribeResponse {
  accepted: boolean;
  confirmationRequired?: boolean;
}

export interface NewsletterActionResponse {
  confirmed?: boolean;
  unsubscribed?: boolean;
}
