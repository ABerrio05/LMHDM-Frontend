import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PersonalNoteService } from '../../../../infrastructure/notes/personal-note.service';
import { NoteListComponent } from './note-list';

describe('NoteListComponent', () => {
  const notesService = { list: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() };
  const note = { id: 1, title: 'Comité', content: 'Preparar demo', ownerId: 7, createdAt: '2026-10-29T12:00:00' };
  let component: NoteListComponent;

  beforeEach(() => {
    Object.values(notesService).forEach(mock => mock.mockReset());
    TestBed.configureTestingModule({ providers: [{ provide: PersonalNoteService, useValue: notesService }] });
    component = TestBed.runInInjectionContext(() => new NoteListComponent());
  });

  afterEach(() => { vi.unstubAllGlobals(); TestBed.resetTestingModule(); });

  it('loads notes and handles unavailable responses', () => {
    notesService.list.mockReturnValue(of([note]));
    component.load();
    expect(component.notes).toEqual([note]);
    expect(component.loading).toBe(false);

    notesService.list.mockReturnValue(of({}));
    component.load();
    expect(component.notes).toEqual([]);

    notesService.list.mockReturnValue(throwError(() => new HttpErrorResponse({ error: { message: 'Sin acceso' } })));
    component.load();
    expect(component.error).toBe('Sin acceso');
  });

  it('creates, edits and updates a note', () => {
    notesService.create.mockReturnValue(of(note));
    component.noteForm.setValue({ title: note.title, content: note.content });
    component.save();
    expect(notesService.create).toHaveBeenCalledWith({ title: note.title, content: note.content });
    expect(component.notes).toEqual([note]);
    expect(component.editingId).toBeNull();

    component.edit(note);
    expect(component.editingId).toBe(1);
    notesService.update.mockReturnValue(of({ ...note, content: 'Actualizada' }));
    component.noteForm.setValue({ title: note.title, content: 'Actualizada' });
    component.save();
    expect(notesService.update).toHaveBeenCalledWith(1, { title: note.title, content: 'Actualizada' });
    expect(component.notes[0].content).toBe('Actualizada');
  });

  it('does not save invalid or repeated requests and reports save errors', () => {
    component.save();
    expect(notesService.create).not.toHaveBeenCalled();

    component.noteForm.setValue({ title: 'Nota', content: 'Contenido' });
    component.saving = true;
    component.save();
    expect(notesService.create).not.toHaveBeenCalled();

    component.saving = false;
    notesService.create.mockReturnValue(throwError(() => new HttpErrorResponse({ error: {} })));
    component.save();
    expect(component.error).toBe('No se pudo guardar la nota.');
    expect(component.saving).toBe(false);
  });

  it('only deletes after confirmation and removes the note on success', () => {
    notesService.delete.mockReturnValue(of(void 0));
    component.notes = [note];
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(false));
    component.delete(note);
    expect(notesService.delete).not.toHaveBeenCalled();

    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
    component.delete(note);
    expect(notesService.delete).toHaveBeenCalledWith(1);
    expect(component.notes).toEqual([]);
  });
});
