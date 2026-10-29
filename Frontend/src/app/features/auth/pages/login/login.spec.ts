import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../../../core/auth/auth.service';
import { LoginComponent } from './login';

describe('LoginComponent', () => {
  const authService = { login: vi.fn() };
  const router = { navigate: vi.fn().mockResolvedValue(true) };
  let component: LoginComponent;

  beforeEach(() => {
    authService.login.mockReset();
    router.navigate.mockClear();
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    });
    component = TestBed.runInInjectionContext(() => new LoginComponent());
  });

  afterEach(() => TestBed.resetTestingModule());

  it('marks invalid fields without sending credentials', () => {
    component.onSubmit();

    expect(component.loginForm.touched).toBe(true);
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('logs in and redirects to tasks when the API succeeds', () => {
    authService.login.mockReturnValue(of({}));
    component.loginForm.setValue({ email: 'ana@nexo.test', password: 'ClaveSegura1' });

    component.onSubmit();

    expect(authService.login).toHaveBeenCalledWith({ email: 'ana@nexo.test', password: 'ClaveSegura1' });
    expect(component.isLoading).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/tasks']);
  });

  it('shows a clear message when login fails', () => {
    authService.login.mockReturnValue(throwError(() => new Error('denied')));
    component.loginForm.setValue({ email: 'ana@nexo.test', password: 'ClaveSegura1' });

    component.onSubmit();

    expect(component.errorMessage).toBe('No fue posible iniciar sesión.');
    expect(component.isLoading).toBe(false);
  });
});
