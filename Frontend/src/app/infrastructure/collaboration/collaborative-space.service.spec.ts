import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../environments/environment';
import { CollaborativeSpaceService } from './collaborative-space.service';

describe('CollaborativeSpaceService', () => {
  let service: CollaborativeSpaceService;
  let http: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/spaces`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(CollaborativeSpaceService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  it('lists and creates the authenticated user spaces', () => {
    service.listMine().subscribe((spaces) => expect(spaces).toHaveLength(1));
    const listRequest = http.expectOne(baseUrl);
    expect(listRequest.request.method).toBe('GET');
    listRequest.flush([{ id: 1, name: 'Comité', description: 'Entrega final', creatorId: 1, createdAt: '2026-10-29T12:00:00' }]);

    const payload = { name: 'Proyecto NEXO', description: 'Planificación conjunta' };
    service.create(payload).subscribe((space) => expect(space.id).toBe(2));
    const createRequest = http.expectOne(baseUrl);
    expect(createRequest.request.method).toBe('POST');
    expect(createRequest.request.body).toEqual(payload);
    createRequest.flush({ id: 2, ...payload, creatorId: 1, createdAt: '2026-10-29T12:00:00' });
  });

  it('uses the space id for members, invitations and shared tasks', () => {
    service.listMembers(8).subscribe((members) => expect(members).toHaveLength(1));
    const membersRequest = http.expectOne(`${baseUrl}/8/members`);
    expect(membersRequest.request.method).toBe('GET');
    membersRequest.flush([{ id: 1, spaceId: 8, userId: 1, role: 'ADMINISTRADOR', joinedAt: '2026-10-29T12:00:00' }]);

    service.invite(8, { email: 'mateo@nexo.test', role: 'MIEMBRO' }).subscribe((member) => expect(member.role).toBe('MIEMBRO'));
    const inviteRequest = http.expectOne(`${baseUrl}/8/members`);
    expect(inviteRequest.request.method).toBe('POST');
    inviteRequest.flush({ id: 2, spaceId: 8, userId: 2, role: 'MIEMBRO', joinedAt: '2026-10-29T12:00:00' });

    service.listTasks(8).subscribe((tasks) => expect(tasks).toHaveLength(1));
    const tasksRequest = http.expectOne(`${baseUrl}/8/tasks`);
    expect(tasksRequest.request.method).toBe('GET');
    tasksRequest.flush([{ id: 10, title: 'Preparar comité', priority: 'ALTA', status: 'PENDIENTE' }]);
  });
});
