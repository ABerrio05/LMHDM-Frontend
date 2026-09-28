import { Component, OnInit, inject } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { finalize } from 'rxjs';

import { Task } from '../../../../domain/task/task.model';
import { TaskService } from '../../../../infrastructure/tasks/task.service';

import {
  Reminder,
  ReminderRequest,
} from '../../../../domain/reminder/reminder.model';

import { ReminderService } from '../../../../infrastructure/reminders/reminder.service';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './task-list.html',
  styleUrl: './task-list.scss',
})
export class TaskListComponent implements OnInit {
  private readonly taskService = inject(TaskService);
  private readonly reminderService = inject(ReminderService);
  private readonly formBuilder = inject(FormBuilder);

  // ============================================================
  // TAREAS
  // ============================================================

  tasks: Task[] = [];

  loading = false;
  error = '';

  // ============================================================
  // CREAR TAREA
  // ============================================================

  showCreateForm = false;
  creating = false;
  createError = '';

  readonly taskForm = this.formBuilder.nonNullable.group({
    title: [
      '',
      [
        Validators.required,
        Validators.maxLength(150),
      ],
    ],

    description: [''],

    dueDate: [''],

    priority: [
      'MEDIA' as 'ALTA' | 'MEDIA' | 'BAJA',
      Validators.required,
    ],
  });

  // ============================================================
  // EDITAR TAREA
  // ============================================================

  editingTaskId: number | null = null;
  updating = false;
  updateError = '';

  readonly editForm = this.formBuilder.nonNullable.group({
    title: [
      '',
      [
        Validators.required,
        Validators.maxLength(150),
      ],
    ],

    description: [''],

    dueDate: [''],

    priority: [
      'MEDIA' as 'ALTA' | 'MEDIA' | 'BAJA',
      Validators.required,
    ],
  });

  // ============================================================
  // ELIMINAR TAREA
  // ============================================================

  deletingTaskId: number | null = null;

  // ============================================================
  // RECORDATORIOS
  // ============================================================

  expandedTaskId: number | null = null;

  reminders: Record<number, Reminder[]> = {};

  remindersLoading: Record<number, boolean> = {};

  reminderError: Record<number, string> = {};

  reminderFormTaskId: number | null = null;

  creatingReminder = false;
  reminderCreateError = '';

  readonly reminderForm = this.formBuilder.nonNullable.group({
    scheduledAt: [
      '',
      Validators.required,
    ],

    message: [
      '',
      [
        Validators.required,
        Validators.maxLength(255),
      ],
    ],
  });

  // ============================================================
  // INICIO
  // ============================================================

  ngOnInit(): void {
    console.log('TaskListComponent iniciado');

    this.loadTasks();
  }

  // ============================================================
  // CARGAR TAREAS
  // ============================================================

  loadTasks(): void {
    console.log('INICIANDO CARGA DE TAREAS');

    this.loading = true;
    this.error = '';

    this.taskService
      .getTasks()
      .pipe(
        finalize(() => {
          console.log(
            'FINALIZÓ LA PETICIÓN DE TASKS'
          );

          this.loading = false;

          console.log(
            'LOADING FINAL:',
            this.loading
          );
        })
      )
      .subscribe({
        next: (tasks) => {
          console.log(
            'RESPUESTA DE TASKS:',
            tasks
          );

          if (Array.isArray(tasks)) {
            this.tasks = tasks;
          } else {
            console.warn(
              'La respuesta de /tasks no es un arreglo:',
              tasks
            );

            this.tasks = [];
          }

          console.log(
            'TAREAS CARGADAS:',
            this.tasks
          );
        },

        error: (error) => {
          console.error(
            'ERROR REAL CARGANDO TASKS:',
            error
          );

          console.error(
            'STATUS:',
            error?.status
          );

          console.error(
            'ERROR:',
            error?.error
          );

          this.tasks = [];

          this.error =
            'No se pudieron cargar las tareas.';
        },
      });
  }

  // ============================================================
  // CREAR TAREA
  // ============================================================

