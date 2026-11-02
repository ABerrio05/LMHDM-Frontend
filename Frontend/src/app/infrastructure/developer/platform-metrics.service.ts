import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { NotificationMetrics } from '../../domain/developer/notification-metrics.model';

@Injectable({ providedIn: 'root' })
export class PlatformMetricsService {
  private readonly http = inject(HttpClient);

  notifications(): Observable<NotificationMetrics> {
    return this.http.get<NotificationMetrics>(`${environment.apiUrl}/developer/metrics/notifications`);
  }
}
