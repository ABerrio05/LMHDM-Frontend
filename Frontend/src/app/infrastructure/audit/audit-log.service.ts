import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuditLog } from '../../domain/audit/audit-log.model';

@Injectable({ providedIn: 'root' })
export class AuditLogService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/audit-logs`;

  listMine(limit = 50): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(this.apiUrl, { params: new HttpParams().set('limit', limit) });
  }
}
