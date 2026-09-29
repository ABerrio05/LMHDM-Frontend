import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

import {
  Task,
  CreateTaskRequest,
  UpdateTaskRequest,
  UpdateTaskStatusRequest,
} from '../../domain/task/task.model';

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl =
    `${environment.apiUrl}/tasks`;

  getTasks(): Observable<Task[]> {
    return this.http.get<Task[]>(
      this.apiUrl
    );
  }

  getTask(taskId: number): Observable<Task> {
    return this.http.get<Task>(
      `${this.apiUrl}/${taskId}`
    );
  }

  createTask(
    request: CreateTaskRequest
  ): Observable<Task> {
    return this.http.post<Task>(
      this.apiUrl,
      request
    );
  }

  updateTask(
    taskId: number,
    request: UpdateTaskRequest
  ): Observable<Task> {
    return this.http.put<Task>(
      `${this.apiUrl}/${taskId}`,
      request
    );
  }

  updateTaskStatus(
    taskId: number,
    request: UpdateTaskStatusRequest
  ): Observable<Task> {
    return this.http.patch<Task>(
      `${this.apiUrl}/${taskId}/status`,
      request
    );
  }

  deleteTask(
    taskId: number
  ): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${taskId}`
    );
  }
}