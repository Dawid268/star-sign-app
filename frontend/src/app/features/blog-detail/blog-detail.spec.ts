import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BlogDetail } from './blog-detail';
import { ArticleService } from '../../core/services/article.service';
import { SeoService } from '../../core/services/seo.service';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';
import { vi } from 'vitest';

import { AuthService } from '../../core/services/auth.service';
import { AccountService } from '../../core/services/account.service';
import { AnalyticsService } from '../../core/services/analytics.service';
import { signal } from '@angular/core';

describe('BlogDetail', () => {
  let component: BlogDetail;
  let fixture: ComponentFixture<BlogDetail>;
  let articleService: any;
  let seoService: any;
  let authService: any;
  let accountService: any;
  let analyticsService: any;

  const mockArticle = {
    id: 1,
    documentId: 'article-test',
    title: 'Test Article',
    slug: 'test-article',
    excerpt: 'Test Excerpt',
    publishedAt: '2026-04-29',
    author: 'Admin',
    content: 'Long content here',
    isPremium: false,
    category: { name: 'Astrologia' },
  };

  beforeEach(async () => {
    articleService = {
      getArticleBySlug: vi.fn().mockReturnValue(of(mockArticle)),
      getRelatedArticles: vi.fn().mockReturnValue(of([])),
    };

    seoService = {
      absoluteUrl: vi.fn((path: string) => `https://star-sign.pl${path}`),
      updateSeo: vi.fn(),
    };

    authService = {
      isLoggedIn: signal(true),
    };

    accountService = {
      getMe: vi.fn().mockReturnValue(of({ subscription: { isPremium: true } })),
    };
    analyticsService = {
      trackEvent: vi.fn(),
      trackPremiumCtaClick: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [BlogDetail, RouterTestingModule],
      providers: [
        { provide: ArticleService, useValue: articleService },
        { provide: SeoService, useValue: seoService },
        { provide: AuthService, useValue: authService },
        { provide: AccountService, useValue: accountService },
        { provide: AnalyticsService, useValue: analyticsService },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ slug: 'test-article' })),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BlogDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load article and update SEO', () => {
    expect(articleService.getArticleBySlug).toHaveBeenCalledWith(
      'test-article',
    );
    expect(component.article()).toEqual(mockArticle);
    expect(seoService.updateSeo).toHaveBeenCalledWith(
      'Test Article',
      'Test Excerpt',
      expect.any(Object),
    );
  });

  it('should load related articles after article category is available', () => {
    expect(articleService.getRelatedArticles).toHaveBeenCalledWith(
      'Astrologia',
      'test-article',
    );
  });

  it('should link sidebar newsletter CTA to the real home newsletter form', () => {
    const link = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-test="blog-newsletter-link"]',
    );

    expect(link?.getAttribute('href')).toBe('/#newsletter');
  });

  it('should identify premium user', () => {
    expect(component.isPremiumUser()).toBe(true);
  });

  it('should identify non-premium user when logged out', () => {
    authService.isLoggedIn.set(false);
    fixture.detectChanges();
    expect(component.isPremiumUser()).toBe(false);
  });

  it('should identify non-premium user when subscription is false', () => {
    accountService.getMe.mockReturnValue(
      of({ subscription: { isPremium: false } }),
    );
    // Reset component or trigger change detection
    // Note: signals in toSignal with async sources might need extra care in tests
    // But for this simple case, let's assume it works or we re-trigger
    fixture = TestBed.createComponent(BlogDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component.isPremiumUser()).toBe(false);
  });

  it('should render public article content and soft premium gate for non-premium users', () => {
    accountService.getMe.mockReturnValue(
      of({ subscription: { isPremium: false } }),
    );
    articleService.getArticleBySlug.mockReturnValue(
      of({
        ...mockArticle,
        id: 2,
        title: 'Premium Article',
        slug: 'premium-article',
        excerpt: 'Premium excerpt',
        content: 'Public premium article intro',
        isPremium: true,
        hasPremiumContent: true,
        read_time_minutes: 9,
        category: { name: 'Premium' },
        image: {
          url: '/premium.webp',
          alternativeText: 'Premium image',
        },
      }),
    );

    fixture = TestBed.createComponent(BlogDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).toContain('Premium Article');
    expect(text).toContain('Public premium article intro');
    expect(text).toContain('Rozszerzenie Premium do artykułu');
    expect(text).toContain('PREMIUM');
    expect(
      (fixture.nativeElement as HTMLElement)
        .querySelector('[data-test="article-premium-preview"] a')
        ?.getAttribute('href'),
    ).toBe('/premium');
    expect(
      (fixture.nativeElement as HTMLElement)
        .querySelector('img')
        ?.getAttribute('alt'),
    ).toBe('Premium image');
  });

  it('should share article through native share API', () => {
    const shareSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: shareSpy,
    });

    component.shareArticle();

    expect(analyticsService.trackEvent).toHaveBeenCalledWith('article_share', {
      article_id: 1,
      article_title: 'Test Article',
    });
    expect(shareSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Test Article',
        url: expect.stringContaining('/artykuly/test-article'),
      }),
    );
  });

  it('should copy share URL when native share API is unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    component.shareArticle();
    await Promise.resolve();

    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('/artykuly/test-article'),
    );
  });
});
