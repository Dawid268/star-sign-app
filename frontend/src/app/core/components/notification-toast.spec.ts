import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotificationToastComponent } from './notification-toast';
import { NotificationService } from '../services/notification';
import { vi } from 'vitest';

describe('NotificationToastComponent', () => {
  let component: NotificationToastComponent;
  let fixture: ComponentFixture<NotificationToastComponent>;
  let notificationService: NotificationService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationToastComponent],
      providers: [NotificationService],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationToastComponent);
    component = fixture.componentInstance;
    notificationService = TestBed.inject(NotificationService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should map notification types to icons', () => {
    expect(component.getIcon('success')).toBe('heroCheckCircle');
    expect(component.getIcon('error')).toBe('heroExclamationCircle');
    expect(component.getIcon('info')).toBe('heroInformationCircle');
  });

  it('should render success, error and info notifications with type attributes', () => {
    notificationService.success('Saved', 0);
    notificationService.error('Failed', 0);
    notificationService.info('Heads up', 0);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const toasts = host.querySelectorAll('[data-test="notification-toast"]');

    expect(toasts.length).toBe(3);
    expect(
      host.querySelector('[data-test-type="success"]')?.textContent,
    ).toContain('Saved');
    expect(
      host.querySelector('[data-test-type="error"]')?.textContent,
    ).toContain('Failed');
    expect(
      host.querySelector('[data-test-type="info"]')?.textContent,
    ).toContain('Heads up');
  });

  it('should remove a notification when close button is clicked', () => {
    notificationService.info('Dismiss me', 0);
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    const closeButton = host.querySelector('button') as HTMLButtonElement;
    closeButton.click();
    fixture.detectChanges();

    expect(notificationService.notifications().length).toBe(0);
    expect(host.querySelector('[data-test="notification-toast"]')).toBeNull();
  });

  it('should auto-remove notifications after configured duration', () => {
    vi.useFakeTimers();

    notificationService.info('Temporary', 1000);
    expect(notificationService.notifications().length).toBe(1);

    vi.advanceTimersByTime(1000);

    expect(notificationService.notifications().length).toBe(0);
    vi.useRealTimers();
  });
});
