import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { featureFlags } from '../feature-flags';

export const shopFeatureGuard: CanMatchFn = () => {
  if (featureFlags.shopEnabled) {
    return true;
  }

  return inject(Router).parseUrl('/');
};
