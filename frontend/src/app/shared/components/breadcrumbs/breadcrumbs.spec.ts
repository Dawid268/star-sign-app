import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BreadcrumbsComponent } from './breadcrumbs';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { Subject, of } from 'rxjs';
import { By } from '@angular/platform-browser';

describe('BreadcrumbsComponent', () => {
  let component: BreadcrumbsComponent;
  let fixture: ComponentFixture<BreadcrumbsComponent>;
  let routerEvents: Subject<any>;
  let mockRouter: any;

  beforeEach(async () => {
    routerEvents = new Subject<any>();

    mockRouter = {
      events: routerEvents.asObservable(),
      routerState: {
        snapshot: {
          root: {
            children: [
              {
                url: [{ path: 'artykuly' }],
                routeConfig: { path: 'artykuly' },
                children: [
                  {
                    url: [{ path: 'test-slug' }],
                    params: { slug: 'test-slug' },
                    routeConfig: { path: ':slug' },
                    children: [],
                  },
                ],
              },
            ],
          },
        },
      },
    };

    await TestBed.configureTestingModule({
      imports: [BreadcrumbsComponent, RouterTestingModule],
      providers: [{ provide: Router, useValue: mockRouter }],
    }).compileComponents();

    fixture = TestBed.createComponent(BreadcrumbsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should build breadcrumbs from route state', () => {
    // Initial call (startWith(null))
    const crumbs = component.breadcrumbs();
    expect(crumbs.length).toBe(2);
    expect(crumbs[0].label).toBe('Blog');
    expect(crumbs[0].url).toBe('/artykuly');
    expect(crumbs[1].label).toBe('Test slug');
    expect(crumbs[1].url).toBe('/artykuly/test-slug');
  });

  it('should update breadcrumbs on NavigationEnd', () => {
    // Change mock state
    mockRouter.routerState.snapshot.root.children = [
      {
        url: [{ path: 'kontakt' }],
        routeConfig: { path: 'kontakt' },
        children: [],
      },
    ];

    routerEvents.next(new NavigationEnd(1, '/kontakt', '/kontakt'));
    fixture.detectChanges();

    const crumbs = component.breadcrumbs();
    expect(crumbs.length).toBe(1);
    expect(crumbs[0].label).toBe('Kontakt');
    expect(crumbs[0].url).toBe('/kontakt');
  });

  it('should handle dynamic labels (sign)', () => {
    mockRouter.routerState.snapshot.root.children = [
      {
        url: [{ path: 'leo' }],
        params: { sign: 'leo' },
        routeConfig: { path: ':sign' },
        children: [],
      },
    ];

    routerEvents.next(new NavigationEnd(1, '/leo', '/leo'));
    fixture.detectChanges();

    const crumbs = component.breadcrumbs();
    expect(crumbs[0].label).toBe('Leo');
  });

  it('should handle dynamic labels (type)', () => {
    mockRouter.routerState.snapshot.root.children = [
      {
        url: [{ path: 'daily' }],
        params: { type: 'daily' },
        routeConfig: { path: ':type' },
        children: [],
      },
    ];

    routerEvents.next(new NavigationEnd(1, '/daily', '/daily'));
    fixture.detectChanges();

    const crumbs = component.breadcrumbs();
    expect(crumbs[0].label).toBe('Daily');
  });

  it('should return empty if no route config path', () => {
    mockRouter.routerState.snapshot.root.children = [
      {
        url: [{ path: '' }],
        children: [],
      },
    ];
    routerEvents.next(new NavigationEnd(1, '/', '/'));
    fixture.detectChanges();
    expect(component.breadcrumbs().length).toBe(0);
  });
});
