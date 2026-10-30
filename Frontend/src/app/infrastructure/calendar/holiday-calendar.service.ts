import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PublicHoliday } from '../../domain/calendar/public-holiday.model';

@Injectable({ providedIn: 'root' })
export class HolidayCalendarService {
  private readonly http = inject(HttpClient);

  listUpcomingColombianHolidays(): Observable<PublicHoliday[]> {
    return this.http.get<PublicHoliday[]>(
      `${environment.apiUrl}/calendar/holidays/colombia`
    );
  }
}
