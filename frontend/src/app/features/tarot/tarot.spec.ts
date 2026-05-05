import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Tarot } from './tarot';
import { RouterTestingModule } from '@angular/router/testing';

describe('Tarot', () => {
  let component: Tarot;
  let fixture: ComponentFixture<Tarot>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Tarot, RouterTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(Tarot);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have spreads defined', () => {
    expect(component.spreads.length).toBeGreaterThan(0);
    expect(component.spreads[0].name).toBe('Karta Dnia');
  });
});