  openCreateForm(): void {
    this.showCreateForm = true;
    this.createError = '';

    this.taskForm.reset({
      title: '',
      description: '',
      dueDate: '',
      priority: 'MEDIA',
    });
  }

  cancelCreate(): void {
    this.showCreateForm = false;
    this.createError = '';

    this.taskForm.reset({
      title: '',
      description: '',
      dueDate: '',
      priority: 'MEDIA',
    });
  }

  createTask(): void {
    if (this.taskForm.invalid) {
      this.taskForm.markAllAsTouched();
      return;
    }

    this.creating = true;
    this.createError = '';

    const formValue =
      this.taskForm.getRawValue();

    this.taskService
      .createTask({
        title: formValue.title,
        description:
          formValue.description || undefined,
        dueDate:
          formValue.dueDate || undefined,
        priority: formValue.priority,
      })
      .subscribe({
        next: (task) => {
          console.log(
            'Tarea creada:',
            task
          );

          this.tasks = [
            ...this.tasks,
            task,
          ];

          this.creating = false;

          this.cancelCreate();
        },

        error: (error) => {
          console.error(
            'Error creando tarea:',
            error
          );

          this.createError =
            'No se pudo crear la tarea.';

          this.creating = false;
        },
      });
  }

  // ============================================================
  // EDITAR TAREA
  // ============================================================

  openEditForm(task: Task): void {
    this.editingTaskId = task.id;
    this.updateError = '';

    this.editForm.reset({
      title: task.title,
      description:
        task.description ?? '',
      dueDate:
        task.dueDate ?? '',
      priority: task.priority,
    });
  }

  cancelEdit(): void {
    this.editingTaskId = null;
    this.updateError = '';
  }

  updateTask(): void {
    if (
      this.editingTaskId === null ||
      this.editForm.invalid
    ) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.updating = true;
    this.updateError = '';

    const taskId =
      this.editingTaskId;

    const formValue =
      this.editForm.getRawValue();

    this.taskService
      .updateTask(taskId, {
        title: formValue.title,
        description:
          formValue.description || undefined,
        dueDate:
          formValue.dueDate || undefined,
        priority: formValue.priority,
      })
      .subscribe({
        next: (updatedTask) => {
          console.log(
            'Tarea actualizada:',
            updatedTask
          );

          this.tasks =
            this.tasks.map((task) =>
              task.id === updatedTask.id
                ? updatedTask
                : task
            );

          this.updating = false;

          this.cancelEdit();
        },

        error: (error) => {
          console.error(
            'Error actualizando tarea:',
            error
          );

          this.updateError =
            'No se pudo actualizar la tarea.';

          this.updating = false;
        },
      });
  }

  // ============================================================
  // COMPLETAR TAREA
  // ============================================================

  completeTask(task: Task): void {
    if (
      task.status === 'COMPLETADA'
    ) {
      return;
    }

    this.taskService
      .updateTaskStatus(
        task.id,
        {
          status: 'COMPLETADA',
        }
      )
      .subscribe({
        next: (updatedTask) => {
          console.log(
            'Tarea completada:',
            updatedTask
          );

          this.tasks =
            this.tasks.map((currentTask) =>
              currentTask.id ===
              updatedTask.id
                ? updatedTask
                : currentTask
            );
        },

        error: (error) => {
          console.error(
            'Error completando tarea:',
            error
          );
        },
      });
  }

  // ============================================================
  // ELIMINAR TAREA
  // ============================================================

  deleteTask(task: Task): void {
    const confirmed =
      window.confirm(
        `¿Seguro que deseas eliminar la tarea "${task.title}"?`
      );

    if (!confirmed) {
      return;
    }

    this.deletingTaskId =
      task.id;

    this.taskService
      .deleteTask(task.id)
      .subscribe({
        next: () => {
          console.log(
            'Tarea eliminada:',
            task.id
          );

          this.tasks =
            this.tasks.filter(
              (currentTask) =>
                currentTask.id !==
                task.id
            );

          delete this.reminders[
            task.id
          ];

          this.deletingTaskId = null;
        },

        error: (error) => {
          console.error(
            'Error eliminando tarea:',
            error
          );

          this.deletingTaskId = null;
        },
      });
  }

