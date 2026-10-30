import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HolidayCalendarService } from '../../../../infrastructure/calendar/holiday-calendar.service';
import { PlanningComponent } from './planning';

describe('PlanningComponent', () => {
  const calendar = { listUpcomingColombianHolidays: vi.fn() };
  let component: PlanningComponent;

  beforeEach(() => {
    calendar.listUpcomingColombianHolidays.mockReset();
    TestBed.configureTestingModule({ providers: [{ provide: HolidayCalendarService, useValue: calendar }] });
    component = TestBed.runInInjectionContext(() => new PlanningComponent());
  });

  afterEach(() => TestBed.resetTestingModule());

  it('loads the holidays from the external-calendar endpoint', () => {
    const holidays = [{ date: '2026-01-01', localName: 'Año Nuevo', countryCode: 'CO' }];
    calendar.listUpcomingColombianHolidays.mockReturnValue(of(holidays));

    component.ngOnInit();

    expect(calendar.listUpcomingColombianHolidays).toHaveBeenCalledOnce();
    expect(component.holidays).toEqual(holidays);
    expect(component.loading).toBe(false);
  });

  it('keeps an empty list when the API response is not an array', () => {
    calendar.listUpcomingColombianHolidays.mockReturnValue(of({}));

    component.loadHolidays();

    expect(component.holidays).toEqual([]);
    expect(component.loading).toBe(false);
  });

  it('shows the provider message and a safe fallback on errors', () => {
    calendar.listUpcomingColombianHolidays.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 503, error: { message: 'Proveedor no disponible' } })),
    );
    component.loadHolidays();
    expect(component.error).toBe('Proveedor no disponible');

    calendar.listUpcomingColombianHolidays.mockReturnValue(throwError(() => new Error('offline')));
    component.loadHolidays();
    expect(component.error).toBe('No fue posible consultar el calendario externo.');
    expect(component.loading).toBe(false);
  });
});
