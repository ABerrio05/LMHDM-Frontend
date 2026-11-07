import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('sends login credentials and persists the received token', () => {
    service.login({ email: 'ana@nexo.test', password: 'ClaveSegura1' }).subscribe();

    const request = http.expectOne(`${environment.apiUrl}/auth/login`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ email: 'ana@nexo.test', password: 'ClaveSegura1' });
    request.flush({ userId: 1, name: 'Ana', email: 'ana@nexo.test', role: 'USER', accessToken: 'jwt-test' });

    expect(service.getAccessToken()).toBe('jwt-test');
    expect(service.isAuthenticated()).toBe(true);
  });

  it('registers a user and persists the received token', () => {
    const payload = { name: 'Ana NEXO', email: 'ana@nexo.test', password: 'ClaveSegura1' };
    service.register(payload).subscribe();

    const request = http.expectOne(`${environment.apiUrl}/auth/register`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush({ userId: 2, name: payload.name, email: payload.email, role: 'USER', accessToken: 'jwt-register' });

    expect(service.getAccessToken()).toBe('jwt-register');
  });

  it('removes the token when the user logs out', () => {
    localStorage.setItem('accessToken', 'jwt-test');

    service.logout();

    expect(service.getAccessToken()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.isDeveloper()).toBe(false);
  });

  it('recognizes a developer session from the login response', () => {
    service.login({ email: 'nexoteam2026@gmail.com', password: 'ClaveSegura1' }).subscribe();

    const request = http.expectOne(`${environment.apiUrl}/auth/login`);
    request.flush({
      userId: 4,
      name: 'NEXO Team',
      email: 'nexoteam2026@gmail.com',
      role: 'DEVELOPER',
      accessToken: 'jwt-developer',
    });

    expect(service.isDeveloper()).toBe(true);
  });

  it('reads the current user identifier from a valid JWT subject', () => {
    const payload = btoa(JSON.stringify({ sub: '42' }));
    localStorage.setItem('accessToken', `header.${payload}.signature`);

    expect(service.currentUserId()).toBe(42);
  });

  it('returns null when the JWT subject is missing or invalid', () => {
    expect(service.currentUserId()).toBeNull();

    localStorage.setItem('accessToken', 'not-a-jwt');
    expect(service.currentUserId()).toBeNull();

    const payload = btoa(JSON.stringify({ sub: 'not-a-number' }));
    localStorage.setItem('accessToken', `header.${payload}.signature`);
    expect(service.currentUserId()).toBeNull();
  });
});
