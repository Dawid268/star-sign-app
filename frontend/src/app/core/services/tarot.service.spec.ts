import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { TarotService } from './tarot.service';
import { environment } from '../../../environments/environment';

describe('TarotService', () => {
  let service: TarotService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TarotService],
    });
    service = TestBed.inject(TarotService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get daily card', () => {
    const mockResponse = { card: { name: 'The Fool' }, date: '2026-04-29' };
    service.getDailyCard().subscribe((res) => {
      expect(res.card?.name).toBe('The Fool');
    });

    const req = httpMock.expectOne(
      `${environment.apiUrl}/daily-tarot/today?populate[card][populate]=image`,
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should get card by slug', () => {
    const mockResponse = { data: [{ name: 'The Magician' }] };
    service.getCardBySlug('the-magician').subscribe((card) => {
      expect(card?.name).toBe('The Magician');
    });

    const req = httpMock.expectOne((req) => req.url.includes('/tarot-cards'));
    expect(req.request.method).toBe('GET');
    expect(req.request.url).toContain('filters[slug][$eq]=the-magician');
    req.flush(mockResponse);
  });

  it('should handle error in getCardBySlug', () => {
    service.getCardBySlug('non-existent').subscribe((card) => {
      expect(card).toBeUndefined();
    });

    const req = httpMock.expectOne((req) => req.url.includes('/tarot-cards'));
    req.error(new ErrorEvent('Not Found'));
  });
});