  // ============================================================
  // MOSTRAR / OCULTAR RECORDATORIOS
  // ============================================================

  toggleReminders(
    taskId: number
  ): void {
    if (
      this.expandedTaskId === taskId
    ) {
      this.expandedTaskId = null;
      this.reminderFormTaskId = null;

      return;
    }

    this.expandedTaskId = taskId;

    this.loadReminders(taskId);
  }

  // ============================================================
  // CARGAR RECORDATORIOS
  // ============================================================

  loadReminders(
    taskId: number
  ): void {
    this.remindersLoading[
      taskId
    ] = true;

    this.reminderError[
      taskId
    ] = '';

    this.reminderService
      .getReminders(taskId)
      .pipe(
        finalize(() => {
          this.remindersLoading[
            taskId
          ] = false;
        })
      )
      .subscribe({
        next: (reminders) => {
          console.log(
            'RECORDATORIOS DE TAREA:',
            taskId,
            reminders
          );

          this.reminders[
            taskId
          ] = Array.isArray(reminders)
            ? reminders
            : [];
        },

        error: (error) => {
          console.error(
            'Error cargando recordatorios:',
            error
          );

          this.reminders[
            taskId
          ] = [];

          this.reminderError[
            taskId
          ] =
            'No se pudieron cargar los recordatorios.';
        },
      });
  }

  // ============================================================
  // ABRIR FORMULARIO DE RECORDATORIO
  // ============================================================

  openReminderForm(
    taskId: number
  ): void {
    this.reminderFormTaskId =
      taskId;

    this.reminderCreateError = '';

    this.reminderForm.reset({
      scheduledAt: '',
      message: '',
    });
  }

  // ============================================================
  // CERRAR FORMULARIO DE RECORDATORIO
  // ============================================================

  cancelReminderForm(): void {
    this.reminderFormTaskId =
      null;

    this.reminderCreateError = '';

    this.reminderForm.reset({
      scheduledAt: '',
      message: '',
    });
  }

  // ============================================================
  // CREAR RECORDATORIO
  // ============================================================

  createReminder(): void {
    if (
      this.reminderFormTaskId ===
        null ||
      this.reminderForm.invalid
    ) {
      this.reminderForm.markAllAsTouched();
      return;
    }

    this.creatingReminder = true;
    this.reminderCreateError = '';

    const taskId =
      this.reminderFormTaskId;

    const formValue =
      this.reminderForm.getRawValue();

    const request: ReminderRequest = {
      scheduledAt:
        formValue.scheduledAt,

      message:
        formValue.message,
    };

    this.reminderService
      .createReminder(
        taskId,
        request
      )
      .subscribe({
        next: (reminder) => {
          console.log(
            'Recordatorio creado:',
            reminder
          );

          if (
            !this.reminders[
              taskId
            ]
          ) {
            this.reminders[
              taskId
            ] = [];
          }

          this.reminders[
            taskId
          ] = [
            ...this.reminders[
              taskId
            ],
            reminder,
          ];

          this.creatingReminder =
            false;

          this.cancelReminderForm();
        },

        error: (error) => {
          console.error(
            'Error creando recordatorio:',
            error
          );

          this.reminderCreateError =
            'No se pudo crear el recordatorio.';

          this.creatingReminder =
            false;
        },
      });
  }

  // ============================================================
  // ELIMINAR RECORDATORIO
  // ============================================================

  deleteReminder(
    reminderId: number,
    taskId: number
  ): void {
    const confirmed =
      window.confirm(
        '¿Seguro que deseas eliminar este recordatorio?'
      );

    if (!confirmed) {
      return;
    }

    this.reminderService
      .deleteReminder(
        reminderId
      )
      .subscribe({
        next: () => {
          console.log(
            'Recordatorio eliminado:',
            reminderId
          );

          this.reminders[
            taskId
          ] = (
            this.reminders[
              taskId
            ] ?? []
          ).filter(
            (reminder) =>
              reminder.id !==
              reminderId
          );
        },

        error: (error) => {
          console.error(
            'Error eliminando recordatorio:',
            error
          );
        },
      });
  }
}