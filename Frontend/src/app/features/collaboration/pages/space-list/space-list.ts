import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import {
  CollaborativeSpace,
  SpaceMember,
} from '../../../../domain/collaboration/collaborative-space.model';
import { Task } from '../../../../domain/task/task.model';
import { CollaborativeSpaceService } from '../../../../infrastructure/collaboration/collaborative-space.service';

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

  spaces: CollaborativeSpace[] = [];
  members: Record<number, SpaceMember[]> = {};
  spaceTasks: Record<number, Task[]> = {};
  expandedSpaceId: number | null = null;
  loading = false;
  creating = false;
  inviting = false;
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

  ngOnInit(): void {
    this.loadSpaces();
  }

  loadSpaces(): void {
    this.loading = true;
    this.error = '';
    this.spacesService.listMine().pipe(finalize(() => this.loading = false)).subscribe({
      next: spaces => this.spaces = Array.isArray(spaces) ? spaces : [],
      error: () => this.error = 'No se pudieron cargar tus espacios colaborativos.',
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
      .pipe(finalize(() => this.creating = false))
      .subscribe({
        next: space => {
          this.spaces = [...this.spaces, space];
          this.spaceForm.reset({ name: '', description: '' });
          this.feedback = 'Espacio creado. Ya puedes invitar integrantes.';
        },
        error: error => this.error = this.messageFrom(error, 'No se pudo crear el espacio.'),
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
      next: members => this.members[spaceId] = Array.isArray(members) ? members : [],
      error: error => this.error = this.messageFrom(error, 'No se pudieron consultar los integrantes.'),
    });
    this.spacesService.listTasks(spaceId).subscribe({
      next: tasks => this.spaceTasks[spaceId] = Array.isArray(tasks) ? tasks : [],
      error: () => this.spaceTasks[spaceId] = [],
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
      .pipe(finalize(() => this.inviting = false))
      .subscribe({
        next: member => {
          this.members[spaceId] = [...(this.members[spaceId] ?? []), member];
          this.inviteForm.reset({ email: '', role: 'MIEMBRO' });
          this.feedback = 'Integrante agregado al espacio.';
        },
        error: error => this.error = this.messageFrom(error, 'No se pudo agregar el integrante.'),
      });
  }

  private messageFrom(error: unknown, fallback: string): string {
    const response = error instanceof HttpErrorResponse ? error.error : undefined;
    return response?.message || fallback;
  }
}
