import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationPreferenceService } from '../../../../infrastructure/notifications/notification-preference.service';
import { NotificationPreferencesComponent } from './notification-preferences';

describe('NotificationPreferencesComponent', () => {
  const get = vi.fn();
  const update = vi.fn();
  const markForCheck = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: NotificationPreferenceService, useValue: { get, update } },
        { provide: ChangeDetectorRef, useValue: { markForCheck } },
      ],
    });
  });

  function createComponent(): NotificationPreferencesComponent {
    return TestBed.runInInjectionContext(() => new NotificationPreferencesComponent());
  }

  it('carga la preferencia existente al iniciar', () => {
    get.mockReturnValue(of({
      userId: 2,
      activityEmailsEnabled: false,
      updatedAt: null,
    }));
    const component = createComponent();

    component.ngOnInit();

    expect(component.activityEmailsEnabled).toBe(false);
    expect(component.loading).toBe(false);
    expect(component.error).toBe('');
  });

  it('informa cuando no puede cargar las preferencias', () => {
    get.mockReturnValue(throwError(() => new Error('sin conexión')));
    const component = createComponent();

    component.ngOnInit();

    expect(component.loading).toBe(false);
    expect(component.error).toBe('No se pudieron cargar tus preferencias.');
  });

  it('guarda y refleja la preferencia confirmada por la API', () => {
    update.mockReturnValue(of({
      userId: 2,
      activityEmailsEnabled: false,
      updatedAt: '2026-11-07T10:05:00',
    }));
    const component = createComponent();
    component.activityEmailsEnabled = false;

    component.save();

    expect(update).toHaveBeenCalledWith({ activityEmailsEnabled: false });
    expect(component.saving).toBe(false);
    expect(component.message).toBe('Preferencias guardadas.');
    expect(component.error).toBe('');
  });

  it('muestra el error de guardado sin dejar el formulario bloqueado', () => {
    update.mockReturnValue(throwError(() => new Error('fallo')));
    const component = createComponent();

    component.save();

    expect(component.saving).toBe(false);
    expect(component.error).toBe('No se pudieron guardar las preferencias. Inténtalo de nuevo.');
  });

  it('evita envíos duplicados mientras existe una petición pendiente', () => {
    const pending = new Subject<{
      userId: number;
      activityEmailsEnabled: boolean;
      updatedAt: string | null;
    }>();
    update.mockReturnValue(pending);
    const component = createComponent();

    component.save();
    component.save();

    expect(update).toHaveBeenCalledTimes(1);
    expect(component.saving).toBe(true);
    pending.next({ userId: 2, activityEmailsEnabled: true, updatedAt: null });
    pending.complete();
    expect(component.saving).toBe(false);
  });
});
