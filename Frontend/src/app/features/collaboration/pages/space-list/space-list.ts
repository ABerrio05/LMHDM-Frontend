import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import {
  CollaborativeSpace,
  SpaceMember,
  SpaceRole,
} from '../../../../domain/collaboration/collaborative-space.model';
import { Task } from '../../../../domain/task/task.model';
import { AuthService } from '../../../../core/auth/auth.service';
import { CollaborativeSpaceService } from '../../../../infrastructure/collaboration/collaborative-space.service';
import { ReminderService } from '../../../../infrastructure/reminders/reminder.service';
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
  private readonly reminderService = inject(ReminderService);
  private readonly auth = inject(AuthService);

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
  editingTaskId: number | null = null;
  reminderTaskId: number | null = null;
  savingTask = false;
  savingReminder = false;
  updatingRoleUserId: number | null = null;
  assigningTaskId: number | null = null;
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

  readonly taskEditForm = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(255)]],
    description: ['', Validators.maxLength(2_000)],
    dueDate: [''],
    priority: ['MEDIA' as const, Validators.required],
  });

  readonly reminderForm = this.formBuilder.nonNullable.group({
    scheduledAt: ['', Validators.required],
    message: ['', [Validators.required, Validators.maxLength(500)]],
  });

  get currentUserId(): number | null { return this.auth.currentUserId(); }

  roleFor(spaceId: number): SpaceRole | null {
    const userId = this.currentUserId;
    return userId === null ? null : (this.members[spaceId] ?? []).find(member => member.userId === userId)?.role ?? null;
  }

  isManager(spaceId: number): boolean {
    const role = this.roleFor(spaceId);
    return role === 'ADMINISTRADOR' || role === 'MODERADOR';
  }

  canManageTasks(spaceId: number): boolean { return this.roleFor(spaceId) !== 'INVITADO'; }
  canInvite(spaceId: number): boolean { return this.roleFor(spaceId) !== 'INVITADO'; }
  roleLabel(role: SpaceRole): string { return { ADMINISTRADOR: 'Administrador', MODERADOR: 'Moderador', MIEMBRO: 'Miembro', INVITADO: 'Invitado' }[role]; }

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
          this.spacesService.listMembers(spaceId).subscribe({
            next: members => { this.members[spaceId] = Array.isArray(members) ? members : []; this.refreshView(); },
          });
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

  updateMemberRole(spaceId: number, member: SpaceMember, role: string): void {
    if (!this.isManager(spaceId) || this.updatingRoleUserId !== null) return;
    this.updatingRoleUserId = member.userId;
    this.spacesService.updateMemberRole(spaceId, member.userId, role as SpaceRole)
      .pipe(finalize(() => { this.updatingRoleUserId = null; this.refreshView(); }))
      .subscribe({
        next: updated => {
          this.members[spaceId] = (this.members[spaceId] ?? []).map(item => item.userId === updated.userId
            ? { ...item, ...updated, userName: item.userName } : item);
          this.feedback = `Rol de ${member.userName} actualizado.`;
        },
        error: error => this.error = this.messageFrom(error, 'No se pudo modificar el rol.'),
      });
  }

  startTaskEdit(task: Task): void {
    this.editingTaskId = task.id;
    this.taskEditForm.reset({
      title: task.title,
      description: task.description ?? '',
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
      priority: task.priority,
    });
  }

  saveTaskEdit(spaceId: number, taskId: number): void {
    if (!this.canManageTasks(spaceId) || this.taskEditForm.invalid || this.savingTask) return;
    this.savingTask = true;
    const value = this.taskEditForm.getRawValue();
    this.taskService.updateTask(taskId, {
      title: value.title.trim(), description: value.description.trim() || undefined,
      dueDate: value.dueDate ? `${value.dueDate}T23:59:00` : undefined, priority: value.priority,
    }).pipe(finalize(() => { this.savingTask = false; this.refreshView(); })).subscribe({
      next: task => { this.replaceTask(spaceId, task); this.editingTaskId = null; this.feedback = 'Tarea actualizada.'; },
      error: error => this.error = this.messageFrom(error, 'No se pudo actualizar la tarea.'),
    });
  }

  deleteTask(spaceId: number, task: Task): void {
    if (!this.canManageTasks(spaceId) || !window.confirm(`¿Eliminar la tarea “${task.title}”?`)) return;
    this.taskService.deleteTask(task.id).subscribe({
      next: () => { this.spaceTasks[spaceId] = (this.spaceTasks[spaceId] ?? []).filter(item => item.id !== task.id); this.feedback = 'Tarea eliminada.'; this.refreshView(); },
      error: error => { this.error = this.messageFrom(error, 'No se pudo eliminar la tarea.'); this.refreshView(); },
    });
  }

  assignTask(spaceId: number, taskId: number, assigneeId: string): void {
    const parsedId = Number(assigneeId);
    if (!this.canManageTasks(spaceId) || !Number.isFinite(parsedId)) return;
    this.assigningTaskId = taskId;
    this.spacesService.assignTask(spaceId, taskId, parsedId)
      .pipe(finalize(() => { this.assigningTaskId = null; this.refreshView(); }))
      .subscribe({
        next: task => { this.replaceTask(spaceId, task); this.feedback = 'Tarea asignada correctamente.'; },
        error: error => this.error = this.messageFrom(error, 'No se pudo asignar la tarea.'),
      });
  }

  showReminderForm(taskId: number): void {
    this.reminderTaskId = this.reminderTaskId === taskId ? null : taskId;
    this.reminderForm.reset({ scheduledAt: '', message: '' });
  }

  createReminder(spaceId: number, taskId: number): void {
    if (!this.canManageTasks(spaceId) || this.reminderForm.invalid || this.savingReminder) return;
    this.savingReminder = true;
    const value = this.reminderForm.getRawValue();
    this.reminderService.createReminder(taskId, { scheduledAt: value.scheduledAt, message: value.message.trim() })
      .pipe(finalize(() => { this.savingReminder = false; this.refreshView(); }))
      .subscribe({
        next: () => { this.reminderTaskId = null; this.feedback = 'Recordatorio creado para la tarea.'; },
        error: error => this.error = this.messageFrom(error, 'No se pudo crear el recordatorio.'),
      });
  }

  memberName(spaceId: number, userId: number): string {
    return (this.members[spaceId] ?? []).find(member => member.userId === userId)?.userName ?? 'Integrante del espacio';
  }

  private replaceTask(spaceId: number, updated: Task): void {
    this.spaceTasks[spaceId] = (this.spaceTasks[spaceId] ?? []).map(task => task.id === updated.id ? updated : task);
  }

  private messageFrom(error: unknown, fallback: string): string {
    const response = error instanceof HttpErrorResponse ? error.error : undefined;
    return response?.message || fallback;
  }

  private refreshView(): void {
    this.changeDetector.markForCheck();
  }
}
