import { CommonModule, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PublicHoliday } from '../../../../domain/calendar/public-holiday.model';
import { HolidayCalendarService } from '../../../../infrastructure/calendar/holiday-calendar.service';

@Component({
  selector: 'app-planning',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink],
  templateUrl: './planning.html',
  styleUrl: './planning.scss',
})
export class PlanningComponent implements OnInit {
  private readonly calendar = inject(HolidayCalendarService);
  holidays: PublicHoliday[] = [];
  loading = true;
  error = '';

  ngOnInit(): void { this.loadHolidays(); }

  loadHolidays(): void {
    this.loading = true;
    this.error = '';
    this.calendar.listUpcomingColombianHolidays().subscribe({
      next: holidays => { this.holidays = Array.isArray(holidays) ? holidays : []; this.loading = false; },
      error: error => { this.error = this.messageFrom(error); this.loading = false; },
    });
  }

  private messageFrom(error: unknown): string {
    const response = error instanceof HttpErrorResponse ? error.error : undefined;
    return response?.message || 'No fue posible consultar el calendario externo.';
  }
}
