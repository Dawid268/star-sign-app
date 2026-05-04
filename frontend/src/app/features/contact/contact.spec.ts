import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { Contact } from './contact';
import { SeoService } from '../../core/services/seo.service';
import { NotificationService } from '../../core/services/notification';
import { provideIcons } from '@ng-icons/core';
import {
  heroEnvelope,
  heroPhone,
  heroMapPin,
  heroPaperAirplane,
} from '@ng-icons/heroicons/outline';
import { FormsModule } from '@angular/forms';
import { vi } from 'vitest';

import { ContactService } from '../../core/services/contact.service';
import { of } from 'rxjs';

describe('Contact Component', () => {
  let component: Contact;
  let fixture: ComponentFixture<Contact>;
  let notificationService: any;
  let contactService: any;

  beforeEach(async () => {
    notificationService = {
      success: vi.fn(),
      error: vi.fn(),
    };
    contactService = {
      sendMessage: vi.fn().mockReturnValue(of({ success: true })),
    };

    await TestBed.configureTestingModule({
      imports: [Contact, FormsModule],
      providers: [
        SeoService,
        { provide: NotificationService, useValue: notificationService },
        { provide: ContactService, useValue: contactService },
        provideIcons({
          heroEnvelope,
          heroPhone,
          heroMapPin,
          heroPaperAirplane,
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Contact);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should handle form submission success', () => {
    component.formData.name = 'Test User';
    component.formData.email = 'test@example.com';
    component.formData.subject = 'Test subject';
    component.formData.message = 'Hello';

    component.onSubmit();

    expect(component.isSubmitting()).toBe(false);
    expect(component.isSuccess()).toBe(true);
    expect(notificationService.success).toHaveBeenCalled();
    expect(component.formData.name).toBe(''); // Form reset
  });

  it('should render only real contact details and no placeholder socials', () => {
    const host = fixture.nativeElement as HTMLElement;

    expect(host.textContent).toContain('kontakt@star-sign.pl');
    expect(host.textContent).not.toContain('+48 123 456 789');
    expect(host.textContent).not.toContain('ul. Gwiezdna 11');
    expect(host.querySelector('a[href="#"]')).toBeNull();
  });
});
