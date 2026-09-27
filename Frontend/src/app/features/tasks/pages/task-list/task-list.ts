import { Component, OnInit, inject } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import {
  Task,
  TaskPriority,
  TaskStatus,
} from '../../../../domain/task/task.model';

import { TaskService } from '../../../../infrastructure/tasks/task.service';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './task-list.html',
  styleUrl: './task-list.scss',
})
export class TaskListComponent implements OnInit {
  private readonly taskService = inject(TaskService);
  private readonly formBuilder = inject(FormBuilder);

  tasks: Task[] = [];

  loading = false;
  error = '';

  showCreateForm = false;
  creating = false;
  createError = '';

  editingTaskId: number | null = null;
  updating = false;
  updateError = '';

  deletingTaskId: number | null = null;

  readonly taskForm = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(150)]],
    description: [''],
    dueDate: [''],
    priority: ['MEDIA' as TaskPriority, Validators.required],
  });

  ngOnInit(): void {
    this.loadTasks();
  }

  loadTasks(): void {
    this.loading = true;
    this.error = '';

    this.taskService.getTasks().subscribe({
      next: (tasks) => {
        this.tasks = tasks;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error cargando tareas:', error);
        this.error = 'No se pudieron cargar las tareas.';
        this.loading = false;
      },
    });
  }

  // =========================
  // CREAR TAREA
  // =========================

  openCreateForm(): void {
    this.editingTaskId = null;
    this.showCreateForm = true;
    this.createError = '';
    this.updateError = '';

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

    const formValue = this.taskForm.getRawValue();

    this.taskService
      .createTask({
        title: formValue.title,
        description: formValue.description || undefined,
        dueDate: formValue.dueDate || undefined,
        priority: formValue.priority,
      })
      .subscribe({
        next: (task) => {
          this.tasks = [...this.tasks, task];
          this.creating = false;
          this.cancelCreate();
        },
        error: (error) => {
          console.error('Error creando tarea:', error);
          this.createError = 'No se pudo crear la tarea.';
          this.creating = false;
        },
      });
  }

  // =========================
  // EDITAR TAREA
  // =========================

  editTask(task: Task): void {
    this.showCreateForm = true;
    this.editingTaskId = task.id;
    this.updateError = '';
    this.createError = '';

    this.taskForm.reset({
      title: task.title,
      description: task.description ?? '',
      dueDate: task.dueDate
        ? this.formatDateForInput(task.dueDate)
        : '',
      priority: task.priority,
    });
  }

  updateTask(): void {
    if (this.taskForm.invalid || this.editingTaskId === null) {
      this.taskForm.markAllAsTouched();
      return;
    }

    this.updating = true;
    this.updateError = '';

    const formValue = this.taskForm.getRawValue();

    this.taskService
      .updateTask(this.editingTaskId, {
        title: formValue.title,
        description: formValue.description || undefined,
        dueDate: formValue.dueDate || undefined,
        priority: formValue.priority,
      })
      .subscribe({
        next: (updatedTask) => {
          this.tasks = this.tasks.map((task) =>
            task.id === updatedTask.id ? updatedTask : task
          );

          this.updating = false;
          this.editingTaskId = null;
          this.cancelCreate();
        },
        error: (error) => {
          console.error('Error actualizando tarea:', error);
          this.updateError = 'No se pudo actualizar la tarea.';
          this.updating = false;
        },
      });
  }

  // =========================
  // CAMBIAR ESTADO
  // =========================

  completeTask(task: Task): void {
    if (task.status === 'COMPLETADA') {
      return;
    }

    this.taskService
      .updateTaskStatus(task.id, {
        status: 'COMPLETADA',
      })
      .subscribe({
        next: (updatedTask) => {
          this.tasks = this.tasks.map((currentTask) =>
            currentTask.id === updatedTask.id
              ? updatedTask
              : currentTask
          );
        },
        error: (error) => {
          console.error('Error completando tarea:', error);
          this.error = 'No se pudo completar la tarea.';
        },
      });
  }

  // =========================
  // ELIMINAR TAREA
  // =========================

  deleteTask(task: Task): void {
    const confirmed = window.confirm(
      `¿Seguro que quieres eliminar "${task.title}"?`
    );

    if (!confirmed) {
      return;
    }

    this.deletingTaskId = task.id;
    this.error = '';

    this.taskService.deleteTask(task.id).subscribe({
      next: () => {
        this.tasks = this.tasks.filter(
          (currentTask) => currentTask.id !== task.id
        );

        this.deletingTaskId = null;
      },
      error: (error) => {
        console.error('Error eliminando tarea:', error);
        this.error = 'No se pudo eliminar la tarea.';
        this.deletingTaskId = null;
      },
    });
  }

  private formatDateForInput(date: string): string {
    return date.slice(0, 16);
  }
}