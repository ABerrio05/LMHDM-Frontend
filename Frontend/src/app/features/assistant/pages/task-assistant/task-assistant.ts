import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { TaskAssistantSuggestion } from '../../../../domain/assistant/task-assistant-suggestion.model';
import { TaskAssistantService } from '../../../../infrastructure/assistant/task-assistant.service';

@Component({
  selector: 'app-task-assistant',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './task-assistant.html',
  styleUrl: './task-assistant.scss',
})
export class TaskAssistantComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly assistant = inject(TaskAssistantService);
  private readonly changeDetector = inject(ChangeDetectorRef);

  readonly form = this.formBuilder.nonNullable.group({
    question: ['¿Qué tareas debería priorizar hoy?', [Validators.required, Validators.maxLength(800)]],
  });
  loading = false;
  error = '';
  suggestion: TaskAssistantSuggestion | null = null;

  requestSuggestion(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = '';
    this.suggestion = null;
    this.assistant.suggest(this.form.getRawValue().question.trim())
      .pipe(finalize(() => {
        this.loading = false;
        this.changeDetector.markForCheck();
      }))
      .subscribe({
        next: suggestion => {
          this.suggestion = suggestion;
          this.changeDetector.markForCheck();
        },
        error: error => {
          this.error = this.messageFrom(error);
          this.changeDetector.markForCheck();
        },
      });
  }

  private messageFrom(error: unknown): string {
    const response = error instanceof HttpErrorResponse ? error.error : undefined;
    return response?.message || 'No fue posible generar la sugerencia. Inténtalo nuevamente.';
  }
}
