import { TestBed } from '@angular/core/testing';
import { LoadingService } from './loading.service';
import {
  Router,
  NavigationStart,
  NavigationEnd,
  NavigationCancel,
  NavigationError,
} from '@angular/router';
import { Subject } from 'rxjs';

describe('LoadingService', () => {
  let service: LoadingService;
  let routerEvents: Subject<any>;

  beforeEach(() => {
    routerEvents = new Subject<any>();
    const routerMock = {
      events: routerEvents.asObservable(),
    };

    TestBed.configureTestingModule({
      providers: [LoadingService, { provide: Router, useValue: routerMock }],
    });
    service = TestBed.inject(LoadingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should set isLoading to true on NavigationStart', () => {
    routerEvents.next(new NavigationStart(1, '/test'));
    expect(service.isLoading()).toBe(true);
  });

  it('should set isLoading to false on NavigationEnd', () => {
    service.isLoading.set(true);
    routerEvents.next(new NavigationEnd(1, '/test', '/test'));
    expect(service.isLoading()).toBe(false);
  });

  it('should set isLoading to false on NavigationCancel', () => {
    service.isLoading.set(true);
    routerEvents.next(new NavigationCancel(1, '/test', 'reason'));
    expect(service.isLoading()).toBe(false);
  });

  it('should set isLoading to false on NavigationError', () => {
    service.isLoading.set(true);
    routerEvents.next(new NavigationError(1, '/test', new Error('fail')));
    expect(service.isLoading()).toBe(false);
  });

  it('should manage HTTP loading state', () => {
    expect(service.isLoading()).toBe(false);

    service.setHttpLoading(true);
    expect(service.isLoading()).toBe(true);

    service.setHttpLoading(true);
    expect(service.isLoading()).toBe(true);

    service.setHttpLoading(false);
    expect(service.isLoading()).toBe(true); // Still one request active

    service.setHttpLoading(false);
    expect(service.isLoading()).toBe(false); // All done
  });

  it('should not let activeRequests go below zero', () => {
    service.setHttpLoading(false);
    expect(service.isLoading()).toBe(false);

    service.setHttpLoading(true);
    expect(service.isLoading()).toBe(true);

    service.setHttpLoading(false);
    expect(service.isLoading()).toBe(false);
  });
});
