import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../services/notification';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  heroCheckCircle,
  heroExclamationCircle,
  heroInformationCircle,
  heroXMark,
} from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-notification-toast',
  standalone: true,
  imports: [CommonModule, NgIcon],
  viewProviders: [
    provideIcons({
      heroCheckCircle,
      heroExclamationCircle,
      heroInformationCircle,
      heroXMark,
    }),
  ],
  template: `
    <div
      class="fixed top-24 right-4 z-[200] flex flex-col gap-3 pointer-events-none"
    >
      @for (
        notification of notificationService.notifications();
        track notification.id
      ) {
        <div
          class="pointer-events-auto flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl animate-slide-in"
          data-test="notification-toast"
          [attr.data-test-type]="notification.type"
          [ngClass]="{
            'bg-white/95 border-mystic-rose/20 text-mystic-cocoa':
              notification.type === 'info',
            'bg-emerald-50/95 border-emerald-200 text-emerald-800':
              notification.type === 'success',
            'bg-rose-50/95 border-rose-200 text-rose-800':
              notification.type === 'error',
          }"
        >
          <ng-icon [name]="getIcon(notification.type)" class="text-xl" />

          <p class="text-sm font-medium leading-tight">
            {{ notification.message }}
          </p>

          <button
            (click)="notificationService.remove(notification.id)"
            class="ml-2 p-1 hover:bg-black/5 rounded-full transition-colors"
            aria-label="Zamknij powiadomienie"
          >
            <ng-icon name="heroXMark" class="text-lg opacity-50" />
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .animate-slide-in {
        animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes slideIn {
        from {
          transform: translateX(100%) scale(0.9);
          opacity: 0;
        }
        to {
          transform: translateX(0) scale(1);
          opacity: 1;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationToastComponent {
  public readonly notificationService = inject(NotificationService);

  getIcon(type: string): string {
    switch (type) {
      case 'success':
        return 'heroCheckCircle';
      case 'error':
        return 'heroExclamationCircle';
      default:
        return 'heroInformationCircle';
    }
  }
}
