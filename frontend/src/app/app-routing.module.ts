import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { LoginPageComponent } from './features/auth/login-page.component';
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
    redirectTo: 'login',
  },
  {
    path: 'forgot-password',
    redirectTo: 'login',
  },
  {
    path: 'reset-password',
    redirectTo: 'login',
  },
  {
    path: 'claim-imported-account',
    redirectTo: 'login',
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
    path: 'profile',
    loadComponent: () =>
      import('./features/profile/profile-page.component').then(
        (module) => module.ProfilePageComponent,
      ),
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
