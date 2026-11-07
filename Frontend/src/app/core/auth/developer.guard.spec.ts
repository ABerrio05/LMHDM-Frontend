import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { describe, beforeEach, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';
import { developerGuard } from './developer.guard';

describe('developerGuard', () => {
  const isDeveloper = vi.fn();
  const deniedTree = {} as UrlTree;
  const createUrlTree = vi.fn(() => deniedTree);

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { isDeveloper } },
        { provide: Router, useValue: { createUrlTree } },
      ],
    });
  });

  it('permite el acceso al usuario desarrollador', () => {
    isDeveloper.mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() =>
      developerGuard({} as never, {} as never)
    );

    expect(result).toBe(true);
    expect(createUrlTree).not.toHaveBeenCalled();
  });

  it('redirige a tareas cuando el usuario no es desarrollador', () => {
    isDeveloper.mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() =>
      developerGuard({} as never, {} as never)
    );

    expect(result).toBe(deniedTree);
    expect(createUrlTree).toHaveBeenCalledWith(['/tasks']);
  });
});
