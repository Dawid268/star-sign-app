import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NewsletterActionPage } from './newsletter-action';
import { ActivatedRoute } from '@angular/router';
import { NewsletterService } from '../../core/services/newsletter.service';
import { of, throwError } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';
import { vi } from 'vitest';

describe('NewsletterActionPage', () => {
  let component: NewsletterActionPage;
  let fixture: ComponentFixture<NewsletterActionPage>;
  let newsletterService: any;

  beforeEach(async () => {
    newsletterService = {
      confirm: vi.fn().mockReturnValue(of({})),
      unsubscribe: vi.fn().mockReturnValue(of({})),
    };

    await TestBed.configureTestingModule({
      imports: [NewsletterActionPage, RouterTestingModule],
      providers: [
        { provide: NewsletterService, useValue: newsletterService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              data: { action: 'confirm' },
              queryParamMap: { get: () => 'token123' },
            },
            queryParamMap: of({ get: () => 'token123' }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NewsletterActionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and confirm on init', () => {
    expect(component).toBeTruthy();
    expect(newsletterService.confirm).toHaveBeenCalledWith('token123');
  });

  it('should handle error', () => {
    newsletterService.confirm.mockReturnValue(
      throwError(() => new Error('fail')),
    );
    // Re-create component to trigger constructor logic with error
    fixture = TestBed.createComponent(NewsletterActionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component.status()).toBe('error');
  });
});
