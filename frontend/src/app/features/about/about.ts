import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/services/seo.service';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './about.html',
  styleUrl: './about.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class About {
  private readonly seoService = inject(SeoService);

  constructor() {
    this.seoService.updateSeo(
      'O nas | Star Sign',
      'Poznaj naszą misję i zespół stojący za Star Sign. Odkrywamy tajemnice gwiazd i pomagamy odnaleźć Twoją ścieżkę.',
    );
  }
}
