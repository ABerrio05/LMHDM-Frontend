import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CollaborativeSpaceService } from '../../../../infrastructure/collaboration/collaborative-space.service';
import { SpaceListComponent } from './space-list';

describe('SpaceListComponent', () => {
  const spacesService = {
    listMine: vi.fn(), create: vi.fn(), listMembers: vi.fn(), listTasks: vi.fn(), invite: vi.fn(),
  };
  const space = { id: 4, name: 'Equipo NEXO', description: 'Planeación', creatorId: 7, createdAt: '2026-10-29T12:00:00' };
  let component: SpaceListComponent;

  beforeEach(() => {
    Object.values(spacesService).forEach(mock => mock.mockReset());
    TestBed.configureTestingModule({ providers: [{ provide: CollaborativeSpaceService, useValue: spacesService }] });
    component = TestBed.runInInjectionContext(() => new SpaceListComponent());
  });

  afterEach(() => TestBed.resetTestingModule());

  it('loads spaces and keeps task creation available after a list error', () => {
    spacesService.listMine.mockReturnValue(of([space]));
    component.loadSpaces();
    expect(component.spaces).toEqual([space]);
    expect(component.loading).toBe(false);

    spacesService.listMine.mockReturnValue(throwError(() => new Error('offline')));
    component.loadSpaces();
    expect(component.spaces).toEqual([space]);
    expect(component.error).toBe('No se pudieron cargar tus espacios colaborativos.');
  });

  it('creates a trimmed space and reports the result', () => {
    spacesService.create.mockReturnValue(of(space));
    component.spaceForm.setValue({ name: ' Equipo NEXO ', description: ' Planeación ' });
    component.createSpace();

    expect(spacesService.create).toHaveBeenCalledWith({ name: 'Equipo NEXO', description: 'Planeación' });
    expect(component.spaces).toEqual([space]);
    expect(component.feedback).toContain('Espacio creado');
    expect(component.creating).toBe(false);
  });

  it('validates the create form and exposes provider errors', () => {
    component.createSpace();
    expect(spacesService.create).not.toHaveBeenCalled();

    component.spaceForm.setValue({ name: 'NEXO', description: '' });
    spacesService.create.mockReturnValue(throwError(() => new HttpErrorResponse({ error: { message: 'Nombre repetido' } })));
    component.createSpace();
    expect(component.error).toBe('Nombre repetido');
    expect(component.creating).toBe(false);
  });

  it('loads members and tasks when expanding a space, then closes it', () => {
    const member = { id: 1, spaceId: 4, userId: 8, role: 'MIEMBRO' as const, joinedAt: '2026-10-29T12:00:00' };
    spacesService.listMembers.mockReturnValue(of([member]));
    spacesService.listTasks.mockReturnValue(of([]));

    component.toggleMembers(4);
    expect(component.expandedSpaceId).toBe(4);
    expect(component.members[4]).toEqual([member]);
    expect(component.spaceTasks[4]).toEqual([]);

    component.toggleMembers(4);
    expect(component.expandedSpaceId).toBeNull();
  });

  it('invites a member and preserves a useful error message on failure', () => {
    const member = { id: 2, spaceId: 4, userId: 8, role: 'MIEMBRO' as const, joinedAt: '2026-10-29T12:00:00' };
    spacesService.invite.mockReturnValue(of(member));
    component.inviteForm.setValue({ email: 'ana@nexo.test', role: 'MIEMBRO' });
    component.invite(4);
    expect(spacesService.invite).toHaveBeenCalledWith(4, { email: 'ana@nexo.test', role: 'MIEMBRO' });
    expect(component.members[4]).toEqual([member]);
    expect(component.feedback).toContain('Integrante agregado');

    component.inviteForm.setValue({ email: 'ana@nexo.test', role: 'MIEMBRO' });
    spacesService.invite.mockReturnValue(throwError(() => new Error('offline')));
    component.invite(4);
    expect(component.error).toBe('No se pudo agregar el integrante.');
  });
});
