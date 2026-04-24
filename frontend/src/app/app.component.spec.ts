import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AuthFacade } from './core/services/auth.facade';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  let authFacade: { bootstrap: jasmine.Spy };

  beforeEach(async () => {
    authFacade = {
      bootstrap: jasmine.createSpy('bootstrap'),
    };

    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule
      ],
      declarations: [
        AppComponent
      ],
      providers: [
        {
          provide: AuthFacade,
          useValue: authFacade,
        },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have as title 'PantryList'`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('PantryList');
  });

  it('should render the shell container', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.app-shell')).not.toBeNull();
  });

  it('does not bootstrap auth session from the app shell', () => {
    const fixture = TestBed.createComponent(AppComponent);

    fixture.detectChanges();

    expect(authFacade.bootstrap).not.toHaveBeenCalled();
  });
});
