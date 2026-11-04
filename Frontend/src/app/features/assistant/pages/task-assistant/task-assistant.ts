import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { concat, finalize, Observable, throwError, toArray } from 'rxjs';

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
    this.form.markAsPristine();
    this.form.markAsUntouched();
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

  executeProposedActions(messageId: number, actions: AssistantActionProposal[]): void {
    const invalidAction = actions.find(action => !this.isExecutable(action));
    if (invalidAction) {
      this.actionFailed(messageId, new Error('La propuesta no contiene los datos necesarios. No se aplicó ningún cambio.'));
      return;
    }
    const summary = actions.map(action => this.actionDescription(action)).join('\n• ');
    if (!window.confirm(`Se aplicarán estas acciones:\n• ${summary}\n\n¿Deseas confirmar todos los cambios?`)) return;
    this.updateMessage(messageId, { executing: true, executionMessage: '' });
    const requests = actions.map(action => this.requestFor(action));
    concat(...requests).pipe(toArray(), finalize(() => this.changeDetector.markForCheck())).subscribe({
      next: () => this.actionsCompleted(messageId, actions),
      error: (error: unknown) => this.actionFailed(messageId, error),
    });
  }

  private requestFor(action: AssistantActionProposal): Observable<unknown> {
    switch (action.type) {
      case 'TASK_CREATE':
        return this.tasks.createTask({
          title: action.title,
          description: action.description || undefined,
          dueDate: action.dueDate ? `${action.dueDate}T09:00` : undefined,
          priority: action.priority || 'MEDIA',
        });
      case 'NOTE_CREATE':
        return this.notes.create({ title: action.title, content: action.description || action.title });
      case 'TASK_UPDATE':
        return this.tasks.updateTask(action.targetId!, {
          title: action.title,
          description: action.description || undefined,
          dueDate: action.dueDate ? `${action.dueDate}T09:00` : undefined,
          priority: action.priority || 'MEDIA',
        });
      case 'NOTE_UPDATE':
        return this.notes.update(action.targetId!, { title: action.title, content: action.description || action.title });
      case 'TASK_DELETE':
        return this.tasks.deleteTask(action.targetId!);
      case 'NOTE_DELETE':
        return this.notes.delete(action.targetId!);
    }
    return throwError(() => new Error('La acción propuesta no es válida.'));
  }

  private isExecutable(action: AssistantActionProposal): boolean {
    if (action.type.endsWith('DELETE')) return action.targetId !== null && action.targetId > 0;
    if (action.type.endsWith('UPDATE')) return action.targetId !== null && action.targetId > 0 && !!action.title.trim();
    return !!action.title.trim();
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

  actionDescription(action: AssistantActionProposal): string {
    const subject = action.title || `${action.type.includes('TASK') ? 'tarea' : 'nota'} #${action.targetId}`;
    return `${this.actionLabel(action.type)}: ${subject}`;
  }

  hasDeleteAction(actions: AssistantActionProposal[] | undefined): boolean {
    return !!actions?.some(action => action.type.endsWith('DELETE'));
  }

  private actionsCompleted(messageId: number, actions: AssistantActionProposal[]): void {
    this.updateMessage(messageId, {
      executing: false,
      executionMessage: `✓ Cambios aplicados: ${actions.map(action => this.actionLabel(action.type)).join(', ')}.`,
    });
  }

  private actionFailed(messageId: number, error: unknown): void {
    this.updateMessage(messageId, { executing: false, executionMessage: this.messageFrom(error) });
  }

  actionLabel(type: AssistantActionProposal['type']): string {
    return {
      TASK_CREATE: 'Crear tarea', NOTE_CREATE: 'Guardar nota', TASK_UPDATE: 'Actualizar tarea',
      NOTE_UPDATE: 'Actualizar nota', TASK_DELETE: 'Eliminar tarea', NOTE_DELETE: 'Eliminar nota',
    }[type];
  }

  private newMessageId(): number {
    return this.nextMessageId++;
  }

  private messageFrom(error: unknown): string {
    if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
      return 'Tu sesión expiró o ya no es válida. Cierra sesión, inicia nuevamente e inténtalo otra vez.';
    }
    const response = error instanceof HttpErrorResponse ? error.error : undefined;
    return response?.message || 'No fue posible generar la sugerencia. Inténtalo nuevamente.';
  }
}
