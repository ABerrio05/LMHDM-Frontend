import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../environments/environment';
import { TaskAssistantService } from './task-assistant.service';

describe('TaskAssistantService', () => {
  let service: TaskAssistantService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(TaskAssistantService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  it('sends the user question only to the authenticated assistant endpoint', () => {
    service.suggest('¿Qué tareas debo priorizar?').subscribe(response => {
      expect(response.answer).toBe('Empieza por la tarea urgente.');
    });

    const request = http.expectOne(`${environment.apiUrl}/assistant/suggestions`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ question: '¿Qué tareas debo priorizar?' });
    request.flush({
      answer: 'Empieza por la tarea urgente.',
      recommendedActions: ['Revisar: Entrega'],
      providerConfigured: true,
    });
  });
});
