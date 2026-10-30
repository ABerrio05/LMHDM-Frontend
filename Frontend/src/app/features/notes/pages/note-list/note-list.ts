import { CommonModule, DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { PersonalNote } from '../../../../domain/notes/personal-note.model';
import { PersonalNoteService } from '../../../../infrastructure/notes/personal-note.service';

@Component({
  selector: 'app-note-list', standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, DatePipe],
  templateUrl: './note-list.html', styleUrl: './note-list.scss',
})
export class NoteListComponent implements OnInit {
  private readonly notesService = inject(PersonalNoteService);
  private readonly formBuilder = inject(FormBuilder);
  notes: PersonalNote[] = [];
  loading = false; saving = false; error = ''; editingId: number | null = null;
  readonly noteForm = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(255)]],
    content: ['', [Validators.required, Validators.maxLength(10_000)]],
  });
  ngOnInit(): void { this.load(); }
  load(): void {
    this.loading = true; this.error = '';
    this.notesService.list().pipe(finalize(() => this.loading = false)).subscribe({
      next: notes => this.notes = Array.isArray(notes) ? notes : [],
      error: error => this.error = this.message(error, 'No se pudieron cargar tus notas.'),
    });
  }
  save(): void {
    if (this.noteForm.invalid || this.saving) { this.noteForm.markAllAsTouched(); return; }
    const request = this.noteForm.getRawValue(); this.saving = true; this.error = '';
    const action = this.editingId === null
      ? this.notesService.create(request)
      : this.notesService.update(this.editingId, request);
    action.pipe(finalize(() => this.saving = false)).subscribe({
      next: note => {
        this.notes = this.editingId === null ? [note, ...this.notes]
          : this.notes.map(current => current.id === note.id ? note : current);
        this.cancelEdit();
      },
      error: error => this.error = this.message(error, 'No se pudo guardar la nota.'),
    });
  }
  edit(note: PersonalNote): void { this.editingId = note.id; this.noteForm.setValue({ title: note.title, content: note.content }); }
  cancelEdit(): void { this.editingId = null; this.noteForm.reset({ title: '', content: '' }); }
  delete(note: PersonalNote): void {
    if (!confirm(`¿Eliminar la nota “${note.title}”?`)) return;
    this.notesService.delete(note.id).subscribe({
      next: () => this.notes = this.notes.filter(current => current.id !== note.id),
      error: error => this.error = this.message(error, 'No se pudo eliminar la nota.'),
    });
  }
  private message(error: unknown, fallback: string): string {
    const response = error instanceof HttpErrorResponse ? error.error : undefined;
    return response?.message || fallback;
  }
}
