import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PublicHoliday } from '../../../../domain/calendar/public-holiday.model';
import { HolidayCalendarService } from '../../../../infrastructure/calendar/holiday-calendar.service';

@Component({
  selector: 'app-planning',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './planning.html',
  styleUrl: './planning.scss',
})
export class PlanningComponent implements OnInit {
  private readonly calendar = inject(HolidayCalendarService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  holidays: PublicHoliday[] = [];
  selectedMonth = '';
  loading = true;
  error = '';

  ngOnInit(): void { this.loadHolidays(); }

  loadHolidays(): void {
    this.loading = true;
    this.error = '';
    this.calendar.listUpcomingColombianHolidays().subscribe({
      next: holidays => {
        this.holidays = Array.isArray(holidays) ? holidays : [];
        this.selectedMonth = this.availableMonths[0] ?? '';
        this.loading = false;
        this.changeDetector.markForCheck();
      },
      error: error => {
        this.error = this.messageFrom(error);
        this.loading = false;
        this.changeDetector.markForCheck();
      },
    });
  }

  get upcomingHolidays(): PublicHoliday[] { return this.holidays.slice(0, 4); }

  get availableMonths(): string[] {
    return [...new Set(this.holidays.map(holiday => holiday.date.slice(0, 7)))];
  }

  get selectedMonthLabel(): string {
    if (!this.selectedMonth) return '';
    const [year, month] = this.selectedMonth.split('-').map(Number);
    return new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' })
      .format(new Date(year, month - 1, 1));
  }

  get calendarDays(): CalendarDay[] {
    if (!this.selectedMonth) return [];
    const [year, month] = this.selectedMonth.split('-').map(Number);
    const daysBefore = (new Date(year, month - 1, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month, 0).getDate();
    const holidaysByDate = new Map(this.holidays.map(holiday => [holiday.date, holiday]));
    return Array.from({ length: daysBefore + daysInMonth }, (_, position) => {
      const day = position - daysBefore + 1;
      if (day < 1 || day > daysInMonth) return { label: '', holiday: undefined };
      const date = `${this.selectedMonth}-${String(day).padStart(2, '0')}`;
      return { label: String(day), holiday: holidaysByDate.get(date) };
    });
  }

  selectMonth(month: string): void { this.selectedMonth = month; }

  private messageFrom(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'name' in error && error.name === 'TimeoutError') {
      return 'El calendario externo tardó demasiado en responder. Intenta de nuevo.';
    }

    if (error instanceof HttpErrorResponse) {
      if (error.status === 401 || error.status === 403) {
        return 'Tu sesión ya no es válida. Inicia sesión nuevamente para consultar el calendario.';
      }

      return error.error?.message || 'No fue posible consultar el calendario externo.';
    }

    return 'No fue posible consultar el calendario externo.';
  }
}

interface CalendarDay {
  label: string;
  holiday: PublicHoliday | undefined;
}
