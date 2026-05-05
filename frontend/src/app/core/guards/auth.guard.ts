import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

const toSafeReturnUrl = (value: string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  if (!normalized.startsWith('/') || normalized.startsWith('//')) {
    return null;
  }

  return normalized;
};

export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  if (authService.isLoggedIn()) {
    return true;
  }

  const returnUrl = toSafeReturnUrl(state.url) || '/panel';
  return router.createUrlTree(['/logowanie'], { queryParams: { returnUrl } });
};

export const guestOnlyGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  if (!authService.isLoggedIn()) {
    return true;
  }

  const returnUrl = toSafeReturnUrl(route.queryParamMap.get('returnUrl'));
  return returnUrl
    ? router.parseUrl(returnUrl)
    : router.createUrlTree(['/panel']);
};
