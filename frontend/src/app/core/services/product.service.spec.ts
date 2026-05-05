import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { ProductService } from './product.service';
import { environment } from '../../../environments/environment';
import { featureFlags } from '../feature-flags';

describe('ProductService', () => {
  let service: ProductService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ProductService],
    });
    service = TestBed.inject(ProductService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return empty list when shop is disabled', () => {
    featureFlags.shopEnabled = false;
    service.getProducts().subscribe((products) => {
      expect(products).toEqual([]);
    });
    httpMock.expectNone(`${environment.apiUrl}/products?populate=*`);
  });

  it('should fetch products when shop is enabled', () => {
    featureFlags.shopEnabled = true;
    const mockResponse = { data: [{ id: 1, name: 'Crystal' }] };
    service.getProducts().subscribe((products) => {
      expect(products.length).toBe(1);
      expect(products[0].name).toBe('Crystal');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/products?populate=*`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should apply category filter', () => {
    featureFlags.shopEnabled = true;
    service.getProducts('Biżuteria').subscribe();
    const req = httpMock.expectOne((req) =>
      req.url.includes('filters[category][$eq]=Bi%C5%BCuteria'),
    );
    req.flush({ data: [] });
  });

  it('should fetch product by id', () => {
    featureFlags.shopEnabled = true;
    const mockProduct = { id: '123', name: 'Item' };
    service.getProductById('123').subscribe((p) => {
      expect(p.name).toBe('Item');
    });

    const req = httpMock.expectOne(
      `${environment.apiUrl}/products/123?populate=*`,
    );
    req.flush({ data: mockProduct });
  });

  it('should return empty list on error', () => {
    featureFlags.shopEnabled = true;
    service.getProducts().subscribe((p) => {
      expect(p).toEqual([]);
    });
    const req = httpMock.expectOne(`${environment.apiUrl}/products?populate=*`);
    req.error(new ErrorEvent('Network error'));
  });

  it('should throw error when getProductById is called and shop is disabled', () => {
    featureFlags.shopEnabled = false;
    service.getProductById('123').subscribe({
      error: (err) => {
        expect(err.message).toBe('Funkcja sklepu jest tymczasowo wyłączona.');
      },
    });
    httpMock.expectNone(`${environment.apiUrl}/products/123?populate=*`);
  });
});
