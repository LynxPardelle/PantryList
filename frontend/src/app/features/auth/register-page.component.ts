import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, Validators } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { AuthFacade } from '../../core/services/auth.facade';

@Component({
  selector: 'app-register-page',
  templateUrl: './register-page.component.html',
  styleUrl: './login-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class RegisterPageComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly authFacade = inject(AuthFacade);

  readonly appName = environment.appName;
  readonly registerPending$ = this.authFacade.registerPending$;
  readonly authError$ = this.authFacade.authError$;
  readonly redirectQueryParams = this.buildRedirectQueryParams();
  readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    username: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(40)]],
    password: ['', [Validators.required, Validators.minLength(12)]],
  });

  ngOnInit(): void {
    this.authFacade.clearFeedback();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const rawValue = this.form.getRawValue();

    this.authFacade.register(
      {
        email: rawValue.email.trim(),
        username: rawValue.username.trim(),
        password: rawValue.password,
      },
      this.route.snapshot.queryParamMap.get('redirectTo'),
    );
  }

  private buildRedirectQueryParams(): { redirectTo: string } | undefined {
    const redirectTo = this.route.snapshot.queryParamMap.get('redirectTo');

    return redirectTo ? { redirectTo } : undefined;
  }
}
