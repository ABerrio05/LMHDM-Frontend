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
    request.flush({ userId: 1, name: 'Ana', email: 'ana@nexo.test', accessToken: 'jwt-test' });

    expect(service.getAccessToken()).toBe('jwt-test');
    expect(service.isAuthenticated()).toBe(true);
  });

  it('registers a user and persists the received token', () => {
    const payload = { name: 'Ana NEXO', email: 'ana@nexo.test', password: 'ClaveSegura1' };
    service.register(payload).subscribe();

    const request = http.expectOne(`${environment.apiUrl}/auth/register`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush({ userId: 2, name: payload.name, email: payload.email, accessToken: 'jwt-register' });

    expect(service.getAccessToken()).toBe('jwt-register');
  });

  it('removes the token when the user logs out', () => {
    localStorage.setItem('accessToken', 'jwt-test');

    service.logout();

    expect(service.getAccessToken()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });
});
