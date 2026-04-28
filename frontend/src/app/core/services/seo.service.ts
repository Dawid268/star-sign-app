import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';

type SeoOptions = {
  canonicalUrl?: string;
  jsonLd?: Record<string, unknown>;
};

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  public updateSeo(title: string, description: string, options: SeoOptions = {}): void {
    const fullTitle = `${title} | Star Sign`;
    this.title.setTitle(fullTitle);

    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: fullTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });

    if (options.canonicalUrl) {
      this.meta.updateTag({ property: 'og:url', content: options.canonicalUrl });
      this.setCanonical(options.canonicalUrl);
    }

    if (options.jsonLd) {
      this.setJsonLd(options.jsonLd);
    }
  }

  private setCanonical(url: string): void {
    const existing = this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (existing) {
      existing.href = url;
      return;
    }

    const link = this.document.createElement('link');
    link.setAttribute('rel', 'canonical');
    link.setAttribute('href', url);
    this.document.head.appendChild(link);
  }

  private setJsonLd(payload: Record<string, unknown>): void {
    const scriptId = 'star-sign-json-ld';
    const existing = this.document.getElementById(scriptId);
    if (existing) {
      existing.textContent = JSON.stringify(payload);
      return;
    }

    const script = this.document.createElement('script');
    script.id = scriptId;
    script.type = 'application/ld+json';
    script.text = JSON.stringify(payload);
    this.document.head.appendChild(script);
  }
}
