import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Login } from './login';
import { AuthService } from '../../../core/services/auth.service';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { vi } from 'vitest';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let authService: any;
  let router: any;

  beforeEach(async () => {
    authService = {
      login: vi.fn().mockReturnValue(of({})),
    };
    router = {
      navigateByUrl: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [Login, RouterTestingModule, ReactiveFormsModule],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should submit form and navigate on success', () => {
    component.form.setValue({
      identifier: 'test@example.com',
      password: 'password123',
    });
    component.submit();
    expect(authService.login).toHaveBeenCalledWith(
      'test@example.com',
      'password123',
    );
    expect(router.navigateByUrl).toHaveBeenCalledWith('/panel');
  });

  it('should trim and normalize identifier before login', () => {
    component.form.setValue({
      identifier: '  Test@Example.COM  ',
      password: 'password123',
    });

    component.submit();

    expect(authService.login).toHaveBeenCalledWith(
      'test@example.com',
      'password123',
    );
  });

  it('should handle login error', () => {
    authService.login.mockReturnValue(
      throwError(() => ({ error: { message: 'invalid' } })),
    );
    component.form.setValue({
      identifier: 'wrong@example.com',
      password: 'wrongpassword',
    });
    component.submit();
    expect(component.error()).toBeTruthy();
  });

  it('should not submit if form is invalid', () => {
    component.form.setValue({ identifier: 'invalid', password: '123' });
    component.submit();
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('should handle account blocked error', () => {
    authService.login.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { error: { message: 'Your account is blocked' } },
          }),
      ),
    );
    component.form.setValue({
      identifier: 'test@example.com',
      password: 'password123',
    });
    component.submit();
    expect(component.error()).toBe(
      'Konto jest zablokowane. Skontaktuj się z administracją.',
    );
  });

  it('should handle too many requests error', () => {
    authService.login.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 429,
            error: { message: 'Too many requests' },
          }),
      ),
    );
    component.form.setValue({
      identifier: 'test@example.com',
      password: 'password123',
    });
    component.submit();
    expect(component.error()).toBe(
      'Zbyt wiele prób logowania. Spróbuj ponownie za chwilę.',
    );
  });

  it('should handle generic server error', () => {
    authService.login.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 })),
    );
    component.form.setValue({
      identifier: 'test@example.com',
      password: 'password123',
    });
    component.submit();
    expect(component.error()).toBe(
      'Nie udało się zalogować. Spróbuj ponownie za chwilę.',
    );
  });

  it('should disable form during submit without sending duplicate login request', () => {
    const pendingLogin = new Subject<unknown>();
    const warnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    authService.login.mockReturnValue(pendingLogin);

    component.form.setValue({
      identifier: 'test@example.com',
      password: 'password123',
    });

    component.submit();
    component.submit();

    expect(authService.login).toHaveBeenCalledTimes(1);
    expect(component.form.disabled).toBe(true);
    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('disabled attribute'),
    );

    pendingLogin.next({});
    pendingLogin.complete();

    expect(component.form.enabled).toBe(true);
    warnSpy.mockRestore();
  });
});
