import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, Validators } from '@angular/forms';
import { AuthFacade } from '../../core/services/auth.facade';

@Component({
  selector: 'app-reset-password-page',
  templateUrl: './reset-password-page.component.html',
  styleUrl: './login-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class ResetPasswordPageComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly authFacade = inject(AuthFacade);

  readonly passwordRecoveryPending$ = this.authFacade.passwordRecoveryPending$;
  readonly authError$ = this.authFacade.authError$;
  readonly authMessage$ = this.authFacade.authMessage$;
  readonly form = this.formBuilder.nonNullable.group({
    token: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(12)]],
  });

  ngOnInit(): void {
    this.authFacade.clearFeedback();

    const token = this.route.snapshot.queryParamMap.get('token');

    if (token) {
      this.form.patchValue({ token });
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const rawValue = this.form.getRawValue();

    this.authFacade.resetPassword({
      token: rawValue.token.trim(),
      password: rawValue.password,
    });
  }
}
