import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { NewsletterService } from './newsletter.service';
import { environment } from '../../../environments/environment';

describe('NewsletterService', () => {
  let service: NewsletterService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [NewsletterService],
    });
    service = TestBed.inject(NewsletterService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should subscribe to newsletter', () => {
    const payload = {
      email: 'test@example.com',
      marketingConsent: true,
      source: 'home',
    };
    service.subscribe(payload).subscribe((res) => {
      expect(res.accepted).toBe(true);
    });

    const req = httpMock.expectOne(
      `${environment.apiUrl}/newsletter/subscribe`,
    );
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ accepted: true });
  });

  it('should confirm subscription', () => {
    const token = 'xyz';
    service.confirm(token).subscribe();
    const req = httpMock.expectOne(
      `${environment.apiUrl}/newsletter/confirm/${token}`,
    );
    expect(req.request.method).toBe('GET');
    req.flush({ success: true });
  });

  it('should unsubscribe from newsletter', () => {
    const token = 'abc';
    service.unsubscribe(token).subscribe();
    const req = httpMock.expectOne(
      `${environment.apiUrl}/newsletter/unsubscribe/${token}`,
    );
    expect(req.request.method).toBe('GET');
    req.flush({ success: true });
  });
});
