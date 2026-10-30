import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../../../core/auth/auth.service';
import { RegisterComponent } from './register';

describe('RegisterComponent', () => {
  const authService = { register: vi.fn() };
  const router = { navigate: vi.fn().mockResolvedValue(true) };
  let component: RegisterComponent;

  beforeEach(() => {
    authService.register.mockReset();
    router.navigate.mockClear();
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    });
    component = TestBed.runInInjectionContext(() => new RegisterComponent());
  });

  afterEach(() => TestBed.resetTestingModule());

  function validForm(): void {
    component.registerForm.setValue({ name: 'Ana NEXO', email: 'ana@nexo.test', password: 'ClaveSegura1' });
  }

  it('does not register invalid data', () => {
    component.onSubmit();

    expect(component.registerForm.touched).toBe(true);
    expect(authService.register).not.toHaveBeenCalled();
  });

  it('registers and redirects when the API succeeds', () => {
    authService.register.mockReturnValue(of({}));
    validForm();

    component.onSubmit();

    expect(authService.register).toHaveBeenCalledWith(component.registerForm.getRawValue());
    expect(component.isLoading).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/tasks']);
  });

  it.each([
    [409, 'El correo electrónico ya está registrado.'],
    [400, 'Los datos ingresados no son válidos.'],
    [500, 'No fue posible crear la cuenta. Inténtalo nuevamente.'],
  ])('explains registration error %i', (status, message) => {
    authService.register.mockReturnValue(throwError(() => ({ status })));
    validForm();

    component.onSubmit();

    expect(component.errorMessage).toBe(message);
    expect(component.isLoading).toBe(false);
  });
});
