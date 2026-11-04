import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { NotificationPreferenceService } from '../../../../infrastructure/notifications/notification-preference.service';

@Component({
  selector: 'app-notification-preferences', standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './notification-preferences.html', styleUrl: './notification-preferences.scss',
})
export class NotificationPreferencesComponent implements OnInit {
  private readonly preferences = inject(NotificationPreferenceService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  activityEmailsEnabled = true;
  loading = true;
  saving = false;
  message = '';
  error = '';

  ngOnInit(): void {
    this.preferences.get().pipe(finalize(() => { this.loading = false; this.changeDetector.markForCheck(); })).subscribe({
      next: preference => { this.activityEmailsEnabled = preference.activityEmailsEnabled; this.changeDetector.markForCheck(); },
      error: () => { this.error = 'No se pudieron cargar tus preferencias.'; this.changeDetector.markForCheck(); },
    });
  }

  save(): void {
    if (this.saving) return;
    this.saving = true; this.message = ''; this.error = '';
    this.preferences.update({ activityEmailsEnabled: this.activityEmailsEnabled }).pipe(finalize(() => {
      this.saving = false; this.changeDetector.markForCheck();
    })).subscribe({
      next: preference => {
        this.activityEmailsEnabled = preference.activityEmailsEnabled;
        this.message = 'Preferencias guardadas.';
        this.changeDetector.markForCheck();
      },
      error: () => { this.error = 'No se pudieron guardar las preferencias. Inténtalo de nuevo.'; this.changeDetector.markForCheck(); },
    });
  }
}
