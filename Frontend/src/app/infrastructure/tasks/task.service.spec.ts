import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { TaskService } from './task.service';
import { environment } from '../../../environments/environment';

describe('TaskService', () => {
  let service: TaskService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TaskService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  it('gets tasks from the protected API resource', () => {
    service.getTasks().subscribe((tasks) => expect(tasks).toHaveLength(1));

    const request = http.expectOne(`${environment.apiUrl}/tasks`);
    expect(request.request.method).toBe('GET');
    request.flush([{ id: 1, title: 'Probar NEXO', description: '', priority: 'ALTA', status: 'PENDIENTE' }]);
  });

  it('creates a task with the data supplied by the user', () => {
    const task = { title: 'Preparar comité', description: 'Pruebas', priority: 'MEDIA' as const };
    service.createTask(task).subscribe((created) => expect(created.id).toBe(5));

    const request = http.expectOne(`${environment.apiUrl}/tasks`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(task);
    request.flush({ id: 5, ...task, status: 'PENDIENTE' });
  });

  it('gets, updates, changes the status and deletes a task', () => {
    service.getTask(7).subscribe((task) => expect(task.id).toBe(7));
    http.expectOne(`${environment.apiUrl}/tasks/7`).flush({ id: 7, title: 'NEXO', priority: 'MEDIA', status: 'PENDIENTE' });

    service.updateTask(7, { title: 'NEXO actualizado', priority: 'ALTA' }).subscribe((task) => expect(task.title).toBe('NEXO actualizado'));
    const updateRequest = http.expectOne(`${environment.apiUrl}/tasks/7`);
    expect(updateRequest.request.method).toBe('PUT');
    updateRequest.flush({ id: 7, title: 'NEXO actualizado', priority: 'ALTA', status: 'PENDIENTE' });

    service.updateTaskStatus(7, { status: 'COMPLETADA' }).subscribe((task) => expect(task.status).toBe('COMPLETADA'));
    const statusRequest = http.expectOne(`${environment.apiUrl}/tasks/7/status`);
    expect(statusRequest.request.method).toBe('PATCH');
    statusRequest.flush({ id: 7, title: 'NEXO actualizado', priority: 'ALTA', status: 'COMPLETADA' });

    service.deleteTask(7).subscribe();
    const deleteRequest = http.expectOne(`${environment.apiUrl}/tasks/7`);
    expect(deleteRequest.request.method).toBe('DELETE');
    deleteRequest.flush(null);
  });
});
