import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LegalPage } from './legal-page';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';

describe('LegalPage', () => {
  let component: LegalPage;
  let fixture: ComponentFixture<LegalPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LegalPage, RouterTestingModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              data: { page: 'terms' },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LegalPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load terms', () => {
    expect(component).toBeTruthy();
    expect(component.page.title).toBe('Regulamin');
  });

  it('should display sections', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelectorAll('h2').length).toBeGreaterThan(0);
  });
});
