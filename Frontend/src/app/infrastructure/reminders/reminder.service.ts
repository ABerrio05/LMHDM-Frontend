import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  Reminder,
  ReminderRequest,
} from '../../domain/reminder/reminder.model';

@Injectable({
  providedIn: 'root',
})
export class ReminderService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = environment.apiUrl;

  getReminders(taskId: number): Observable<Reminder[]> {
    return this.http.get<Reminder[]>(
      `${this.apiUrl}/tasks/${taskId}/reminders`
    );
  }

  createReminder(
    taskId: number,
    request: ReminderRequest
  ): Observable<Reminder> {
    return this.http.post<Reminder>(
      `${this.apiUrl}/tasks/${taskId}/reminders`,
      request
    );
  }

  updateReminder(
    reminderId: number,
    request: ReminderRequest
  ): Observable<Reminder> {
    return this.http.put<Reminder>(
      `${this.apiUrl}/reminders/${reminderId}`,
      request
    );
  }

  deleteReminder(reminderId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/reminders/${reminderId}`
    );
  }
}