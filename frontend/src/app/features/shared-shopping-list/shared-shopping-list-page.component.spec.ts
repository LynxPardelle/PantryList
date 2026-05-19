import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { SharedShoppingListPageComponent } from './shared-shopping-list-page.component';

describe('SharedShoppingListPageComponent', () => {
  let fixture: ComponentFixture<SharedShoppingListPageComponent>;

  it('renders a valid temporary shopping list token', async () => {
    fixture = await createComponent({
      version: 1,
      type: 'shopping-list',
      createdAt: '2026-05-19T12:00:00.000Z',
      expiresAt: '2099-05-19T12:00:00.000Z',
      text: 'Lista de compras PantryList\n- Arroz: 2 kg',
    });

    const compiled = fixture.nativeElement as HTMLElement;
    const textarea = compiled.querySelector<HTMLTextAreaElement>(
      '.shopping-export-text',
    );

    expect(compiled.textContent).toContain('Lista compartida');
    expect(textarea?.value).toContain('Arroz: 2 kg');
    expect(
      compiled.querySelector<HTMLAnchorElement>('.whatsapp-link')?.href,
    ).toContain('https://wa.me/');
  });

  it('rejects an expired temporary shopping list token', async () => {
    fixture = await createComponent({
      version: 1,
      type: 'shopping-list',
      createdAt: '2026-05-01T12:00:00.000Z',
      expiresAt: '2026-05-02T12:00:00.000Z',
      text: 'Lista caducada',
    });

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('Este enlace ya caducó');
    expect(compiled.querySelector('.shopping-export-text')).toBeNull();
  });

  async function createComponent(payload: Record<string, unknown>) {
    const token = toBase64Url(JSON.stringify(payload));

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [SharedShoppingListPageComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: of(convertToParamMap({ token })),
          },
        },
      ],
    }).compileComponents();

    const componentFixture = TestBed.createComponent(
      SharedShoppingListPageComponent,
    );
    componentFixture.detectChanges();

    return componentFixture;
  }

  function toBase64Url(value: string): string {
    return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
});
