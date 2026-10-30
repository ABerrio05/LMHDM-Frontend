import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../environments/environment';
import { HolidayCalendarService } from './holiday-calendar.service';

describe('HolidayCalendarService', () => {
  let service: HolidayCalendarService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(HolidayCalendarService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  it('gets upcoming Colombian holidays from the protected API', () => {
    service.listUpcomingColombianHolidays().subscribe((holidays) => expect(holidays).toHaveLength(1));

    const request = http.expectOne(`${environment.apiUrl}/calendar/holidays/colombia`);
    expect(request.request.method).toBe('GET');
    request.flush([{ date: '2026-01-01', localName: 'Año Nuevo', countryCode: 'CO' }]);
  });
});
