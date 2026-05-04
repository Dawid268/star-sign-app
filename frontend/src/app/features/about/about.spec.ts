import { ComponentFixture, TestBed } from '@angular/core/testing';
import { About } from './about';
import { SeoService } from '../../core/services/seo.service';
import { RouterTestingModule } from '@angular/router/testing';
import { vi } from 'vitest';

describe('About', () => {
  let component: About;
  let fixture: ComponentFixture<About>;
  let seoService: any;

  beforeEach(async () => {
    seoService = {
      updateSeo: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [About, RouterTestingModule],
      providers: [{ provide: SeoService, useValue: seoService }],
    }).compileComponents();

    fixture = TestBed.createComponent(About);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should update SEO on init', () => {
    expect(seoService.updateSeo).toHaveBeenCalledWith(
      'O nas | Star Sign',
      expect.stringContaining('misję i zespół'),
    );
  });
});
