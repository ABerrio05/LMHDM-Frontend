import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../environments/environment';
import { PersonalNoteService } from './personal-note.service';

describe('PersonalNoteService', () => {
  let service: PersonalNoteService;
  let http: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/notes`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(PersonalNoteService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  it('lists and creates personal notes', () => {
    service.list().subscribe((notes) => expect(notes).toHaveLength(1));
    const listRequest = http.expectOne(baseUrl);
    expect(listRequest.request.method).toBe('GET');
    listRequest.flush([{ id: 1, title: 'Calidad', content: 'Revisar pruebas', ownerId: 1, createdAt: '2026-10-29T12:00:00' }]);

    const payload = { title: 'Comité', content: 'Preparar presentación' };
    service.create(payload).subscribe((note) => expect(note.id).toBe(2));
    const createRequest = http.expectOne(baseUrl);
    expect(createRequest.request.method).toBe('POST');
    expect(createRequest.request.body).toEqual(payload);
    createRequest.flush({ id: 2, ...payload, ownerId: 1, createdAt: '2026-10-29T12:00:00' });
  });

  it('updates and deletes a note by id', () => {
    service.update(3, { title: 'Calidad', content: 'Nota actualizada' }).subscribe((note) => expect(note.content).toBe('Nota actualizada'));
    const updateRequest = http.expectOne(`${baseUrl}/3`);
    expect(updateRequest.request.method).toBe('PUT');
    updateRequest.flush({ id: 3, title: 'Calidad', content: 'Nota actualizada', ownerId: 1, createdAt: '2026-10-29T12:00:00' });

    service.delete(3).subscribe();
    const deleteRequest = http.expectOne(`${baseUrl}/3`);
    expect(deleteRequest.request.method).toBe('DELETE');
    deleteRequest.flush(null);
  });
});
