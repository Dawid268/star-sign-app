import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { ArticleService } from './article.service';
import { environment } from '../../../environments/environment';

describe('ArticleService', () => {
  let service: ArticleService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ArticleService],
    });
    service = TestBed.inject(ArticleService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get articles with pagination', () => {
    const mockResponse = { data: [], meta: { pagination: { page: 1 } } };
    service.getArticles(1, 10).subscribe((res) => {
      expect(res.meta.pagination.page).toBe(1);
    });

    const req = httpMock.expectOne((req) => req.url.includes('/articles'));
    expect(req.request.url).toContain('pagination[page]=1');
    expect(req.request.url).toContain('pagination[pageSize]=10');
    req.flush(mockResponse);
  });

  it('should filter by category', () => {
    service.getArticles(1, 12, 'Spiritual').subscribe();
    const req = httpMock.expectOne((req) =>
      req.url.includes('filters[category][name][$eq]=Spiritual'),
    );
    req.flush({ data: [] });
  });

  it('should filter by search query', () => {
    service.getArticles(1, 12, 'Wszystko', 'moon').subscribe();
    const req = httpMock.expectOne((req) =>
      req.url.includes('$containsi]=moon'),
    );
    expect(req.request.url).toContain(
      'filters[$or][0][title][$containsi]=moon',
    );
    req.flush({ data: [] });
  });

  it('should get recent articles', () => {
    const mockData = [{ id: 1 }, { id: 2 }];
    service.getRecentArticles(2).subscribe((articles) => {
      expect(articles.length).toBe(2);
    });

    const req = httpMock.expectOne((req) =>
      req.url.includes('pagination[limit]=2'),
    );
    req.flush({ data: mockData });
  });

  it('should get related articles', () => {
    const mockData = [{ id: 2 }];
    service.getRelatedArticles('Cat', 'Slug', 1).subscribe((articles) => {
      expect(articles.length).toBe(1);
    });

    const req = httpMock.expectOne(
      (req) =>
        req.url.includes('category][name][$eq]=Cat') &&
        req.url.includes('slug][$ne]=Slug'),
    );
    req.flush({ data: mockData });
  });

  it('should get article by slug', () => {
    service.getArticleBySlug('test').subscribe();
    const req = httpMock.expectOne((req) =>
      req.url.includes('filters[slug][$eq]=test'),
    );
    req.flush({ data: [{ title: 'T' }] });
  });

  it('should encode article slug in detail request', () => {
    service.getArticleBySlug('test slug/with spaces').subscribe();

    const req = httpMock.expectOne((req) => req.url.includes('/articles'));
    expect(req.request.url).toContain(
      'filters[slug][$eq]=test%20slug%2Fwith%20spaces',
    );
    req.flush({ data: [] });
  });

  it('should return empty array on articles error', () => {
    service.getArticles().subscribe((res) => {
      expect(res.data.length).toBe(0);
    });

    const req = httpMock.expectOne((req) => req.url.includes('/articles'));
    req.error(new ProgressEvent('error'));
  });

  it('should return empty array on recent articles error', () => {
    service.getRecentArticles().subscribe((res) => {
      expect(res.length).toBe(0);
    });

    const req = httpMock.expectOne((req) => req.url.includes('/articles'));
    req.error(new ProgressEvent('error'));
  });

  it('should return undefined on article by slug error', () => {
    service.getArticleBySlug('test').subscribe((res) => {
      expect(res).toBeUndefined();
    });

    const req = httpMock.expectOne((req) =>
      req.url.includes('slug][$eq]=test'),
    );
    req.error(new ProgressEvent('error'));
  });
});
