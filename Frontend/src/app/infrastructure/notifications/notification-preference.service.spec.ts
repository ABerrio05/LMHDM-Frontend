import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../environments/environment';
import { NotificationPreferenceService } from './notification-preference.service';

describe('NotificationPreferenceService', () => {
  let service: NotificationPreferenceService;
  let http: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/notification-preferences`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(NotificationPreferenceService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('consulta las preferencias del usuario autenticado', () => {
    const preference = {
      userId: 7,
      activityEmailsEnabled: true,
      updatedAt: '2026-11-07T10:00:00',
    };

    service.get().subscribe((result) => expect(result).toEqual(preference));

    const request = http.expectOne(apiUrl);
    expect(request.request.method).toBe('GET');
    request.flush(preference);
  });

  it('actualiza la preferencia de correos de actividad', () => {
    const preference = {
      userId: 7,
      activityEmailsEnabled: false,
      updatedAt: '2026-11-07T10:05:00',
    };

    service.update({ activityEmailsEnabled: false }).subscribe((result) =>
      expect(result).toEqual(preference)
    );

    const request = http.expectOne(apiUrl);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ activityEmailsEnabled: false });
    request.flush(preference);
  });
});
