import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { featureFlags } from '../../core/feature-flags';

@Component({
  selector: 'app-checkout-cancel',
  imports: [RouterLink],
  templateUrl: './checkout-cancel.html',
  styleUrl: './checkout-cancel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutCancel {
  public readonly shopEnabled = featureFlags.shopEnabled;
}
