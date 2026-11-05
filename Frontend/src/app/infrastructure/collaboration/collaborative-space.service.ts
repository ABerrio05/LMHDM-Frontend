import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  CollaborativeSpace,
  CreateSpaceRequest,
  InviteMemberRequest,
  InvitationResult,
  SpaceMember,
  SpaceRole,
} from '../../domain/collaboration/collaborative-space.model';
import { Task } from '../../domain/task/task.model';

@Injectable({ providedIn: 'root' })
export class CollaborativeSpaceService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/spaces`;

  listMine(): Observable<CollaborativeSpace[]> {
    return this.http.get<CollaborativeSpace[]>(this.apiUrl);
  }

  create(request: CreateSpaceRequest): Observable<CollaborativeSpace> {
    return this.http.post<CollaborativeSpace>(this.apiUrl, request);
  }

  update(spaceId: number, request: CreateSpaceRequest): Observable<CollaborativeSpace> {
    return this.http.put<CollaborativeSpace>(`${this.apiUrl}/${spaceId}`, request);
  }

  delete(spaceId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${spaceId}`);
  }

  listMembers(spaceId: number): Observable<SpaceMember[]> {
    return this.http.get<SpaceMember[]>(`${this.apiUrl}/${spaceId}/members`);
  }

  invite(spaceId: number, request: InviteMemberRequest): Observable<InvitationResult> {
    return this.http.post<InvitationResult>(`${this.apiUrl}/${spaceId}/members`, request);
  }

  listTasks(spaceId: number): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.apiUrl}/${spaceId}/tasks`);
  }

  updateMemberRole(spaceId: number, memberUserId: number, role: SpaceRole): Observable<SpaceMember> {
    return this.http.put<SpaceMember>(`${this.apiUrl}/${spaceId}/members/${memberUserId}/role`, { role });
  }

  assignTask(spaceId: number, taskId: number, assigneeId: number): Observable<Task> {
    return this.http.patch<Task>(`${this.apiUrl}/${spaceId}/tasks/${taskId}/assignee`, { assigneeId });
  }
}
