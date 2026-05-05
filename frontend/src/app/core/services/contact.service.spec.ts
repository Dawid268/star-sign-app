import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { ContactService, ContactRequest } from './contact.service';
import { environment } from '../../../environments/environment';

describe('ContactService', () => {
  let service: ContactService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ContactService],
    });
    service = TestBed.inject(ContactService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should send a message', () => {
    const mockRequest: ContactRequest = {
      name: 'John Doe',
      email: 'john@example.com',
      subject: 'Test',
      message: 'Hello world',
    };

    const mockResponse = {
      success: true,
      message: 'Email sent',
    };

    service.sendMessage(mockRequest).subscribe((response) => {
      expect(response.success).toBe(true);
      expect(response.message).toBe('Email sent');
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/contact`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(mockRequest);
    req.flush(mockResponse);
  });

  it('should handle error on send message', () => {
    const mockRequest: ContactRequest = {
      name: 'John Doe',
      email: 'john@example.com',
      message: 'Hello',
    };

    service.sendMessage(mockRequest).subscribe({
      error: (error) => {
        expect(error.status).toBe(500);
      },
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/contact`);
    req.flush('Error sending email', {
      status: 500,
      statusText: 'Server Error',
    });
  });
});
