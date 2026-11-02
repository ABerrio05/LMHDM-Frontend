import { CommonModule, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
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
  private readonly changeDetector = inject(ChangeDetectorRef);
  holidays: PublicHoliday[] = [];
  loading = true;
  error = '';

  ngOnInit(): void { this.loadHolidays(); }

  loadHolidays(): void {
    this.loading = true;
    this.error = '';
    this.calendar.listUpcomingColombianHolidays().subscribe({
      next: holidays => {
        this.holidays = Array.isArray(holidays) ? holidays : [];
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
