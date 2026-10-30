import { CommonModule, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuditLog } from '../../../../domain/audit/audit-log.model';
import { AuditLogService } from '../../../../infrastructure/audit/audit-log.service';

@Component({
  selector: 'app-activity-list',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink],
  templateUrl: './activity-list.html',
  styleUrl: './activity-list.scss',
})
export class ActivityListComponent implements OnInit {
  private readonly auditLogs = inject(AuditLogService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  entries: AuditLog[] = [];
  loading = false;
  error = '';

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.error = '';
    this.auditLogs.listMine().pipe(finalize(() => {
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

  private message(error: unknown): string {
    const response = error instanceof HttpErrorResponse ? error.error : undefined;
    return response?.message || 'No se pudo cargar tu actividad.';
  }
}
