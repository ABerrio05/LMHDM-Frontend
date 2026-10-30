import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuditLogService } from '../../../../infrastructure/audit/audit-log.service';
import { ActivityListComponent } from './activity-list';

describe('ActivityListComponent', () => {
  const auditLogs = { listMine: vi.fn() };
  const entry = { id: 1, userId: 7, action: 'POST /api/tasks', method: 'POST', path: '/api/tasks', statusCode: 201, durationMs: 12, requestId: 'request-1', createdAt: '2026-10-29T12:00:00' };
  let component: ActivityListComponent;

  beforeEach(() => {
    auditLogs.listMine.mockReset();
    TestBed.configureTestingModule({ providers: [{ provide: AuditLogService, useValue: auditLogs }] });
    component = TestBed.runInInjectionContext(() => new ActivityListComponent());
  });

  afterEach(() => TestBed.resetTestingModule());

  it('loads the users activity and labels successful and failing actions', () => {
    auditLogs.listMine.mockReturnValue(of([entry]));
    component.load();
    expect(component.entries).toEqual([entry]);
    expect(component.statusLabel(entry)).toBe('Completada');
    expect(component.statusLabel({ ...entry, statusCode: 403 })).toBe('Con error');
  });

  it('shows a safe message when activity cannot be loaded', () => {
    auditLogs.listMine.mockReturnValue(throwError(() => new HttpErrorResponse({ error: { message: 'Sin acceso' } })));
    component.load();
    expect(component.error).toBe('Sin acceso');

    auditLogs.listMine.mockReturnValue(of({}));
    component.load();
    expect(component.entries).toEqual([]);
  });
});
