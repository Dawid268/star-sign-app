import {
  Component,
  ChangeDetectionStrategy,
  computed,
  signal,
  inject,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  heroEnvelope,
  heroPhone,
  heroMapPin,
  heroPaperAirplane,
} from '@ng-icons/heroicons/outline';
import { SeoService } from '../../core/services/seo.service';
import { NotificationService } from '../../core/services/notification';
import { ContactService } from '../../core/services/contact.service';
import { RuntimeConfigService } from '../../core/services/runtime-config.service';
import { TurnstileWidget } from '../../shared/components/turnstile/turnstile-widget';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [FormsModule, NgIcon, TurnstileWidget],
  viewProviders: [
    provideIcons({ heroEnvelope, heroPhone, heroMapPin, heroPaperAirplane }),
  ],
  templateUrl: './contact.html',
  styleUrl: './contact.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Contact {
  private readonly seoService = inject(SeoService);
  private readonly notificationService = inject(NotificationService);
  private readonly contactService = inject(ContactService);
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private readonly turnstileWidget = viewChild(TurnstileWidget);

  public readonly isSubmitting = signal(false);
  public readonly isSuccess = signal(false);
  public readonly error = signal<string | null>(null);
  public readonly turnstileToken = signal('');
  public readonly contactEmail = 'kontakt@star-sign.pl';
  public readonly contactPhone: string | null = null;
  public readonly contactAddress: string | null = null;
  public readonly socials: { label: string; href: string }[] = [];
  private readonly formRevision = signal(0);
  public readonly turnstileRequired = computed(() =>
    this.runtimeConfig.turnstileEnabled(),
  );

  public readonly formData = {
    name: '',
    email: '',
    subject: '',
    message: '',
  };

  private readonly emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  constructor() {
    this.seoService.updateSeo(
      'Kontakt | Star Sign',
      'Masz pytania dotyczące swojego horoskopu lub zamówienia? Skontaktuj się z nami. Jesteśmy tu, by Ci pomóc.',
    );
  }

  public onSubmit(): void {
    if (this.isSubmitting()) return;

    if (!this.isFormReady()) {
      this.error.set('Proszę wypełnić wszystkie pola.');
      return;
    }

    if (this.turnstileRequired() && !this.turnstileToken()) {
      this.error.set('Potwierdź, że nie jesteś botem.');
      return;
    }

    this.isSubmitting.set(true);
    this.error.set(null);

    this.contactService
      .sendMessage({
        ...this.formData,
        turnstileToken: this.turnstileToken() || undefined,
      })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.isSuccess.set(true);
          this.notificationService.success(
            'Twoja wiadomość została wysłana! Odpowiemy tak szybko, jak to możliwe. ✦',
          );

          // Reset form
          this.formData.name = '';
          this.formData.email = '';
          this.formData.subject = '';
          this.formData.message = '';
          this.resetTurnstile();
        },
        error: (error: unknown) => {
          this.isSubmitting.set(false);
          this.error.set(this.extractErrorMessage(error));
          this.resetTurnstile();
        },
      });
  }

  public isFormReady(): boolean {
    this.formRevision();

    return (
      Boolean(this.formData.name.trim()) &&
      this.emailPattern.test(this.formData.email.trim()) &&
      Boolean(this.formData.subject.trim()) &&
      Boolean(this.formData.message.trim()) &&
      (!this.turnstileRequired() || Boolean(this.turnstileToken()))
    );
  }

  public handleTurnstileToken(token: string): void {
    this.turnstileToken.set(token);
  }

  public handleFormChange(): void {
    this.formRevision.update((revision) => revision + 1);
  }

  private resetTurnstile(): void {
    this.turnstileToken.set('');
    this.turnstileWidget()?.reset();
  }

  private extractErrorMessage(error: unknown): string {
    if (error && typeof error === 'object') {
      const record = error as Record<string, unknown>;
      const payload = record['error'];
      if (payload && typeof payload === 'object') {
        const message = (payload as Record<string, unknown>)['message'];
        if (typeof message === 'string' && message.trim()) {
          return message;
        }
      }
    }

    return 'Nie udało się wysłać wiadomości. Spróbuj ponownie później.';
  }
}
