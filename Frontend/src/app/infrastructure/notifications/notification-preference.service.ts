import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { NotificationPreference, UpdateNotificationPreferenceRequest } from '../../domain/notifications/notification-preference.model';

@Injectable({ providedIn: 'root' })
export class NotificationPreferenceService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/notification-preferences`;
  get(): Observable<NotificationPreference> { return this.http.get<NotificationPreference>(this.apiUrl); }
  update(request: UpdateNotificationPreferenceRequest): Observable<NotificationPreference> {
    return this.http.put<NotificationPreference>(this.apiUrl, request);
  }
}
