import { provideZoneChangeDetection } from '@angular/core';
import { platformBrowser } from '@angular/platform-browser';
import { AppModule } from './app/app.module';

platformBrowser()
  .bootstrapModule(AppModule, {
    applicationProviders: [
      provideZoneChangeDetection({ eventCoalescing: true }),
    ],
  })
  .then(() => registerPantryListServiceWorker())
  .catch((err) => console.error(err));

function registerPantryListServiceWorker(): void {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/pantrylist-sw.js').catch(() => {
      // Offline support is optional; a failed registration must not block login.
    });
  });
}
