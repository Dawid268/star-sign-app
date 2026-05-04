import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { ZodiacService } from './zodiac.service';
import { environment } from '../../../environments/environment';

describe('ZodiacService', () => {
  let service: ZodiacService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ZodiacService],
    });
    service = TestBed.inject(ZodiacService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch zodiac signs', () => {
    const mockResponse = { data: [{ name: 'Aries' }] };
    service.getZodiacSigns().subscribe((signs) => {
      expect(signs.length).toBe(1);
      expect(signs[0].name).toBe('Aries');
    });

    const req = httpMock.expectOne(
      `${environment.apiUrl}/zodiac-signs?sort=id:asc&populate[0]=image`,
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should fetch horoscope', () => {
    const mockResponse = { data: [{ content: 'Lucky day' }] };
    service.getHoroscope('dzienny', 'aries').subscribe((horoscope) => {
      expect(horoscope?.content).toBe('Lucky day');
    });

    const req = httpMock.expectOne((req) => req.url.includes('/horoscopes'));
    expect(req.request.method).toBe('GET');
    expect(req.request.url).toContain('filters[period][$eq]=Dzienny');
    expect(req.request.url).toContain('filters[type][$eq]=Og%C3%B3lny');
    expect(req.request.url).toContain('filters[zodiac_sign][slug][$eq]=aries');
    req.flush(mockResponse);
  });

  it('should fetch special daily horoscope by type and sign', () => {
    service.getHoroscope('chinski', 'baran').subscribe();

    const req = httpMock.expectOne((req) => req.url.includes('/horoscopes'));
    expect(req.request.url).toContain('filters[period][$eq]=Dzienny');
    expect(req.request.url).toContain('filters[type][$eq]=Chi%C5%84ski');
    expect(req.request.url).toContain('filters[zodiac_sign][slug][$eq]=baran');
    req.flush({ data: [] });
  });

  it('should fetch monthly general horoscope with encoded period', () => {
    service.getHoroscope('miesieczny', 'rak').subscribe();

    const req = httpMock.expectOne((req) => req.url.includes('/horoscopes'));
    expect(req.request.url).toContain('filters[period][$eq]=Miesi%C4%99czny');
    expect(req.request.url).toContain('filters[type][$eq]=Og%C3%B3lny');
    expect(req.request.url).toContain('filters[zodiac_sign][slug][$eq]=rak');
    req.flush({ data: [] });
  });

  it('should handle errors and return empty array/undefined', () => {
    service.getZodiacSigns().subscribe((signs) => {
      expect(signs).toEqual([]);
    });
    const req1 = httpMock.expectOne((req) => req.url.includes('/zodiac-signs'));
    req1.error(new ErrorEvent('Network error'));

    service.getHoroscope('dzienny', 'aries').subscribe((h) => {
      expect(h).toBeUndefined();
    });
    const req2 = httpMock.expectOne((req) => req.url.includes('/horoscopes'));
    req2.error(new ErrorEvent('Network error'));
  });

  it('should return undefined without request if type is unknown', () => {
    service.getHoroscope('unknown', 'aries').subscribe((horoscope) => {
      expect(horoscope).toBeUndefined();
    });

    httpMock.expectNone((req) => req.url.includes('/horoscopes'));
  });
});
