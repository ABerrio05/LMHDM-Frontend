import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthResponse } from '../../domain/auth/auth-response.model';
import { LoginRequest } from '../../domain/auth/login-request.model';
import { RegisterRequest } from '../../domain/auth/register-request.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/auth`;
  private readonly tokenKey = 'accessToken';

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(
        `${this.apiUrl}/login`,
        credentials
      )
      .pipe(
        tap((response) => {
          localStorage.setItem(
            this.tokenKey,
            response.accessToken
          );
        })
      );
  }

  register(
    request: RegisterRequest
  ): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(
        `${this.apiUrl}/register`,
        request
      )
      .pipe(
        tap((response) => {
          localStorage.setItem(
            this.tokenKey,
            response.accessToken
          );
        })
      );
  }

  getAccessToken(): string | null {
    return localStorage.getItem(
      this.tokenKey
    );
  }

  logout(): void {
    localStorage.removeItem(
      this.tokenKey
    );
  }

  isAuthenticated(): boolean {
    return this.getAccessToken() !== null;
  }
}