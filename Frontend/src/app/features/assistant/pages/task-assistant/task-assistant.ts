import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AssistantActionProposal, TaskAssistantSuggestion } from '../../../../domain/assistant/task-assistant-suggestion.model';
import { TaskAssistantService } from '../../../../infrastructure/assistant/task-assistant.service';
import { PersonalNoteService } from '../../../../infrastructure/notes/personal-note.service';
import { TaskService } from '../../../../infrastructure/tasks/task.service';

type ChatRole = 'assistant' | 'error' | 'user';

interface ChatMessage {
  id: number;
  role: ChatRole;
  text: string;
  recommendedActions?: string[];
  providerConfigured?: boolean;
  pending?: boolean;
  proposedActions?: AssistantActionProposal[];
  executionMessage?: string;
  executing?: boolean;
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
  private readonly tasks = inject(TaskService);
  private readonly notes = inject(PersonalNoteService);
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

  executeProposedAction(messageId: number, action: AssistantActionProposal): void {
    const noun = action.type === 'TASK' ? 'tarea' : 'nota';
    if (!window.confirm(`¿Crear ${noun} “${action.title}”? La IA no realizará el cambio hasta que confirmes.`)) return;
    this.updateMessage(messageId, { executing: true, executionMessage: '' });
    if (action.type === 'TASK') {
      this.tasks.createTask({
          title: action.title,
          description: action.description || undefined,
          dueDate: action.dueDate ? `${action.dueDate}T09:00` : undefined,
          priority: action.priority || 'MEDIA',
        }).pipe(finalize(() => this.changeDetector.markForCheck())).subscribe({
          next: () => this.actionCreated(messageId, noun),
          error: (error: unknown) => this.actionFailed(messageId, error),
        });
      return;
    }
    this.notes.create({ title: action.title, content: action.description || action.title })
      .pipe(finalize(() => this.changeDetector.markForCheck())).subscribe({
        next: () => this.actionCreated(messageId, noun),
        error: (error: unknown) => this.actionFailed(messageId, error),
      });
  }

  private assistantMessage(id: number, suggestion: TaskAssistantSuggestion): ChatMessage {
    return {
      id,
      role: 'assistant',
      text: suggestion.answer,
      recommendedActions: Array.isArray(suggestion.recommendedActions) ? suggestion.recommendedActions : [],
      proposedActions: Array.isArray(suggestion.proposedActions) ? suggestion.proposedActions : [],
      providerConfigured: suggestion.providerConfigured,
    };
  }

  private replacePendingMessage(id: number, message: ChatMessage): void {
    this.messages = this.messages.map(current => current.id === id ? message : current);
    this.changeDetector.markForCheck();
  }

  private updateMessage(id: number, patch: Partial<ChatMessage>): void {
    this.messages = this.messages.map(message => message.id === id ? { ...message, ...patch } : message);
    this.changeDetector.markForCheck();
  }

  private actionCreated(messageId: number, noun: string): void {
    this.updateMessage(messageId, { executing: false, executionMessage: `✓ ${noun[0].toUpperCase() + noun.slice(1)} creada correctamente.` });
  }

  private actionFailed(messageId: number, error: unknown): void {
    this.updateMessage(messageId, { executing: false, executionMessage: this.messageFrom(error) });
  }

  private newMessageId(): number {
    return this.nextMessageId++;
  }

  private messageFrom(error: unknown): string {
    const response = error instanceof HttpErrorResponse ? error.error : undefined;
    return response?.message || 'No fue posible generar la sugerencia. Inténtalo nuevamente.';
  }
}
