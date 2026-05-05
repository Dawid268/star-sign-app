import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Skeleton } from './skeleton';
import { By } from '@angular/platform-browser';

describe('Skeleton', () => {
  let component: Skeleton;
  let fixture: ComponentFixture<Skeleton>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Skeleton],
    }).compileComponents();

    fixture = TestBed.createComponent(Skeleton);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default styles', () => {
    const div = fixture.debugElement.query(
      By.css('.skeleton-item'),
    ).nativeElement;
    expect(div.style.width).toBe('100%');
    expect(div.style.height).toBe('20px');
    expect(div.style.borderRadius).toBe('4px');
  });

  it('should apply custom styles', () => {
    fixture.componentRef.setInput('width', '50px');
    fixture.componentRef.setInput('height', '50px');
    fixture.componentRef.setInput('borderRadius', '50%');
    fixture.detectChanges();

    const div = fixture.debugElement.query(
      By.css('.skeleton-item'),
    ).nativeElement;
    expect(div.style.width).toBe('50px');
    expect(div.style.height).toBe('50px');
    expect(div.style.borderRadius).toBe('50%');
  });
});
