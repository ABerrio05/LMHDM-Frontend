import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import {
  CollaborativeSpace,
  SpaceMember,
} from '../../../../domain/collaboration/collaborative-space.model';
import { Task } from '../../../../domain/task/task.model';
import { CollaborativeSpaceService } from '../../../../infrastructure/collaboration/collaborative-space.service';
import { TaskService } from '../../../../infrastructure/tasks/task.service';

@Component({
  selector: 'app-space-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './space-list.html',
  styleUrl: './space-list.scss',
})
export class SpaceListComponent implements OnInit {
  private readonly spacesService = inject(CollaborativeSpaceService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly taskService = inject(TaskService);

  spaces: CollaborativeSpace[] = [];
  members: Record<number, SpaceMember[]> = {};
  spaceTasks: Record<number, Task[]> = {};
  expandedSpaceId: number | null = null;
  editingSpaceId: number | null = null;
  loading = false;
  creating = false;
  inviting = false;
  savingEdit = false;
  creatingTaskForSpaceId: number | null = null;
  deletingSpaceId: number | null = null;
  error = '';
  feedback = '';

  readonly spaceForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    description: ['', Validators.maxLength(500)],
  });

  readonly inviteForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    role: ['MIEMBRO' as const, Validators.required],
  });

  readonly editForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    description: ['', Validators.maxLength(500)],
  });

  readonly spaceTaskForm = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(255)]],
    description: ['', Validators.maxLength(2_000)],
    dueDate: [''],
    priority: ['MEDIA' as const, Validators.required],
  });

  ngOnInit(): void {
    this.loadSpaces();
  }

  loadSpaces(): void {
    this.loading = true;
    this.error = '';
    this.spacesService.listMine().pipe(finalize(() => {
      this.loading = false;
      this.refreshView();
    })).subscribe({
      next: spaces => {
        this.spaces = Array.isArray(spaces) ? spaces : [];
        this.refreshView();
      },
      error: () => {
        this.error = 'No se pudieron cargar tus espacios colaborativos.';
        this.refreshView();
      },
    });
  }

  createSpace(): void {
    if (this.spaceForm.invalid || this.creating) {
      this.spaceForm.markAllAsTouched();
      return;
    }
    this.creating = true;
    this.feedback = '';
    const value = this.spaceForm.getRawValue();
    this.spacesService.create({ name: value.name.trim(), description: value.description.trim() || undefined })
      .pipe(finalize(() => {
        this.creating = false;
        this.refreshView();
      }))
      .subscribe({
        next: space => {
          this.spaces = [...this.spaces, space];
          this.spaceForm.reset({ name: '', description: '' });
          this.feedback = 'Espacio creado. Ya puedes invitar integrantes.';
          this.refreshView();
        },
        error: error => {
          this.error = this.messageFrom(error, 'No se pudo crear el espacio.');
          this.refreshView();
        },
      });
  }

  toggleMembers(spaceId: number): void {
    if (this.expandedSpaceId === spaceId) {
      this.expandedSpaceId = null;
      return;
    }
    this.expandedSpaceId = spaceId;
    this.feedback = '';
    this.spacesService.listMembers(spaceId).subscribe({
      next: members => {
        this.members[spaceId] = Array.isArray(members) ? members : [];
        this.refreshView();
      },
      error: error => {
        this.error = this.messageFrom(error, 'No se pudieron consultar los integrantes.');
        this.refreshView();
      },
    });
    this.spacesService.listTasks(spaceId).subscribe({
      next: tasks => {
        this.spaceTasks[spaceId] = Array.isArray(tasks) ? tasks : [];
        this.refreshView();
      },
      error: () => {
        this.spaceTasks[spaceId] = [];
        this.refreshView();
      },
    });
  }

  startEdit(space: CollaborativeSpace): void {
    this.error = '';
    this.feedback = '';
    this.editingSpaceId = space.id;
    this.editForm.reset({ name: space.name, description: space.description ?? '' });
  }

  cancelEdit(): void {
    this.editingSpaceId = null;
    this.editForm.reset({ name: '', description: '' });
  }

  saveEdit(spaceId: number): void {
    if (this.editForm.invalid || this.savingEdit) {
      this.editForm.markAllAsTouched();
      return;
    }
    this.savingEdit = true;
    this.error = '';
    const value = this.editForm.getRawValue();
    this.spacesService.update(spaceId, { name: value.name.trim(), description: value.description.trim() || undefined })
      .pipe(finalize(() => {
        this.savingEdit = false;
        this.refreshView();
      }))
      .subscribe({
        next: updated => {
          this.spaces = this.spaces.map(space => space.id === spaceId ? updated : space);
          this.cancelEdit();
          this.feedback = 'Espacio actualizado correctamente.';
          this.refreshView();
        },
        error: error => {
          this.error = this.messageFrom(error, 'No se pudo actualizar el espacio. Solo un administrador puede editarlo.');
          this.refreshView();
        },
      });
  }

  deleteSpace(space: CollaborativeSpace): void {
    if (this.deletingSpaceId !== null || !window.confirm(`¿Eliminar el espacio “${space.name}”? Las tareas no se borrarán; quedarán como tareas personales.`)) {
      return;
    }
    this.deletingSpaceId = space.id;
    this.error = '';
    this.feedback = '';
    this.spacesService.delete(space.id)
      .pipe(finalize(() => {
        this.deletingSpaceId = null;
        this.refreshView();
      }))
      .subscribe({
        next: () => {
          this.spaces = this.spaces.filter(item => item.id !== space.id);
          delete this.members[space.id];
          delete this.spaceTasks[space.id];
          if (this.expandedSpaceId === space.id) this.expandedSpaceId = null;
          if (this.editingSpaceId === space.id) this.cancelEdit();
          this.feedback = 'Espacio eliminado. Sus tareas quedaron disponibles como tareas personales.';
          this.refreshView();
        },
        error: error => {
          this.error = this.messageFrom(error, 'No se pudo eliminar el espacio. Solo un administrador puede eliminarlo.');
          this.refreshView();
        },
      });
  }

  invite(spaceId: number): void {
    if (this.inviteForm.invalid || this.inviting) {
      this.inviteForm.markAllAsTouched();
      return;
    }
    this.inviting = true;
    this.feedback = '';
    const value = this.inviteForm.getRawValue();
    this.spacesService.invite(spaceId, { email: value.email.trim(), role: value.role })
      .pipe(finalize(() => {
        this.inviting = false;
        this.refreshView();
      }))
      .subscribe({
        next: result => {
          if (result.member) this.members[spaceId] = [...(this.members[spaceId] ?? []), result.member];
          this.inviteForm.reset({ email: '', role: 'MIEMBRO' });
          this.feedback = result.registrationRequired
            ? 'Invitación enviada. La persona recibirá un enlace para registrarse y unirse al espacio.'
            : 'Integrante agregado al espacio y notificado por correo.';
          this.refreshView();
        },
        error: error => {
          this.error = this.messageFrom(error, 'No se pudo agregar el integrante.');
          this.refreshView();
        },
      });
  }

  createTaskInSpace(spaceId: number): void {
    if (this.spaceTaskForm.invalid || this.creatingTaskForSpaceId !== null) {
      this.spaceTaskForm.markAllAsTouched();
      return;
    }
    this.creatingTaskForSpaceId = spaceId;
    this.error = '';
    const value = this.spaceTaskForm.getRawValue();
    this.taskService.createTask({
      title: value.title.trim(),
      description: value.description.trim() || undefined,
      dueDate: value.dueDate ? `${value.dueDate}T23:59:00` : undefined,
      priority: value.priority,
      spaceId,
    }).pipe(finalize(() => {
      this.creatingTaskForSpaceId = null;
      this.refreshView();
    })).subscribe({
      next: task => {
        this.spaceTasks[spaceId] = [task, ...(this.spaceTasks[spaceId] ?? [])];
        this.spaceTaskForm.reset({ title: '', description: '', dueDate: '', priority: 'MEDIA' });
        this.feedback = 'Tarea creada y vinculada al espacio.';
        this.refreshView();
      },
      error: error => {
        this.error = this.messageFrom(error, 'No se pudo crear la tarea del espacio.');
        this.refreshView();
      },
    });
  }

  private messageFrom(error: unknown, fallback: string): string {
    const response = error instanceof HttpErrorResponse ? error.error : undefined;
    return response?.message || fallback;
  }

  private refreshView(): void {
    this.changeDetector.markForCheck();
  }
}
