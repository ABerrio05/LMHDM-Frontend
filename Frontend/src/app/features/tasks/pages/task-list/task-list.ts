import { CommonModule, DatePipe } from '@angular/common';

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

import { Router } from '@angular/router';

import { finalize } from 'rxjs';

import { Task } from '../../../../domain/task/task.model';
import { TaskService } from '../../../../infrastructure/tasks/task.service';

import {
  Reminder,
  ReminderRequest,
} from '../../../../domain/reminder/reminder.model';

import { ReminderService } from '../../../../infrastructure/reminders/reminder.service';

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

    console.log(
      'TaskListComponent iniciado'
    );

    this.loadTasks();
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

    console.log(
      'Cerrando sesión...'
    );

    this.authService.logout();

    console.log(
      'Token eliminado.'
    );

    this.router.navigate(['/login']);
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

  private getRequestError(error: any, fallback: string): string {
    const response = error?.error;

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

    console.log(
      'INICIANDO CARGA DE TAREAS'
    );

    this.loading = true;

    this.error = '';

    this.changeDetectorRef.detectChanges();


    this.taskService
      .getTasks()

      .pipe(

        finalize(() => {

          this.loading = false;

          console.log(
            'LOADING FINAL:',
            this.loading
          );

          this.changeDetectorRef.detectChanges();

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


    console.log(
      'CREANDO TAREA:',
      formValue
    );


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

      })

      .pipe(

        finalize(() => {

          this.creating = false;

          this.changeDetectorRef.detectChanges();

        })

      )

      .subscribe({

        next: (task) => {

          console.log(
            'TAREA CREADA:',
            task
          );


          this.tasks = [
            ...this.tasks,
            task,
          ];


          this.cancelCreate();

          this.showToast('Tarea creada correctamente.');

        },


        error: (error) => {

          console.error(
            'ERROR CREANDO TAREA:',
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

    console.log(
      'ABRIENDO EDICIÓN:',
      task
    );


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

    console.log(
      'CANCELANDO EDICIÓN'
    );


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

    console.log(
      'INICIANDO ACTUALIZACIÓN'
    );


    // ----------------------------------------------------------
    // VALIDACIONES
    // ----------------------------------------------------------

    if (this.editingTaskId === null) {

      console.warn(
        'No existe una tarea en edición.'
      );

      return;
    }


    if (this.editForm.invalid) {

      console.warn(
        'FORMULARIO DE EDICIÓN INVÁLIDO'
      );

      this.editForm.markAllAsTouched();

      return;
    }


    // ----------------------------------------------------------
    // EVITAR DOBLE PETICIÓN
    // ----------------------------------------------------------

    if (this.updating) {

      console.warn(
        'Ya existe una actualización en curso.'
      );

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


    console.log(
      'TASK ID:',
      taskId
    );

    console.log(
      'PAYLOAD UPDATE:',
      request
    );


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

          console.log(
            'FINALIZÓ PETICIÓN UPDATE'
          );


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

          console.log(
            'TAREA ACTUALIZADA CORRECTAMENTE:',
            updatedTask
          );


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


          console.log(
            'LISTA DESPUÉS DE ACTUALIZAR:',
            this.tasks
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

          console.error(
            'ERROR ACTUALIZANDO TAREA:',
            error
          );


          console.error(
            'STATUS:',
            error?.status
          );


          console.error(
            'ERROR BODY:',
            error?.error
          );


          console.error(
            'ERROR MESSAGE:',
            error?.message
          );


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


    console.log(
      'COMPLETANDO TAREA:',
      task.id
    );


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
            'TAREA COMPLETADA:',
            updatedTask
          );


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

          console.error(
            'ERROR COMPLETANDO TAREA:',
            error
          );

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


    console.log(
      'ELIMINANDO TAREA:',
      task.id
    );


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

          console.log(
            'TAREA ELIMINADA:',
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

          this.showToast('Tarea eliminada correctamente.');

        },


        error: (error) => {

          console.error(
            'ERROR ELIMINANDO TAREA:',
            error
          );

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
            'ERROR CARGANDO RECORDATORIOS:',
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


    console.log(
      'CREANDO RECORDATORIO:',
      request
    );


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

          console.log(
            'RECORDATORIO CREADO:',
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


          this.cancelReminderForm();

          this.showToast('Recordatorio creado correctamente.');

        },


        error: (error) => {

          console.error(
            'ERROR CREANDO RECORDATORIO:',
            error
          );


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


    console.log(
      'ELIMINANDO RECORDATORIO:',
      reminderId
    );


    this.reminderService

      .deleteReminder(
        reminderId
      )

      .subscribe({

        next: () => {

          console.log(
            'RECORDATORIO ELIMINADO:',
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


          this.changeDetectorRef.detectChanges();

          this.showToast('Recordatorio eliminado correctamente.');

        },


        error: (error) => {

          console.error(
            'ERROR ELIMINANDO RECORDATORIO:',
            error
          );

          this.showToast(
            this.getRequestError(error, 'No se pudo eliminar el recordatorio.'),
            'error'
          );

        },

      });
  }

}
