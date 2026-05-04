import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { NumerologyService } from './numerology.service';
import { environment } from '../../../environments/environment';

describe('NumerologyService', () => {
  let service: NumerologyService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [NumerologyService],
    });
    service = TestBed.inject(NumerologyService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch profile by number', () => {
    const mockResponse = { data: [{ number: 7, title: 'Wise' }] };
    service.getProfileByNumber(7).subscribe((profile) => {
      expect(profile?.title).toBe('Wise');
    });

    const req = httpMock.expectOne(
      `${environment.apiUrl}/numerology-profiles?filters[number][$eq]=7&pagination[limit]=1`,
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should return undefined if no profile found', () => {
    service.getProfileByNumber(99).subscribe((profile) => {
      expect(profile).toBeUndefined();
    });

    const req = httpMock.expectOne((req) =>
      req.url.includes('number][$eq]=99'),
    );
    req.flush({ data: [] });
  });

  it('should handle errors', () => {
    service.getProfileByNumber(5).subscribe({
      error: (err) => expect(err).toBeTruthy(),
    });

    const req = httpMock.expectOne((req) => req.url.includes('number][$eq]=5'));
    req.error(new ErrorEvent('API Error'));
  });
});
