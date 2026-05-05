import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { LoadingBar } from './loading-bar';
import { LoadingService } from '../../services/loading.service';

describe('LoadingBar', () => {
  let fixture: ComponentFixture<LoadingBar>;
  const isLoading = signal(false);

  beforeEach(async () => {
    isLoading.set(false);

    await TestBed.configureTestingModule({
      imports: [LoadingBar],
      providers: [
        {
          provide: LoadingService,
          useValue: {
            isLoading,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoadingBar);
  });

  it('does not render the progress bar while idle', () => {
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[role="progressbar"]'),
    ).toBeNull();
  });

  it('renders the progress bar while loading', () => {
    isLoading.set(true);
    fixture.detectChanges();

    const progressbar = fixture.nativeElement.querySelector(
      '[role="progressbar"]',
    );

    expect(progressbar).not.toBeNull();
    expect(progressbar.getAttribute('aria-label')).toBe('Ładowanie strony');
  });
});
