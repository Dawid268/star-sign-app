import {
  Component,
  ChangeDetectionStrategy,
  computed,
  inject,
  signal,
  output,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { map, of, switchMap } from 'rxjs';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  heroBars3,
  heroXMark,
  heroShoppingBag,
  heroUser,
} from '@ng-icons/heroicons/outline';
import { CartService } from '@org/cart';
import { AuthService } from '../../services/auth.service';
import { AccountService } from '../../services/account.service';
import { featureFlags } from '../../feature-flags';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, NgIcon],
  viewProviders: [
    provideIcons({ heroBars3, heroXMark, heroShoppingBag, heroUser }),
  ],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Navbar {
  public readonly openCart = output<void>();
  private readonly cartService: CartService = inject(CartService);
  private readonly authService = inject(AuthService);
  private readonly accountService = inject(AccountService);
  public readonly mobileMenuOpen = signal(false);
  public readonly cartCount = this.cartService.count;
  public readonly isLoggedIn = this.authService.isLoggedIn;
  public readonly isPremium = toSignal(
    toObservable(this.isLoggedIn).pipe(
      switchMap((loggedIn) =>
        loggedIn
          ? this.accountService
              .getMe()
              .pipe(
                map(
                  (me) =>
                    !!(
                      me?.subscription?.hasPremiumAccess ??
                      me?.subscription?.isPremium
                    ),
                ),
              )
          : of(false),
      ),
    ),
    { initialValue: false },
  );
  public readonly shopEnabled = featureFlags.shopEnabled;
  public readonly userTargetPath = computed(() =>
    this.isLoggedIn() ? '/panel' : '/logowanie',
  );
  public readonly userLinkLabel = computed(() =>
    this.isLoggedIn() ? 'Mój Panel' : 'Zaloguj',
  );
  public readonly membershipLabel = computed(() =>
    this.isLoggedIn() ? 'Premium' : 'Dołącz do Kręgu',
  );
  public readonly membershipTargetPath = computed(() =>
    this.isPremium() ? '/panel' : '/premium',
  );

  public readonly navLinks = [
    { label: 'Główna', path: '/', exact: true },
    { label: 'Astrologia', path: '/horoskopy', exact: false },
    { label: 'Kosmogram', path: '/kosmogram', exact: false },
    { label: 'Tarot', path: '/tarot', exact: false },
    { label: 'Numerologia', path: '/numerologia', exact: false },
    { label: 'Blog', path: '/artykuly', exact: false },
    { label: 'Kontakt', path: '/kontakt', exact: false },
    ...(this.shopEnabled
      ? [{ label: 'Sklep', path: '/sklep', exact: false }]
      : []),
  ];

  public toggleMobileMenu(): void {
    this.mobileMenuOpen.update((open) => !open);
  }
}
