import { Injectable, inject, signal } from '@angular/core';
import {
  Router,
  NavigationStart,
  NavigationEnd,
  NavigationCancel,
  NavigationError,
} from '@angular/router';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  private readonly router = inject(Router);

  public readonly isLoading = signal(false);
  private activeRequests = 0;

  constructor() {
    this.router.events
      .pipe(
        filter(
          (event) =>
            event instanceof NavigationStart ||
            event instanceof NavigationEnd ||
            event instanceof NavigationCancel ||
            event instanceof NavigationError,
        ),
      )
      .subscribe((event) => {
        if (event instanceof NavigationStart) {
          this.isLoading.set(true);
        } else {
          this.isLoading.set(false);
        }
      });
  }

  public setHttpLoading(loading: boolean): void {
    if (loading) {
      this.activeRequests++;
    } else {
      this.activeRequests = Math.max(0, this.activeRequests - 1);
    }

    // Router loading takes precedence if it's already true,
    // otherwise we use the state of active requests
    this.isLoading.set(this.activeRequests > 0);
  }
}
