import { CommonModule, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuditLog } from '../../../../domain/audit/audit-log.model';
import { PlatformUser, PlatformUserRole } from '../../../../domain/developer/platform-user.model';
import { NotificationMetrics } from '../../../../domain/developer/notification-metrics.model';
import { AuditLogService } from '../../../../infrastructure/audit/audit-log.service';
import { PlatformMetricsService } from '../../../../infrastructure/developer/platform-metrics.service';
import { PlatformUserService } from '../../../../infrastructure/developer/platform-user.service';

@Component({
  selector: 'app-activity-list',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink],
  templateUrl: './activity-list.html',
  styleUrl: './activity-list.scss',
})
export class ActivityListComponent implements OnInit {
  private readonly auditLogs = inject(AuditLogService);
  private readonly usersApi = inject(PlatformUserService);
  private readonly metricsApi = inject(PlatformMetricsService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  entries: AuditLog[] = [];
  loading = false;
  error = '';
  users: PlatformUser[] = [];
  usersLoading = false;
  usersError = '';
  notificationMetrics: NotificationMetrics | null = null;
  metricsError = '';
  resettingUserId: number | null = null;

  ngOnInit(): void { this.load(); this.loadUsers(); this.loadMetrics(); }

  load(): void {
    this.loading = true;
    this.error = '';
    this.auditLogs.listPlatform().pipe(finalize(() => {
      this.loading = false;
      this.changeDetector.markForCheck();
    })).subscribe({
      next: entries => {
        this.entries = Array.isArray(entries) ? entries : [];
        this.changeDetector.markForCheck();
      },
      error: error => {
        this.error = this.message(error);
        this.changeDetector.markForCheck();
      },
    });
  }

  statusLabel(entry: AuditLog): string {
    return entry.statusCode < 400 ? 'Completada' : 'Con error';
  }

  loadUsers(): void {
    this.usersLoading = true;
    this.usersError = '';
    this.usersApi.list().pipe(finalize(() => {
      this.usersLoading = false;
      this.changeDetector.markForCheck();
    })).subscribe({
      next: users => { this.users = Array.isArray(users) ? users : []; this.changeDetector.markForCheck(); },
      error: error => { this.usersError = this.message(error); this.changeDetector.markForCheck(); },
    });
  }

  changeRole(user: PlatformUser, event: Event): void {
    const role = (event.target as HTMLSelectElement).value as PlatformUserRole;
    this.saveUser(user, role, user.active);
  }

  toggleActive(user: PlatformUser): void { this.saveUser(user, user.role, !user.active); }

  loadMetrics(): void {
    this.metricsError = '';
    this.metricsApi.notifications().subscribe({
      next: metrics => { this.notificationMetrics = metrics; this.changeDetector.markForCheck(); },
      error: error => { this.metricsError = this.message(error); this.changeDetector.markForCheck(); },
    });
  }

  resetPassword(user: PlatformUser): void {
    const temporaryPassword = window.prompt(`Define una contraseña temporal (mínimo 8 caracteres) para ${user.email}:`);
    if (!temporaryPassword) return;
    if (temporaryPassword.length < 8) {
      this.usersError = 'La contraseña temporal debe tener al menos 8 caracteres.';
      return;
    }
    this.resettingUserId = user.id;
    this.usersError = '';
    this.usersApi.resetPassword(user.id, temporaryPassword).pipe(finalize(() => {
      this.resettingUserId = null;
      this.changeDetector.markForCheck();
    })).subscribe({
      next: updated => {
        this.users = this.users.map(entry => entry.id === updated.id ? updated : entry);
        this.usersError = `Contraseña temporal actualizada para ${updated.email}.`;
        this.changeDetector.markForCheck();
      },
      error: error => { this.usersError = this.message(error); this.changeDetector.markForCheck(); },
    });
  }

  private saveUser(user: PlatformUser, role: PlatformUserRole, active: boolean): void {
    this.usersError = '';
    this.usersApi.update(user.id, role, active).subscribe({
      next: updated => { this.users = this.users.map(entry => entry.id === updated.id ? updated : entry); this.changeDetector.markForCheck(); },
      error: error => { this.usersError = this.message(error); this.changeDetector.markForCheck(); },
    });
  }

  private message(error: unknown): string {
    const response = error instanceof HttpErrorResponse ? error.error : undefined;
    return response?.message || 'No se pudieron cargar los registros de la plataforma.';
  }
}
