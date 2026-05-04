import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingService } from '../../services/loading.service';

@Component({
  selector: 'app-loading-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (loadingService.isLoading()) {
      <div
        class="loading-bar-container"
        role="progressbar"
        aria-label="Ładowanie strony"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <div class="loading-bar"></div>
      </div>
    }
  `,
  styles: [
    `
      .loading-bar-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 3px;
        z-index: 9999;
        background-color: rgba(255, 255, 255, 0.1);
      }

      .loading-bar {
        height: 100%;
        background: linear-gradient(90deg, #d4af37, #e6c2bf, #d4af37);
        background-size: 200% 100%;
        animation: loading-animation 2s infinite linear;
        width: 100%;
      }

      @keyframes loading-animation {
        0% {
          background-position: 200% 0;
        }
        100% {
          background-position: -200% 0;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingBar {
  public readonly loadingService = inject(LoadingService);
}
