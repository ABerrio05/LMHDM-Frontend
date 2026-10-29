import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  CollaborativeSpace,
  CreateSpaceRequest,
  InviteMemberRequest,
  SpaceMember,
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

  listMembers(spaceId: number): Observable<SpaceMember[]> {
    return this.http.get<SpaceMember[]>(`${this.apiUrl}/${spaceId}/members`);
  }

  invite(spaceId: number, request: InviteMemberRequest): Observable<SpaceMember> {
    return this.http.post<SpaceMember>(`${this.apiUrl}/${spaceId}/members`, request);
  }

  listTasks(spaceId: number): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.apiUrl}/${spaceId}/tasks`);
  }
}
