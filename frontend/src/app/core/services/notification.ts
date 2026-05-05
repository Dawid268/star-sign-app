import { Injectable, signal } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'info';

export interface Notification {
  message: string;
  type: NotificationType;
  id: number;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private readonly notificationsSignal = signal<Notification[]>([]);
  public readonly notifications = this.notificationsSignal.asReadonly();
  private nextId = 0;

  public show(
    message: string,
    type: NotificationType = 'info',
    duration = 5000,
  ): void {
    const id = this.nextId++;
    const notification: Notification = { message, type, id };

    this.notificationsSignal.update((prev) => [...prev, notification]);

    if (duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, duration);
    }
  }

  public success(message: string, duration?: number): void {
    this.show(message, 'success', duration);
  }

  public error(message: string, duration?: number): void {
    this.show(message, 'error', duration);
  }

  public info(message: string, duration?: number): void {
    this.show(message, 'info', duration);
  }

  public remove(id: number): void {
    this.notificationsSignal.update((prev) => prev.filter((n) => n.id !== id));
  }
}
