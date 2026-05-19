import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { take } from 'rxjs';
import { PantryService } from '../../core/services/pantry.service';

interface ShoppingSharePayload {
  version: 1;
  type: 'shopping-list';
  createdAt: string;
  expiresAt: string;
  text: string;
}

@Component({
  selector: 'app-shared-shopping-list-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="shared-shopping-page" aria-labelledby="shared-shopping-title">
      <section class="shared-shopping-hero">
        <p class="eyebrow">PantryList</p>
        <h1 id="shared-shopping-title">Lista compartida</h1>
        <p>
          Este enlace muestra una lista de compra temporal. No abre acceso a la
          cuenta ni a la despensa completa. El contenido se carga desde
          PantryList cuando el enlace sigue vigente.
        </p>
      </section>

      @if (errorMessage) {
        <section class="error-banner" role="alert">
          <strong>{{ errorMessage }}</strong>
          <a class="ghost-button" routerLink="/pantry">Ir a PantryList</a>
        </section>
      } @else if (loading) {
        <section class="shared-shopping-card" aria-live="polite">
          <p class="helper-copy">Cargando lista compartida...</p>
        </section>
      } @else if (sharedText) {
        <section class="shared-shopping-card">
          @if (expiresAt) {
            <p class="helper-copy">
              Disponible hasta
              {{ expiresAt | date: 'dd MMM y, HH:mm' : 'UTC' }} UTC.
            </p>
          }

          <textarea
            class="shopping-export-text"
            aria-label="Lista de compras compartida"
            [value]="sharedText"
            readonly
          ></textarea>

          <a
            class="ghost-button whatsapp-link"
            [href]="getWhatsAppShoppingUrl(sharedText)"
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir en WhatsApp
          </a>
        </section>
      }
    </main>
  `,
  styles: [
    `
      .shared-shopping-page {
        width: min(760px, calc(100% - 2rem));
        margin: 0 auto;
        padding: 2rem 0 3rem;
      }

      .shared-shopping-hero,
      .shared-shopping-card,
      .error-banner {
        border: 1px solid var(--color-border);
        border-radius: 24px;
        background: var(--color-surface-elevated);
        box-shadow: var(--shadow-soft);
        padding: 1.5rem;
      }

      .shared-shopping-card,
      .error-banner {
        display: grid;
        gap: 1rem;
        margin-top: 1rem;
      }

      .shared-shopping-hero h1 {
        margin: 0;
        font-size: clamp(2.1rem, 5vw, 3.2rem);
      }

      .shopping-export-text {
        width: 100%;
        min-height: 16rem;
        resize: vertical;
      }
    `,
  ],
})
export class SharedShoppingListPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly pantryService = inject(PantryService);
  private readonly changeDetector = inject(ChangeDetectorRef);

  sharedText: string | null = null;
  expiresAt: Date | null = null;
  errorMessage: string | null = null;
  loading = false;

  ngOnInit(): void {
    this.route.queryParamMap.pipe(take(1)).subscribe((params) => {
      const token = params.get('token');

      if (!token) {
        this.errorMessage = 'Enlace inválido.';
        return;
      }

      this.loading = true;
      this.pantryService
        .resolveShoppingShare(token)
        .pipe(take(1))
        .subscribe({
          next: (share) => {
            this.loading = false;
            this.sharedText = share.text;
            this.expiresAt = share.expiresAt;
            this.changeDetector.markForCheck();
          },
          error: (error) => {
            this.loading = false;

            if (this.tryLoadLegacyToken(token)) {
              this.changeDetector.markForCheck();
              return;
            }

            this.errorMessage = this.getShareErrorMessage(error);
            this.changeDetector.markForCheck();
          },
        });
    });
  }

  getWhatsAppShoppingUrl(exportText: string): string {
    return `https://wa.me/?text=${encodeURIComponent(exportText)}`;
  }

  private tryLoadLegacyToken(token: string): boolean {
    const payload = this.decodeToken(token);

    if (!payload) {
      return false;
    }

    const expiresAt = new Date(payload.expiresAt);

    if (Number.isNaN(expiresAt.getTime())) {
      this.errorMessage = 'Enlace inválido.';
      return true;
    }

    if (expiresAt.getTime() <= Date.now()) {
      this.errorMessage = 'Este enlace ya caducó.';
      return true;
    }

    this.sharedText = payload.text;
    this.expiresAt = expiresAt;

    return true;
  }

  private getShareErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 410) {
      return 'Este enlace ya caducó o fue revocado.';
    }

    return 'Enlace inválido.';
  }

  private decodeToken(token: string): ShoppingSharePayload | null {
    try {
      const normalizedToken = token.replace(/-/g, '+').replace(/_/g, '/');
      const paddedToken = normalizedToken.padEnd(
        Math.ceil(normalizedToken.length / 4) * 4,
        '=',
      );
      const binary = atob(paddedToken);
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
      const parsed = JSON.parse(
        new TextDecoder().decode(bytes),
      ) as Partial<ShoppingSharePayload>;

      if (
        parsed.version !== 1 ||
        parsed.type !== 'shopping-list' ||
        typeof parsed.createdAt !== 'string' ||
        typeof parsed.expiresAt !== 'string' ||
        typeof parsed.text !== 'string' ||
        parsed.text.trim().length === 0
      ) {
        return null;
      }

      return parsed as ShoppingSharePayload;
    } catch {
      return null;
    }
  }
}
