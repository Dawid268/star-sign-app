import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notificationService = inject(NotificationService);
  const authService = inject(AuthService);
  const router = inject(Router);
  const currentUrl = router.url || '/';

  const isAuthEndpoint =
    req.url.includes('/auth/local') || req.url.includes('/auth/local/register');

  const safeReturnUrl =
    currentUrl.startsWith('/') &&
    !currentUrl.startsWith('/logowanie') &&
    !currentUrl.startsWith('/rejestracja')
      ? currentUrl
      : '/panel';

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage =
        'Wystąpił nieoczekiwany błąd. Spróbuj ponownie później.';

      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = `Błąd: ${error.error.message}`;
      } else {
        // Server-side error
        switch (error.status) {
          case 401:
            errorMessage = 'Twoja sesja wygasła. Zaloguj się ponownie.';
            if (!isAuthEndpoint) {
              authService.expireSession();
            }
            if (!isAuthEndpoint && !currentUrl.startsWith('/logowanie')) {
              void router.navigate(['/logowanie'], {
                queryParams: { returnUrl: safeReturnUrl },
              });
            }
            break;
          case 403:
            errorMessage =
              'Nie masz uprawnień do wykonania tej akcji. Wróć do panelu lub skontaktuj się z administratorem.';
            break;
          case 404:
            errorMessage =
              'Nie znaleziono żądanego zasobu. Sprawdź link lub wróć do poprzedniej strony.';
            break;
          case 500:
            errorMessage =
              'Błąd serwera. Odśwież stronę lub spróbuj ponownie za chwilę.';
            break;
          default:
            errorMessage =
              typeof error.error?.message === 'string' &&
              error.error.message.length < 100
                ? error.error.message
                : 'Wystąpił błąd komunikacji z serwerem.';
        }
      }

      if (!isAuthEndpoint) {
        notificationService.error(errorMessage);
      }
      return throwError(() => error);
    }),
  );
};
