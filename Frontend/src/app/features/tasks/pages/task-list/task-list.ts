import { CommonModule, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';

import {
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { Router, RouterLink } from '@angular/router';

import { finalize } from 'rxjs';

import { Task } from '../../../../domain/task/task.model';
import { TaskService } from '../../../../infrastructure/tasks/task.service';

import {
  Reminder,
  ReminderRequest,
} from '../../../../domain/reminder/reminder.model';

import { ReminderService } from '../../../../infrastructure/reminders/reminder.service';
import { CollaborativeSpace } from '../../../../domain/collaboration/collaborative-space.model';
import { CollaborativeSpaceService } from '../../../../infrastructure/collaboration/collaborative-space.service';

import { AuthService } from '../../../../core/auth/auth.service';

type ToastKind = 'success' | 'error';

interface ToastMessage {
  kind: ToastKind;
  text: string;
}


@Component({
  selector: 'app-task-list',
  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule,
    DatePipe,
    RouterLink,
  ],

  templateUrl: './task-list.html',
  styleUrl: './task-list.scss',
})
export class TaskListComponent implements OnInit {

  // ============================================================
  // SERVICIOS
  // ============================================================

  private readonly taskService =
    inject(TaskService);

  private readonly reminderService =
    inject(ReminderService);

  private readonly collaborativeSpaceService =
    inject(CollaborativeSpaceService);

  private readonly formBuilder =
    inject(FormBuilder);

  private readonly changeDetectorRef =
    inject(ChangeDetectorRef);

  private readonly authService =
    inject(AuthService);

  private readonly router =
    inject(Router);


  // ============================================================
  // TAREAS
  // ============================================================

  tasks: Task[] = [];

  collaborativeSpaces: CollaborativeSpace[] = [];

  loading = false;

  error = '';

  toast: ToastMessage | null = null;

  confirmationTitle = '';

  confirmationMessage = '';

  confirmationAction: (() => void) | null = null;


  // ============================================================
  // CREAR TAREA
  // ============================================================

  showCreateForm = false;

  creating = false;

  createError = '';


  readonly taskForm =
    this.formBuilder.nonNullable.group({

      title: [
        '',
        [
          Validators.required,
          Validators.maxLength(150),
        ],
      ],

      description: [
        '',
      ],

      dueDate: [
        '',
      ],

      priority: [
        'MEDIA' as 'ALTA' | 'MEDIA' | 'BAJA',
        Validators.required,
      ],

      spaceId: [
        '',
      ],

    });


  // ============================================================
  // EDITAR TAREA
  // ============================================================

  editingTaskId: number | null = null;

  updating = false;

  updateError = '';


  readonly editForm =
    this.formBuilder.nonNullable.group({

      title: [
        '',
        [
          Validators.required,
          Validators.maxLength(150),
        ],
      ],

      description: [
        '',
      ],

      dueDate: [
        '',
      ],

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


  readonly reminderForm =
    this.formBuilder.nonNullable.group({

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

    this.loadTasks();

    this.loadCollaborativeSpaces();
  }

  get pendingTaskCount(): number {
    return this.tasks.filter((task) => task.status !== 'COMPLETADA').length;
  }

  get completedTaskCount(): number {
    return this.tasks.filter((task) => task.status === 'COMPLETADA').length;
  }

  get highPriorityTaskCount(): number {
    return this.tasks.filter(
      (task) => task.status !== 'COMPLETADA' && task.priority === 'ALTA'
    ).length;
  }

  priorityTaskCount(priority: Task['priority']): number {
    return this.tasks.filter((task) => task.priority === priority).length;
  }

  get upcomingTasks(): Task[] {
    const now = new Date();

    return this.tasks
      .filter((task) => task.status !== 'COMPLETADA' && task.dueDate)
      .filter((task) => new Date(task.dueDate as string) >= now)
      .sort(
        (first, second) =>
          new Date(first.dueDate as string).getTime() -
          new Date(second.dueDate as string).getTime()
      )
      .slice(0, 3);
  }

  get completionPercentage(): number {
    if (this.tasks.length === 0) {
      return 0;
    }

    return Math.round((this.completedTaskCount / this.tasks.length) * 100);
  }


  // ============================================================
  // CERRAR SESIÓN
  // ============================================================

  logout(): void {

    this.authService.logout();

    void this.router.navigate(['/login']);
  }

  dismissToast(): void {
    this.toast = null;
  }

  cancelConfirmation(): void {
    this.confirmationAction = null;
    this.confirmationTitle = '';
    this.confirmationMessage = '';
  }

  confirmAction(): void {
    const action = this.confirmationAction;

    this.cancelConfirmation();

    action?.();
  }

  private showToast(text: string, kind: ToastKind = 'success'): void {
    this.toast = { text, kind };

    window.setTimeout(() => {
      if (this.toast?.text === text) {
        this.toast = null;
      }
    }, 4200);
  }

  private askForConfirmation(
    title: string,
    message: string,
    action: () => void
  ): void {
    this.confirmationTitle = title;
    this.confirmationMessage = message;
    this.confirmationAction = action;
  }

  private getRequestError(error: unknown, fallback: string): string {
    const response = error instanceof HttpErrorResponse ? error.error : undefined;

    if (response?.errors && typeof response.errors === 'object') {
      const details = Object.values(response.errors).filter(
        (value): value is string => typeof value === 'string'
      );

      if (details.length > 0) {
        return details.join(' ');
      }
    }

    return response?.message || fallback;
  }


  // ============================================================
  // CARGAR TAREAS
  // ============================================================

  loadTasks(): void {

    this.loading = true;

    this.error = '';

    this.changeDetectorRef.detectChanges();


    this.taskService
      .getTasks()

      .pipe(

        finalize(() => {

          this.loading = false;

          this.changeDetectorRef.detectChanges();

        })

      )

      .subscribe({

        next: (tasks) => {


          if (Array.isArray(tasks)) {

            this.tasks = tasks;

          } else {

            this.tasks = [];

          }

        },


        error: (error) => {


          this.tasks = [];

          this.error =
            'No se pudieron cargar las tareas.';

        },

      });
  }

  private loadCollaborativeSpaces(): void {
    this.collaborativeSpaceService.listMine().subscribe({
      next: (spaces) => {
        this.collaborativeSpaces = Array.isArray(spaces) ? spaces : [];
      },
      error: () => {
        // La creación de tareas personales debe seguir disponible si espacios no responde.
        this.collaborativeSpaces = [];
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

      spaceId: '',

    });
  }


  cancelCreate(): void {

    this.showCreateForm = false;

    this.createError = '';

    this.creating = false;


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

        title:
          formValue.title,

        description:
          formValue.description || undefined,

        dueDate:
          formValue.dueDate || undefined,

        priority:
          formValue.priority,

        spaceId:
          formValue.spaceId ? Number(formValue.spaceId) : undefined,

      })

      .pipe(

        finalize(() => {

          this.creating = false;

          this.changeDetectorRef.detectChanges();

        })

      )

      .subscribe({

        next: (task) => {


          this.tasks = [
            ...this.tasks,
            task,
          ];


          this.cancelCreate();

          this.showToast('Tarea creada correctamente.');

        },


        error: (error) => {


          this.createError = this.getRequestError(
            error,
            'No se pudo crear la tarea.'
          );

          this.showToast(this.createError, 'error');

        },

      });
  }


  // ============================================================
  // ABRIR EDICIÓN
  // ============================================================

  openEditForm(task: Task): void {


    this.editingTaskId = task.id;

    this.updateError = '';

    this.updating = false;


    this.editForm.reset({

      title:
        task.title,

      description:
        task.description ?? '',

      dueDate:
        this.formatDateForInput(
          task.dueDate
        ),

      priority:
        task.priority,

    });


    this.changeDetectorRef.detectChanges();
  }


  // ============================================================
  // CANCELAR EDICIÓN
  // ============================================================

  cancelEdit(): void {


    this.editingTaskId = null;

    this.updateError = '';

    this.updating = false;


    this.editForm.reset({

      title: '',

      description: '',

      dueDate: '',

      priority: 'MEDIA',

    });


    this.changeDetectorRef.detectChanges();
  }


  // ============================================================
  // ACTUALIZAR TAREA
  // ============================================================

  updateTask(): void {


    // ----------------------------------------------------------
    // VALIDACIONES
    // ----------------------------------------------------------

    if (this.editingTaskId === null) {

      return;
    }


    if (this.editForm.invalid) {

      this.editForm.markAllAsTouched();

      return;
    }


    // ----------------------------------------------------------
    // EVITAR DOBLE PETICIÓN
    // ----------------------------------------------------------

    if (this.updating) {

      return;
    }


    // ----------------------------------------------------------
    // ESTADO DE CARGA
    // ----------------------------------------------------------

    this.updating = true;

    this.updateError = '';


    const taskId =
      this.editingTaskId;


    const formValue =
      this.editForm.getRawValue();


    // ----------------------------------------------------------
    // PAYLOAD
    // ----------------------------------------------------------

    const request = {

      title:
        formValue.title.trim(),

      description:
        formValue.description.trim() || undefined,

      dueDate:
        formValue.dueDate || undefined,

      priority:
        formValue.priority,

    };


    this.changeDetectorRef.detectChanges();


    // ----------------------------------------------------------
    // PETICIÓN PUT
    // ----------------------------------------------------------

    this.taskService

      .updateTask(
        taskId,
        request
      )

      .pipe(

        finalize(() => {


          /*
           * MUY IMPORTANTE:
           *
           * Aunque el backend responda con error,
           * el botón NO debe quedarse en
           * "Guardando..."
           */

          this.updating = false;


          this.changeDetectorRef.detectChanges();

          this.showToast('Cambios guardados correctamente.');

        })

      )

      .subscribe({

        // ------------------------------------------------------
        // ÉXITO
        // ------------------------------------------------------

        next: (updatedTask) => {


          // ----------------------------------------------------
          // ACTUALIZAR LA TAREA EN MEMORIA
          // ----------------------------------------------------

          this.tasks =
            this.tasks.map(
              (task) => {

                if (
                  task.id === updatedTask.id
                ) {

                  return updatedTask;

                }

                return task;

              }
            );


          // ----------------------------------------------------
          // CERRAR FORMULARIO
          // ----------------------------------------------------

          this.editingTaskId = null;

          this.updateError = '';


          this.editForm.reset({

            title: '',

            description: '',

            dueDate: '',

            priority: 'MEDIA',

          });


          this.changeDetectorRef.detectChanges();

        },


        // ------------------------------------------------------
        // ERROR
        // ------------------------------------------------------

        error: (error) => {


          this.updateError = this.getRequestError(
            error,
            'No se pudo actualizar la tarea.'
          );

          this.showToast(this.updateError, 'error');

        },

      });
  }


  // ============================================================
  // FORMATEAR FECHA PARA DATETIME-LOCAL
  // ============================================================

  private formatDateForInput(
    dateValue: string | null | undefined
  ): string {

    if (!dateValue) {

      return '';
    }


    /*
     * El backend devuelve algo como:
     *
     * 2026-10-25T00:33:00
     *
     * datetime-local necesita:
     *
     * 2026-10-25T00:33
     */


    if (
      dateValue.length >= 16
    ) {

      return dateValue.substring(
        0,
        16
      );

    }


    return dateValue;
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


          this.tasks =
            this.tasks.map(

              (currentTask) =>

                currentTask.id ===
                updatedTask.id

                  ? updatedTask

                  : currentTask

            );


          this.changeDetectorRef.detectChanges();

          this.showToast('Tarea marcada como completada.');

        },


        error: (error) => {

          this.showToast(
            this.getRequestError(error, 'No se pudo completar la tarea.'),
            'error'
          );

        },

      });
  }


  // ============================================================
  // ELIMINAR TAREA
  // ============================================================

  deleteTask(task: Task): void {
    this.askForConfirmation(
      '¿Eliminar esta tarea?',
      `Eliminarás “${task.title}” y sus recordatorios asociados. Esta acción no se puede deshacer.`,
      () => this.executeDeleteTask(task)
    );
  }

  private executeDeleteTask(task: Task): void {


    this.deletingTaskId =
      task.id;


    this.taskService

      .deleteTask(
        task.id
      )

      .pipe(

        finalize(() => {

          this.deletingTaskId = null;

          this.changeDetectorRef.detectChanges();

        })

      )

      .subscribe({

        next: () => {


          this.tasks =
            this.tasks.filter(

              (currentTask) =>

                currentTask.id !==
                task.id

            );


          delete this.reminders[
            task.id
          ];

          this.showToast('Tarea eliminada correctamente.');

        },


        error: (error) => {

          this.showToast(
            this.getRequestError(error, 'No se pudo eliminar la tarea.'),
            'error'
          );

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


    this.expandedTaskId =
      taskId;


    this.loadReminders(
      taskId
    );
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

      .getReminders(
        taskId
      )

      .pipe(

        finalize(() => {

          this.remindersLoading[
            taskId
          ] = false;


          this.changeDetectorRef.detectChanges();

        })

      )

      .subscribe({

        next: (reminders) => {


          this.reminders[
            taskId
          ] = Array.isArray(reminders)

            ? reminders

            : [];

        },


        error: (error) => {


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
  // ABRIR FORMULARIO RECORDATORIO
  // ============================================================

  openReminderForm(
    taskId: number
  ): void {

    this.reminderFormTaskId =
      taskId;


    this.reminderCreateError =
      '';


    this.creatingReminder =
      false;


    this.reminderForm.reset({

      scheduledAt: '',

      message: '',

    });
  }


  // ============================================================
  // CERRAR FORMULARIO RECORDATORIO
  // ============================================================

  cancelReminderForm(): void {

    this.reminderFormTaskId =
      null;


    this.reminderCreateError =
      '';


    this.creatingReminder =
      false;


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


    if (this.creatingReminder) {

      return;
    }


    this.creatingReminder =
      true;


    this.reminderCreateError =
      '';


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

      .pipe(

        finalize(() => {

          this.creatingReminder =
            false;


          this.changeDetectorRef.detectChanges();

        })

      )

      .subscribe({

        next: (reminder) => {


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


          this.cancelReminderForm();

          this.showToast('Recordatorio creado correctamente.');

        },


        error: (error) => {


          this.reminderCreateError = this.getRequestError(
            error,
            'No se pudo crear el recordatorio.'
          );

          this.showToast(this.reminderCreateError, 'error');

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
    this.askForConfirmation(
      '¿Eliminar este recordatorio?',
      'Esta acción no se puede deshacer.',
      () => this.executeDeleteReminder(reminderId, taskId)
    );
  }

  private executeDeleteReminder(
    reminderId: number,
    taskId: number
  ): void {


    this.reminderService

      .deleteReminder(
        reminderId
      )

      .subscribe({

        next: () => {


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


          this.changeDetectorRef.detectChanges();

          this.showToast('Recordatorio eliminado correctamente.');

        },


        error: (error) => {

          this.showToast(
            this.getRequestError(error, 'No se pudo eliminar el recordatorio.'),
            'error'
          );

        },

      });
  }

}
