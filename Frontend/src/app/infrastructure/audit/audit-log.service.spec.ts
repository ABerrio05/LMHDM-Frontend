import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../environments/environment';
import { AuditLogService } from './audit-log.service';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AuditLogService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => { http.verify(); TestBed.resetTestingModule(); });

  it('requests only the authenticated users recent activity', () => {
    service.listMine(20).subscribe(entries => expect(entries).toHaveLength(1));
    const request = http.expectOne(`${environment.apiUrl}/audit-logs?limit=20`);
    expect(request.request.method).toBe('GET');
    request.flush([{ id: 1, userId: 7, action: 'POST /api/tasks', method: 'POST', path: '/api/tasks', statusCode: 201, durationMs: 12, requestId: 'request-1', createdAt: '2026-10-29T12:00:00' }]);
  });
});
