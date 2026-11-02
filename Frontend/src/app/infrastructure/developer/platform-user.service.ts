import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PlatformUser, PlatformUserRole } from '../../domain/developer/platform-user.model';

@Injectable({ providedIn: 'root' })
export class PlatformUserService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/developer/users`;

  list(): Observable<PlatformUser[]> { return this.http.get<PlatformUser[]>(this.apiUrl); }

  update(id: number, role: PlatformUserRole, active: boolean): Observable<PlatformUser> {
    return this.http.patch<PlatformUser>(`${this.apiUrl}/${id}`, { role, active });
  }

  resetPassword(id: number, temporaryPassword: string): Observable<PlatformUser> {
    return this.http.patch<PlatformUser>(`${this.apiUrl}/${id}/password`, { temporaryPassword });
  }
}
