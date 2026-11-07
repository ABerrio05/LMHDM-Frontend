import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError, TimeoutError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HolidayCalendarService } from '../../../../infrastructure/calendar/holiday-calendar.service';
import { PlanningComponent } from './planning';

describe('PlanningComponent', () => {
  const calendar = { listUpcomingColombianHolidays: vi.fn() };
  let component: PlanningComponent;

  beforeEach(() => {
    calendar.listUpcomingColombianHolidays.mockReset();
    TestBed.configureTestingModule({
      providers: [
        { provide: HolidayCalendarService, useValue: calendar },
        { provide: ChangeDetectorRef, useValue: { markForCheck: vi.fn() } },
      ],
    });
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

  it('builds the upcoming summary and available months without duplicates', () => {
    component.holidays = [
      { date: '2026-11-16', localName: 'Independencia de Cartagena', countryCode: 'CO' },
      { date: '2026-12-08', localName: 'Inmaculada Concepción', countryCode: 'CO' },
      { date: '2026-12-25', localName: 'Navidad', countryCode: 'CO' },
      { date: '2027-01-01', localName: 'Año Nuevo', countryCode: 'CO' },
      { date: '2027-01-11', localName: 'Reyes Magos', countryCode: 'CO' },
    ];

    expect(component.upcomingHolidays).toHaveLength(4);
    expect(component.availableMonths).toEqual(['2026-11', '2026-12', '2027-01']);
  });

  it('selects a month and builds its calendar with holiday information', () => {
    component.holidays = [
      { date: '2026-11-16', localName: 'Independencia de Cartagena', countryCode: 'CO' },
    ];

    component.selectMonth('2026-11');

    expect(component.selectedMonth).toBe('2026-11');
    expect(component.selectedMonthLabel.toLowerCase()).toContain('noviembre');
    expect(component.selectedMonthLabel).toContain('2026');
    expect(component.calendarDays.slice(0, 6).every((day) => day.label === '')).toBe(true);
    expect(component.calendarDays[6].label).toBe('1');
    expect(component.calendarDays.find((day) => day.label === '16')?.holiday?.localName)
      .toBe('Independencia de Cartagena');
  });

  it('shows specific messages for timeouts and expired sessions', () => {
    calendar.listUpcomingColombianHolidays.mockReturnValue(throwError(() => new TimeoutError()));
    component.loadHolidays();
    expect(component.error).toContain('tardó demasiado');

    calendar.listUpcomingColombianHolidays.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 401 })),
    );
    component.loadHolidays();
    expect(component.error).toContain('sesión');

    calendar.listUpcomingColombianHolidays.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 403 })),
    );
    component.loadHolidays();
    expect(component.error).toContain('sesión');
  });
});
