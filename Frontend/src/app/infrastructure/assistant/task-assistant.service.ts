import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { TaskAssistantRequest, TaskAssistantSuggestion } from '../../domain/assistant/task-assistant-suggestion.model';

@Injectable({ providedIn: 'root' })
export class TaskAssistantService {
  private readonly http = inject(HttpClient);

  suggest(question: string): Observable<TaskAssistantSuggestion> {
    const request: TaskAssistantRequest = { question };
    return this.http.post<TaskAssistantSuggestion>(
      `${environment.apiUrl}/assistant/suggestions`,
      request
    );
  }
}
