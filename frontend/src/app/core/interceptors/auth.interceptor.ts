import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

const shouldAttachAuthHeader = (url: string): boolean =>
  url.startsWith('/api') || url.includes('/api/');

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!shouldAttachAuthHeader(req.url)) {
    return next(req);
  }

  const authService = inject(AuthService);
  const token = authService.token();

  if (!token) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    })
  );
};
