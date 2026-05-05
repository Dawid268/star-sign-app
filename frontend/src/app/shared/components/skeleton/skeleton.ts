import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="skeleton-item"
      [style.width]="width()"
      [style.height]="height()"
      [style.border-radius]="borderRadius()"
    ></div>
  `,
  styles: [
    `
      .skeleton-item {
        display: inline-block;
        background: linear-gradient(
          90deg,
          rgba(212, 175, 55, 0.05) 25%,
          rgba(212, 175, 55, 0.1) 50%,
          rgba(212, 175, 55, 0.05) 75%
        );
        background-size: 200% 100%;
        animation: skeleton-pulse 1.5s infinite linear;
      }

      @keyframes skeleton-pulse {
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
export class Skeleton {
  public readonly width = input<string>('100%');
  public readonly height = input<string>('20px');
  public readonly borderRadius = input<string>('4px');
}
