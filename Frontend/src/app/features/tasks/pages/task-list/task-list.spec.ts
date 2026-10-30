import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../../../core/auth/auth.service';
import { CollaborativeSpaceService } from '../../../../infrastructure/collaboration/collaborative-space.service';
import { ReminderService } from '../../../../infrastructure/reminders/reminder.service';
import { TaskService } from '../../../../infrastructure/tasks/task.service';
import { TaskListComponent } from './task-list';

describe('TaskListComponent', () => {
  const taskService = { getTasks: vi.fn(), createTask: vi.fn(), updateTask: vi.fn(), updateTaskStatus: vi.fn(), deleteTask: vi.fn() };
  const reminderService = { getReminders: vi.fn(), createReminder: vi.fn(), deleteReminder: vi.fn() };
  const spacesService = { listMine: vi.fn() };
  const authService = { logout: vi.fn() };
  const router = { navigate: vi.fn().mockResolvedValue(true) };
  const changeDetector = { detectChanges: vi.fn() };
  const firstTask = { id: 1, title: 'Pruebas', description: 'Ejecutar calidad', dueDate: '2099-10-20T09:00:00', priority: 'ALTA' as const, status: 'PENDIENTE' as const, ownerId: 7, spaceId: null, recurrenceId: null };
  const completedTask = { ...firstTask, id: 2, title: 'Documentar', priority: 'BAJA' as const, status: 'COMPLETADA' as const };
  let component: TaskListComponent;

  beforeEach(() => {
    [taskService, reminderService, spacesService, authService].flatMap(Object.values).forEach(mock => mock.mockReset());
    router.navigate.mockClear();
    changeDetector.detectChanges.mockClear();
    TestBed.configureTestingModule({
      providers: [
        { provide: TaskService, useValue: taskService },
        { provide: ReminderService, useValue: reminderService },
        { provide: CollaborativeSpaceService, useValue: spacesService },
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
        { provide: ChangeDetectorRef, useValue: changeDetector },
      ],
    });
    component = TestBed.runInInjectionContext(() => new TaskListComponent());
  });

  afterEach(() => TestBed.resetTestingModule());

  it('loads tasks and spaces and calculates dashboard indicators', () => {
    taskService.getTasks.mockReturnValue(of([firstTask, completedTask]));
    spacesService.listMine.mockReturnValue(of([{ id: 3, name: 'Equipo', description: null, creatorId: 7, createdAt: '2026-10-29T12:00:00' }]));

    component.ngOnInit();

    expect(component.tasks).toHaveLength(2);
    expect(component.collaborativeSpaces).toHaveLength(1);
    expect(component.pendingTaskCount).toBe(1);
    expect(component.completedTaskCount).toBe(1);
    expect(component.highPriorityTaskCount).toBe(1);
    expect(component.priorityTaskCount('BAJA')).toBe(1);
    expect(component.upcomingTasks).toEqual([firstTask]);
    expect(component.completionPercentage).toBe(50);
  });

  it('keeps stable empty state when task and spaces endpoints fail', () => {
    taskService.getTasks.mockReturnValue(throwError(() => new Error('offline')));
    spacesService.listMine.mockReturnValue(throwError(() => new Error('offline')));

    component.ngOnInit();

    expect(component.tasks).toEqual([]);
    expect(component.collaborativeSpaces).toEqual([]);
    expect(component.error).toBe('No se pudieron cargar las tareas.');
    expect(component.completionPercentage).toBe(0);
  });

  it('creates a task, resets the form and shows feedback', () => {
    taskService.createTask.mockReturnValue(of(firstTask));
    component.openCreateForm();
    component.taskForm.setValue({ title: 'Pruebas', description: 'Ejecutar calidad', dueDate: '2099-10-20T09:00', priority: 'ALTA', spaceId: '' });

    component.createTask();

    expect(taskService.createTask).toHaveBeenCalledWith({ title: 'Pruebas', description: 'Ejecutar calidad', dueDate: '2099-10-20T09:00', priority: 'ALTA', spaceId: undefined });
    expect(component.tasks).toEqual([firstTask]);
    expect(component.showCreateForm).toBe(false);
    expect(component.toast?.kind).toBe('success');
  });

  it('does not create invalid tasks and shows an API validation error', () => {
    component.createTask();
    expect(taskService.createTask).not.toHaveBeenCalled();

    component.taskForm.setValue({ title: 'Pruebas', description: '', dueDate: '', priority: 'MEDIA', spaceId: '' });
    taskService.createTask.mockReturnValue(throwError(() => new HttpErrorResponse({ error: { message: 'Título duplicado' } })));
    component.createTask();
    expect(component.createError).toBe('Título duplicado');
    expect(component.creating).toBe(false);
    expect(component.toast?.kind).toBe('error');
  });

  it('opens, updates and completes a task', () => {
    component.tasks = [firstTask];
    component.openEditForm(firstTask);
    expect(component.editingTaskId).toBe(1);
    expect(component.editForm.value.dueDate).toBe('2099-10-20T09:00');

    const updated = { ...firstTask, title: 'Pruebas revisadas' };
    taskService.updateTask.mockReturnValue(of(updated));
    component.editForm.setValue({ title: updated.title, description: 'Ejecutar calidad', dueDate: '2099-10-20T09:00', priority: 'ALTA' });
    component.updateTask();
    expect(component.tasks).toEqual([updated]);
    expect(component.editingTaskId).toBeNull();

    const done = { ...updated, status: 'COMPLETADA' as const };
    taskService.updateTaskStatus.mockReturnValue(of(done));
    component.completeTask(updated);
    expect(taskService.updateTaskStatus).toHaveBeenCalledWith(1, { status: 'COMPLETADA' });
    expect(component.tasks).toEqual([done]);
  });

  it('confirms task and reminder deletion before changing state', () => {
    component.tasks = [firstTask];
    component.deleteTask(firstTask);
    expect(component.confirmationTitle).toContain('Eliminar');
    taskService.deleteTask.mockReturnValue(of(void 0));
    component.confirmAction();
    expect(component.tasks).toEqual([]);

    component.reminders[1] = [{ id: 2, taskId: 1, message: 'Recordar', scheduledAt: '2099-10-20T08:00:00' }];
    reminderService.deleteReminder.mockReturnValue(of(void 0));
    component.deleteReminder(2, 1);
    component.confirmAction();
    expect(component.reminders[1]).toEqual([]);
  });

  it('loads and creates reminders, and supports logout', () => {
    const reminder = { id: 2, taskId: 1, message: 'Recordar', scheduledAt: '2099-10-20T08:00:00' };
    reminderService.getReminders.mockReturnValue(of([reminder]));
    component.toggleReminders(1);
    expect(component.expandedTaskId).toBe(1);
    expect(component.reminders[1]).toEqual([reminder]);
    component.toggleReminders(1);
    expect(component.expandedTaskId).toBeNull();

    reminderService.createReminder.mockReturnValue(of(reminder));
    component.openReminderForm(1);
    component.reminderForm.setValue({ scheduledAt: '2099-10-20T08:00', message: 'Recordar' });
    component.createReminder();
    expect(component.reminderFormTaskId).toBeNull();
    expect(component.toast?.text).toContain('Recordatorio creado');

    component.logout();
    expect(authService.logout).toHaveBeenCalledOnce();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
