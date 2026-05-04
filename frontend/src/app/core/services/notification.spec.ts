import { TestBed } from '@angular/core/testing';
import { NotificationService } from './notification';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NotificationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should add a notification', () => {
    service.show('Test message', 'success');
    expect(service.notifications().length).toBe(1);
    expect(service.notifications()[0].message).toBe('Test message');
    expect(service.notifications()[0].type).toBe('success');
  });

  it('should remove a notification', () => {
    service.show('To remove', 'info', 0);
    const id = service.notifications()[0].id;
    service.remove(id);
    expect(service.notifications().length).toBe(0);
  });

  it('should have shorthand methods', () => {
    service.success('Success');
    service.error('Error');
    service.info('Info');
    expect(service.notifications().length).toBe(3);
  });
});
