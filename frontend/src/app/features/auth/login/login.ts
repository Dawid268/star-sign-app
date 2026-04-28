import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';

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

  public readonly loading = signal(false);
  public readonly error = signal<string | null>(null);

  public readonly form = this.formBuilder.nonNullable.group({
    identifier: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  public submit(): void {
    if (this.loading() || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { identifier, password } = this.form.getRawValue();
    this.loading.set(true);
    this.error.set(null);

    this.authService.login(identifier, password).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigateByUrl('/panel');
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.error.set(this.toMessage(error));
      },
    });
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
    return message;
  }
}
