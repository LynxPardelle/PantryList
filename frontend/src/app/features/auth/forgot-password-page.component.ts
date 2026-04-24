import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AuthFacade } from '../../core/services/auth.facade';

@Component({
  selector: 'app-forgot-password-page',
  templateUrl: './forgot-password-page.component.html',
  styleUrl: './login-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class ForgotPasswordPageComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authFacade = inject(AuthFacade);

  readonly passwordRecoveryPending$ = this.authFacade.passwordRecoveryPending$;
  readonly authError$ = this.authFacade.authError$;
  readonly authMessage$ = this.authFacade.authMessage$;
  readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  ngOnInit(): void {
    this.authFacade.clearFeedback();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.authFacade.requestPasswordReset({
      email: this.form.controls.email.getRawValue().trim(),
    });
  }
}
