import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Register {
  private readonly authService = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);

  public readonly loading = signal(false);
  public readonly error = signal<string | null>(null);

  public readonly form = this.formBuilder.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required, Validators.minLength(6)]],
  });

  public submit(): void {
    if (this.loading() || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { username, email, password, confirmPassword } = this.form.getRawValue();
    if (password !== confirmPassword) {
      this.error.set('Hasła muszą być identyczne.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.authService
      .register({
        username,
        email,
        password,
      })
      .subscribe({
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
      if (error.status === 400) {
        return 'Nie udało się utworzyć konta. Sprawdź dane i spróbuj ponownie.';
      }
    }
    return 'Rejestracja chwilowo niedostępna. Spróbuj ponownie za chwilę.';
  }

  private translateBackendMessage(message: unknown): string | null {
    if (typeof message !== 'string' || !message.trim()) {
      return null;
    }

    const normalized = message.toLowerCase();
    if (normalized.includes('email or username are already taken')) {
      return 'Taki e-mail lub nazwa użytkownika już istnieje.';
    }
    if (normalized.includes('password is too short')) {
      return 'Hasło jest zbyt krótkie.';
    }
    if (normalized.includes('invalid email')) {
      return 'Podany adres e-mail jest nieprawidłowy.';
    }
    if (normalized.includes('too many requests')) {
      return 'Zbyt wiele prób rejestracji. Spróbuj ponownie za chwilę.';
    }
    return message;
  }
}
