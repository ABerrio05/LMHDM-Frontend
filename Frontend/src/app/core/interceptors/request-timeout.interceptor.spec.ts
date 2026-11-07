import { HttpRequest, HttpResponse } from '@angular/common/http';
import { defer, firstValueFrom, of, throwError, TimeoutError } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestTimeoutInterceptor } from './request-timeout.interceptor';

describe('requestTimeoutInterceptor', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('entrega una mutación sin reintentarla', async () => {
    const request = new HttpRequest('POST', '/api/tasks', { title: 'Prueba' });
    const next = vi.fn(() => of(new HttpResponse({ status: 201 })));

    const response = await firstValueFrom(requestTimeoutInterceptor(request, next));

    expect(response).toBeInstanceOf(HttpResponse);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('no reintenta errores normales de una lectura', async () => {
    const request = new HttpRequest('GET', '/api/tasks');
    const error = new Error('fallo de red');
    let subscriptions = 0;
    const next = vi.fn(() => defer(() => {
      subscriptions += 1;
      return throwError(() => error);
    }));

    await expect(firstValueFrom(requestTimeoutInterceptor(request, next))).rejects.toBe(error);
    expect(subscriptions).toBe(1);
  });

  it('reintenta una lectura una vez cuando expira el tiempo', async () => {
    vi.useFakeTimers();
    const request = new HttpRequest('GET', '/api/tasks');
    let subscriptions = 0;
    const next = vi.fn(() => defer(() => {
      subscriptions += 1;
      return subscriptions === 1
        ? throwError(() => new TimeoutError())
        : of(new HttpResponse({ status: 200 }));
    }));

    const responsePromise = firstValueFrom(requestTimeoutInterceptor(request, next));
    await vi.advanceTimersByTimeAsync(250);
    const response = await responsePromise;

    expect(response).toBeInstanceOf(HttpResponse);
    expect(subscriptions).toBe(2);
  });
});
