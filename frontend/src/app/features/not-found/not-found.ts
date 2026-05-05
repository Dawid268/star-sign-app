import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/services/seo.service';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './not-found.html',
  styleUrl: './not-found.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFound {
  private readonly seoService = inject(SeoService);

  constructor() {
    this.seoService.updateSeo(
      'Strona nie znaleziona | Star Sign',
      'Wygląda na to, że ta gwiazda jeszcze nie została odkryta. Wróć na stronę główną, by kontynuować swoją podróż.',
    );
  }
}
