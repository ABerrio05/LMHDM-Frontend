import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { NoteRequest, PersonalNote } from '../../domain/notes/personal-note.model';

@Injectable({ providedIn: 'root' })
export class PersonalNoteService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/notes`;
  list(): Observable<PersonalNote[]> { return this.http.get<PersonalNote[]>(this.apiUrl); }
  create(request: NoteRequest): Observable<PersonalNote> { return this.http.post<PersonalNote>(this.apiUrl, request); }
  update(noteId: number, request: NoteRequest): Observable<PersonalNote> { return this.http.put<PersonalNote>(`${this.apiUrl}/${noteId}`, request); }
  delete(noteId: number): Observable<void> { return this.http.delete<void>(`${this.apiUrl}/${noteId}`); }
}
