import { CommonModule, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
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
  entries: AuditLog[] = [];
  loading = false;
  error = '';

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.error = '';
    this.auditLogs.listMine().pipe(finalize(() => this.loading = false)).subscribe({
      next: entries => this.entries = Array.isArray(entries) ? entries : [],
      error: error => this.error = this.message(error),
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
