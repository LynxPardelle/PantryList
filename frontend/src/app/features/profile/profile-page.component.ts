import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ProfileService } from '../../core/services/profile.service';
import { UserProfile } from '../../shared/models/profile.model';

@Component({
  selector: 'app-profile-page',
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  standalone: true,
})
export class ProfilePageComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly profileService = inject(ProfileService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly changeDetector = inject(ChangeDetectorRef);

  profile: UserProfile | null = null;
  loading = false;
  saving = false;
  loadError: string | null = null;
  saveError: string | null = null;
  saveMessage: string | null = null;

  readonly preferencesForm = this.formBuilder.nonNullable.group({
    expirationWarningDays: [
      7,
      [Validators.required, Validators.min(1), Validators.max(60)],
    ],
    showExpiredEntryAlert: [true],
    depletionWarningThresholdRatio: [
      1,
      [Validators.required, Validators.min(0.25), Validators.max(4)],
    ],
    shoppingPlanLeadDays: [
      3,
      [Validators.required, Validators.min(0), Validators.max(30)],
    ],
    showGuidanceTips: [true],
  });

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadProfile();
    }
  }

  loadProfile(): void {
    this.loading = true;
    this.loadError = null;

    this.profileService
      .getProfile()
      .pipe(
        finalize(() => {
          this.loading = false;
          this.changeDetector.markForCheck();
        }),
      )
      .subscribe({
        next: (profile) => {
          this.profile = profile;
          this.preferencesForm.reset(profile.preferences);
          this.changeDetector.markForCheck();
        },
        error: (error) => {
          this.loadError = this.getErrorMessage(error);
          this.changeDetector.markForCheck();
        },
      });
  }

  savePreferences(): void {
    if (this.preferencesForm.invalid) {
      this.preferencesForm.markAllAsTouched();
      this.saveError = 'Revisa los rangos antes de guardar preferencias.';
      this.saveMessage = null;
      return;
    }

    this.saving = true;
    this.saveError = null;
    this.saveMessage = null;

    this.profileService
      .updatePreferences(this.preferencesForm.getRawValue())
      .pipe(
        finalize(() => {
          this.saving = false;
          this.changeDetector.markForCheck();
        }),
      )
      .subscribe({
        next: (preferences) => {
          this.preferencesForm.reset(preferences);
          if (this.profile) {
            this.profile = {
              ...this.profile,
              preferences,
            };
          }
          this.saveMessage = 'Preferencias guardadas.';
          this.changeDetector.markForCheck();
        },
        error: (error) => {
          this.saveError = this.getErrorMessage(error);
          this.changeDetector.markForCheck();
        },
      });
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const apiMessage =
        typeof error.error?.message === 'string' ? error.error.message : null;
      return apiMessage ?? error.message;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'No se pudo completar la solicitud.';
  }
}
