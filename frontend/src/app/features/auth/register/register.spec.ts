import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Register } from './register';
import { AuthService } from '../../../core/services/auth.service';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { vi } from 'vitest';

describe('Register', () => {
  let component: Register;
  let fixture: ComponentFixture<Register>;
  let authService: any;
  let router: any;

  beforeEach(async () => {
    authService = {
      register: vi.fn().mockReturnValue(of({})),
    };
    router = {
      navigateByUrl: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [Register, RouterTestingModule, ReactiveFormsModule],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compileComponents();

    fixture = TestBed.createComponent(Register);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should register and navigate on success', () => {
    component.form.setValue({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });
    component.submit();
    expect(authService.register).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/panel');
  });

  it('should show error if passwords mismatch', () => {
    component.form.setValue({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'different',
    });
    component.submit();
    expect(component.error()).toBe('Hasła muszą być identyczne.');
    expect(authService.register).not.toHaveBeenCalled();
  });

  it('should handle email already taken error', () => {
    authService.register.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: {
              error: { message: 'Email or username are already taken' },
            },
          }),
      ),
    );
    component.form.setValue({
      username: 'testuser',
      email: 'taken@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });
    component.submit();
    expect(component.error()).toBe(
      'Taki e-mail lub nazwa użytkownika już istnieje.',
    );
  });

  it('should handle generic registration error', () => {
    authService.register.mockReturnValue(throwError(() => new Error('fail')));
    component.form.setValue({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });
    component.submit();
    expect(component.error()).toBe(
      'Rejestracja chwilowo niedostępna. Spróbuj ponownie za chwilę.',
    );
  });

  it('should disable form during submit without sending duplicate register request', () => {
    const pendingRegister = new Subject<unknown>();
    const warnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => undefined);
    authService.register.mockReturnValue(pendingRegister);

    component.form.setValue({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });

    component.submit();
    component.submit();

    expect(authService.register).toHaveBeenCalledTimes(1);
    expect(component.form.disabled).toBe(true);
    expect(warnSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('disabled attribute'),
    );

    pendingRegister.next({});
    pendingRegister.complete();

    expect(component.form.enabled).toBe(true);
    warnSpy.mockRestore();
  });
});
