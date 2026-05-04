import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { SocialShare } from './social-share';
import { AnalyticsService } from '../../core/services/analytics.service';
import { NotificationService } from '../../core/services/notification';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  simpleFacebook,
  simpleX,
  simpleInstagram,
  simpleTiktok,
  simplePinterest,
  simpleWhatsapp,
} from '@ng-icons/simple-icons';
import { heroLink, heroCheck } from '@ng-icons/heroicons/outline';

describe('SocialShare', () => {
  let component: SocialShare;
  let fixture: ComponentFixture<SocialShare>;
  let analyticsMock: any;
  let notificationsMock: any;

  beforeEach(async () => {
    analyticsMock = {
      trackEvent: vi.fn(),
    };
    notificationsMock = {
      success: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [SocialShare],
      providers: [
        { provide: AnalyticsService, useValue: analyticsMock },
        { provide: NotificationService, useValue: notificationsMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SocialShare);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('url', 'https://example.com');
    fixture.componentRef.setInput('title', 'Test Title');
    fixture.detectChanges();

    // Mock window.open
    vi.stubGlobal('open', vi.fn());
    // Mock navigator.clipboard
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should share on Facebook', () => {
    component.shareOnFacebook();
    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining(
        'facebook.com/sharer/sharer.php?u=https%3A%2F%2Fexample.com',
      ),
      '_blank',
      expect.any(String),
    );
    expect(analyticsMock.trackEvent).toHaveBeenCalledWith(
      'share_click',
      expect.objectContaining({ platform: 'facebook' }),
    );
  });

  it('should share on X', () => {
    component.shareOnX();
    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('twitter.com/intent/tweet'),
      '_blank',
      expect.any(String),
    );
    expect(analyticsMock.trackEvent).toHaveBeenCalledWith(
      'share_click',
      expect.objectContaining({ platform: 'twitter' }),
    );
  });

  it('should share on Pinterest', () => {
    component.shareOnPinterest();
    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('pinterest.com/pin/create/button'),
      '_blank',
      expect.any(String),
    );
  });

  it('should share on Whatsapp', () => {
    component.shareOnWhatsapp();
    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('whatsapp.com/send'),
      '_blank',
      expect.any(String),
    );
  });

  it('should copy link to clipboard', async () => {
    vi.useFakeTimers();
    component.copyLink();

    // We need to wait for the promise to resolve
    await Promise.resolve();

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      'https://example.com',
    );
    expect(component.copied()).toBe(true);
    expect(notificationsMock.success).toHaveBeenCalled();
    expect(analyticsMock.trackEvent).toHaveBeenCalledWith(
      'share_copy_link',
      expect.any(Object),
    );

    vi.advanceTimersByTime(2000);
    expect(component.copied()).toBe(false);
    vi.useRealTimers();
  });
});
