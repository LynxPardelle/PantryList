import { NgModule } from '@angular/core';
import { BrowserModule, provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { HttpClientModule, HttpClientXsrfModule } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ClaimImportedAccountPageComponent } from './features/auth/claim-imported-account-page.component';
import { ForgotPasswordPageComponent } from './features/auth/forgot-password-page.component';
import { LoginPageComponent } from './features/auth/login-page.component';
import { RegisterPageComponent } from './features/auth/register-page.component';
import { ResetPasswordPageComponent } from './features/auth/reset-password-page.component';
import { PantryPageComponent } from './features/pantry/pantry-page.component';
import { AuthFacade } from './core/services/auth.facade';
import { SessionService } from './core/services/session.service';
import { authReducer } from './store/auth/auth.reducer';
import { AuthEffects } from './store/auth/auth.effects';
import { productReducer } from './store/product/product.reducer';
import { ProductEffects } from './store/product/product.effects';
import { pantryReducer } from './store/pantry/pantry.reducer';
import { PantryEffects } from './store/pantry/pantry.effects';
import { environment } from '../environments/environment';

@NgModule({
  declarations: [
    AppComponent,
    ClaimImportedAccountPageComponent,
    ForgotPasswordPageComponent,
    LoginPageComponent,
    RegisterPageComponent,
    ResetPasswordPageComponent,
    PantryPageComponent,
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    HttpClientXsrfModule.withOptions({
      cookieName: 'XSRF-TOKEN',
      headerName: 'x-xsrf-token',
    }),
    ReactiveFormsModule,
    AppRoutingModule,
    StoreModule.forRoot({
      auth: authReducer,
      products: productReducer,
      pantry: pantryReducer,
    }),
    EffectsModule.forRoot([AuthEffects, ProductEffects, PantryEffects]),
    ...(environment.enableDevTools
      ? [StoreDevtoolsModule.instrument({
          maxAge: 25,
          logOnly: environment.production,
        })]
      : [])
  ],
  providers: [
    ...(environment.enableHydration
      ? [provideClientHydration(withEventReplay())]
      : []),
    {
      provide: SessionService,
      useExisting: AuthFacade,
    },
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
