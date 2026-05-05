import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { PublicMaintenanceModeSettings } from '@star-sign-monorepo/shared-types';

@Component({
  selector: 'app-maintenance-mode',
  standalone: true,
  templateUrl: './maintenance-mode.html',
  styleUrl: './maintenance-mode.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MaintenanceMode {
  public readonly settings = input.required<PublicMaintenanceModeSettings>();
  public readonly checking = input(false);

  public readonly title = computed(() =>
    this.checking() ? 'Sprawdzamy status Star Sign' : this.settings().title,
  );

  public readonly message = computed(() =>
    this.checking()
      ? 'Łączymy się z centrum dowodzenia, zanim pokażemy stronę.'
      : this.settings().message,
  );

  public formatEta(eta: string | null): string | null {
    if (!eta) {
      return null;
    }

    const date = new Date(eta);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return new Intl.DateTimeFormat('pl-PL', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }
}
