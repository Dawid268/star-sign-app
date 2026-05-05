import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { CheckoutService } from './checkout.service';
import { environment } from '../../../environments/environment';
import { featureFlags } from '../feature-flags';

describe('CheckoutService', () => {
  let service: CheckoutService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [CheckoutService],
    });
    service = TestBed.inject(CheckoutService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should create a checkout session when shop is enabled', () => {
    // Force enable shop for this test if needed
    const originalFlag = featureFlags.shopEnabled;
    (featureFlags as any).shopEnabled = true;

    const mockRequest = { items: [{ productDocumentId: '1', quantity: 1 }] };
    const mockResponse = {
      sessionId: 'sess_123',
      checkoutUrl: 'https://stripe.com/pay',
    };

    service.createSession(mockRequest as any).subscribe((res) => {
      expect(res.sessionId).toBe('sess_123');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/checkout/session`);
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);

    (featureFlags as any).shopEnabled = originalFlag;
  });

  it('should throw error when shop is disabled', () => {
    const originalFlag = featureFlags.shopEnabled;
    (featureFlags as any).shopEnabled = false;

    service.createSession({ items: [] } as any).subscribe({
      error: (err) => {
        expect(err.message).toBe('Funkcja sklepu jest tymczasowo wyłączona.');
      },
    });

    httpMock.expectNone(`${environment.apiUrl}/checkout/session`);

    (featureFlags as any).shopEnabled = originalFlag;
  });

  it('should fetch checkout analytics summary without requiring shop flag', () => {
    service.getAnalyticsSummary('cs_test').subscribe((summary) => {
      expect(summary.status).toBe('paid');
      expect(summary.total).toBe(99);
    });

    const req = httpMock.expectOne(
      `${environment.apiUrl}/checkout/session/cs_test/analytics-summary`,
    );
    expect(req.request.method).toBe('GET');
    req.flush({
      sessionId: 'cs_test',
      orderDocumentId: 'order-1',
      status: 'paid',
      currency: 'PLN',
      total: 99,
      items: [],
    });
  });
});
