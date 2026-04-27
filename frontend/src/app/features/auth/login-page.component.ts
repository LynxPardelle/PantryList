import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthFacade } from '../../core/services/auth.facade';

@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class LoginPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly authFacade = inject(AuthFacade);

  readonly appName = environment.appName;
  readonly loginPending$ = this.authFacade.loginPending$;
  readonly authError$ = this.authFacade.authError$;

  ngOnInit(): void {
    this.authFacade.clearFeedback();
  }

  startCognitoLogin(provider?: string): void {
    this.authFacade.startCognitoLogin(
      provider,
      this.route.snapshot.queryParamMap.get('redirectTo'),
    );
  }
}
