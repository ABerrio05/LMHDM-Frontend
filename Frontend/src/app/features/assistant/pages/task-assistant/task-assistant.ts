import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { TaskAssistantSuggestion } from '../../../../domain/assistant/task-assistant-suggestion.model';
import { TaskAssistantService } from '../../../../infrastructure/assistant/task-assistant.service';

type ChatRole = 'assistant' | 'error' | 'user';

interface ChatMessage {
  id: number;
  role: ChatRole;
  text: string;
  recommendedActions?: string[];
  providerConfigured?: boolean;
  pending?: boolean;
}

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
  private nextMessageId = 1;

  readonly form = this.formBuilder.nonNullable.group({
    question: ['', [Validators.required, Validators.maxLength(800)]],
  });

  loading = false;
  messages: ChatMessage[] = [];

  requestSuggestion(): void {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    const question = this.form.getRawValue().question.trim();
    if (!question) {
      this.form.controls.question.setErrors({ required: true });
      this.form.controls.question.markAsTouched();
      return;
    }

    const userMessageId = this.newMessageId();
    const pendingId = this.newMessageId();
    this.loading = true;
    this.messages = [
      ...this.messages,
      { id: userMessageId, role: 'user', text: question },
      { id: pendingId, role: 'assistant', text: 'Analizando tus tareas y preparando una recomendación…', pending: true },
    ];
    this.form.reset({ question: '' });
    this.changeDetector.markForCheck();

    this.assistant.suggest(question)
      .pipe(finalize(() => {
        this.loading = false;
        this.changeDetector.markForCheck();
      }))
      .subscribe({
        next: suggestion => this.replacePendingMessage(pendingId, this.assistantMessage(pendingId, suggestion)),
        error: error => this.replacePendingMessage(pendingId, {
          id: pendingId,
          role: 'error',
          text: this.messageFrom(error),
        }),
      });
  }

  clearConversation(): void {
    if (this.loading) return;
    this.messages = [];
    this.form.reset({ question: '' });
    this.changeDetector.markForCheck();
  }

  private assistantMessage(id: number, suggestion: TaskAssistantSuggestion): ChatMessage {
    return {
      id,
      role: 'assistant',
      text: suggestion.answer,
      recommendedActions: Array.isArray(suggestion.recommendedActions) ? suggestion.recommendedActions : [],
      providerConfigured: suggestion.providerConfigured,
    };
  }

  private replacePendingMessage(id: number, message: ChatMessage): void {
    this.messages = this.messages.map(current => current.id === id ? message : current);
    this.changeDetector.markForCheck();
  }

  private newMessageId(): number {
    return this.nextMessageId++;
  }

  private messageFrom(error: unknown): string {
    const response = error instanceof HttpErrorResponse ? error.error : undefined;
    return response?.message || 'No fue posible generar la sugerencia. Inténtalo nuevamente.';
  }
}
