import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { ClaimImportedAccountPageComponent } from './features/auth/claim-imported-account-page.component';
import { ForgotPasswordPageComponent } from './features/auth/forgot-password-page.component';
import { LoginPageComponent } from './features/auth/login-page.component';
import { RegisterPageComponent } from './features/auth/register-page.component';
import { ResetPasswordPageComponent } from './features/auth/reset-password-page.component';
import { PantryPageComponent } from './features/pantry/pantry-page.component';

const routes: Routes = [
  {
    path: 'login',
    component: LoginPageComponent,
    canActivate: [AuthGuard],
    data: {
      authMode: 'anonymous',
    },
  },
  {
    path: 'register',
    component: RegisterPageComponent,
    canActivate: [AuthGuard],
    data: {
      authMode: 'anonymous',
    },
  },
  {
    path: 'forgot-password',
    component: ForgotPasswordPageComponent,
    canActivate: [AuthGuard],
    data: {
      authMode: 'anonymous',
    },
  },
  {
    path: 'reset-password',
    component: ResetPasswordPageComponent,
    canActivate: [AuthGuard],
    data: {
      authMode: 'anonymous',
    },
  },
  {
    path: 'claim-imported-account',
    component: ClaimImportedAccountPageComponent,
    canActivate: [AuthGuard],
    data: {
      authMode: 'anonymous',
    },
  },
  {
    path: 'pantry',
    component: PantryPageComponent,
    canActivate: [AuthGuard],
    data: {
      authMode: 'authenticated',
    },
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'pantry',
  },
  {
    path: '**',
    redirectTo: 'pantry',
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    scrollPositionRestoration: 'enabled',
  })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
