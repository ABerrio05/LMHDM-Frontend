import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TaskAssistantService } from '../../../../infrastructure/assistant/task-assistant.service';
import { PersonalNoteService } from '../../../../infrastructure/notes/personal-note.service';
import { TaskService } from '../../../../infrastructure/tasks/task.service';
import { TaskAssistantComponent } from './task-assistant';

describe('TaskAssistantComponent', () => {
  const assistant = { suggest: vi.fn() };
  const tasks = { createTask: vi.fn() };
  const notes = { create: vi.fn() };
  let component: TaskAssistantComponent;

  beforeEach(() => {
    assistant.suggest.mockReset();
    tasks.createTask.mockReset();
    notes.create.mockReset();
    TestBed.configureTestingModule({
      providers: [
        { provide: TaskAssistantService, useValue: assistant },
        { provide: TaskService, useValue: tasks },
        { provide: PersonalNoteService, useValue: notes },
        { provide: ChangeDetectorRef, useValue: { markForCheck: vi.fn() } },
      ],
    });
    component = TestBed.runInInjectionContext(() => new TaskAssistantComponent());
  });

  afterEach(() => TestBed.resetTestingModule());

  it('keeps prior questions and answers in the temporary conversation', () => {
    assistant.suggest
      .mockReturnValueOnce(of({ answer: 'Empieza por la entrega urgente.', recommendedActions: ['Revisar entrega'], providerConfigured: true }))
      .mockReturnValueOnce(of({ answer: 'Después organiza el informe.', recommendedActions: ['Bloquear una hora'], providerConfigured: true }));

    component.form.setValue({ question: '¿Qué hago primero?' });
    component.requestSuggestion();
    component.form.setValue({ question: '¿Y después?' });
    component.requestSuggestion();

    expect(assistant.suggest).toHaveBeenNthCalledWith(1, '¿Qué hago primero?');
    expect(assistant.suggest).toHaveBeenNthCalledWith(2, '¿Y después?');
    expect(component.messages.map(message => message.text)).toEqual([
      '¿Qué hago primero?',
      'Empieza por la entrega urgente.',
      '¿Y después?',
      'Después organiza el informe.',
    ]);
  });

  it('replaces only the pending message with a readable error', () => {
    assistant.suggest.mockReturnValue(throwError(() => new Error('offline')));
    component.form.setValue({ question: '¿Qué sigue?' });

    component.requestSuggestion();

    expect(component.messages).toHaveLength(2);
    expect(component.messages[0].role).toBe('user');
    expect(component.messages[1]).toMatchObject({
      role: 'error',
      text: 'No fue posible generar la sugerencia. Inténtalo nuevamente.',
    });
  });

  it('clears the temporary conversation without calling the API', () => {
    component.messages = [{ id: 1, role: 'user', text: 'Pregunta anterior' }];

    component.clearConversation();

    expect(component.messages).toEqual([]);
    expect(assistant.suggest).not.toHaveBeenCalled();
  });

  it('creates an AI-proposed task only after confirmation', () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
    tasks.createTask.mockReturnValue(of({ id: 3 }));
    component.messages = [{ id: 1, role: 'assistant', text: 'Propuesta' }];

    component.executeProposedAction(1, { type: 'TASK', title: 'Preparar demo', description: 'Antes del viernes', dueDate: '2026-11-06', priority: 'ALTA' });

    expect(tasks.createTask).toHaveBeenCalledWith({ title: 'Preparar demo', description: 'Antes del viernes', dueDate: '2026-11-06T09:00', priority: 'ALTA' });
    expect(component.messages[0].executionMessage).toContain('Tarea creada');
  });
});
