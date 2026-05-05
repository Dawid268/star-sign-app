import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
} from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

type DemoAccount = {
  label: string;
  description: string;
  identifier: string;
  password: string;
};

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly authService = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  public readonly loading = signal(false);
  public readonly error = signal<string | null>(null);
  public readonly demoAccounts: DemoAccount[] = environment.production
    ? []
    : [
        {
          label: 'Demo',
          description: 'Bezpłatny profil startowy',
          identifier: 'demo@starsign.local',
          password: 'Test1234!',
        },
        {
          label: 'Premium',
          description: 'Profil z aktywną subskrypcją',
          identifier: 'premium@starsign.local',
          password: 'Test1234!',
        },
      ];

  public readonly form = this.formBuilder.nonNullable.group({
    identifier: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  public submit(): void {
    if (this.loading()) {
      return;
    }

    const rawValue = this.form.getRawValue();
    const identifier = rawValue.identifier.trim().toLowerCase();
    if (identifier !== rawValue.identifier) {
      this.form.controls.identifier.setValue(identifier, { emitEvent: false });
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.setFormDisabled(true);
    this.error.set(null);

    this.authService.login(identifier, rawValue.password).subscribe({
      next: () => {
        this.setFormDisabled(false);
        this.router.navigateByUrl(this.resolveReturnUrl());
      },
      error: (error: unknown) => {
        this.setFormDisabled(false);
        this.error.set(this.toMessage(error));
      },
    });
  }

  public useDemoAccount(account: DemoAccount): void {
    this.form.setValue({
      identifier: account.identifier,
      password: account.password,
    });
    this.error.set(null);
  }

  private toMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const backendMessageRaw =
        error.error?.error?.message ||
        error.error?.message ||
        (typeof error.error === 'string' ? error.error : null);
      const backendMessage = this.translateBackendMessage(backendMessageRaw);
      if (backendMessage) {
        return String(backendMessage);
      }
      if (error.status === 400 || error.status === 401) {
        return 'Nieprawidłowy e-mail lub hasło.';
      }
    }
    return 'Nie udało się zalogować. Spróbuj ponownie za chwilę.';
  }

  private translateBackendMessage(message: unknown): string | null {
    if (typeof message !== 'string' || !message.trim()) {
      return null;
    }

    const normalized = message.toLowerCase();
    if (normalized.includes('invalid identifier or password')) {
      return 'Nieprawidłowy e-mail lub hasło.';
    }
    if (normalized.includes('blocked')) {
      return 'Konto jest zablokowane. Skontaktuj się z administracją.';
    }
    if (normalized.includes('too many requests')) {
      return 'Zbyt wiele prób logowania. Spróbuj ponownie za chwilę.';
    }
    return 'Wystąpił nieoczekiwany błąd serwera.';
  }

  private setFormDisabled(disabled: boolean): void {
    this.loading.set(disabled);
    if (disabled) {
      this.form.disable({ emitEvent: false });
      return;
    }

    this.form.enable({ emitEvent: false });
  }

  private resolveReturnUrl(): string {
    const raw = this.route.snapshot.queryParamMap.get('returnUrl');
    if (!raw) {
      return '/panel';
    }

    const normalized = raw.trim();
    if (!normalized.startsWith('/') || normalized.startsWith('//')) {
      return '/panel';
    }

    return normalized;
  }
}
