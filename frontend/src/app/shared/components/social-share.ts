import {
  ChangeDetectionStrategy,
  Component,
  input,
  inject,
  signal,
} from '@angular/core';
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
import { AnalyticsService } from '../../core/services/analytics.service';
import { NotificationService } from '../../core/services/notification';

@Component({
  selector: 'app-social-share',
  standalone: true,
  imports: [NgIcon],
  templateUrl: './social-share.html',
  styleUrl: './social-share.scss',
  viewProviders: [
    provideIcons({
      simpleFacebook,
      simpleX,
      simpleInstagram,
      simpleTiktok,
      simplePinterest,
      simpleWhatsapp,
      heroLink,
      heroCheck,
    }),
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SocialShare {
  private readonly analytics = inject(AnalyticsService);
  private readonly notifications = inject(NotificationService);

  public url = input.required<string>();
  public title = input.required<string>();
  public excerpt = input<string>('');

  public copied = signal(false);

  public shareOnFacebook(): void {
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(this.url())}`;
    this.openWindow(shareUrl, 'facebook');
  }

  public shareOnX(): void {
    const shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(this.url())}&text=${encodeURIComponent(this.title())}&hashtags=StarSign,Astrologia`;
    this.openWindow(shareUrl, 'twitter');
  }

  public shareOnPinterest(): void {
    const shareUrl = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(this.url())}&description=${encodeURIComponent(this.title())}`;
    this.openWindow(shareUrl, 'pinterest');
  }

  public shareOnWhatsapp(): void {
    const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(this.title() + ' ' + this.url())}`;
    this.openWindow(shareUrl, 'whatsapp');
  }

  public copyLink(): void {
    navigator.clipboard.writeText(this.url()).then(() => {
      this.copied.set(true);
      this.notifications.success('Link skopiowany do schowka! ✦');
      this.analytics.trackEvent('share_copy_link', { url: this.url() });

      setTimeout(() => this.copied.set(false), 2000);
    });
  }

  private openWindow(url: string, platform: string): void {
    this.analytics.trackEvent('share_click', { platform, url: this.url() });
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=400');
  }
}
