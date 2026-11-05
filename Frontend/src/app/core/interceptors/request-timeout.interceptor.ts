import { HttpInterceptorFn } from '@angular/common/http';
import { retry, throwError, timer, TimeoutError, timeout } from 'rxjs';

const REQUEST_TIMEOUT_MS = 20_000;

const SAFE_RETRY_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Evita que una pantalla permanezca indefinidamente en estado de carga si la
 * API o un proveedor externo deja una conexión abierta sin responder.
 */
export const requestTimeoutInterceptor: HttpInterceptorFn = (request, next) => {
  const response$ = next(request).pipe(timeout(REQUEST_TIMEOUT_MS));

  // Al arrancar, el backend puede tardar puntualmente en calentar sus consultas.
  // Reintentamos solo lecturas: nunca mutaciones que podrían duplicar una acción.
  if (!SAFE_RETRY_METHODS.has(request.method)) {
    return response$;
  }

  return response$.pipe(
    retry({
      count: 1,
      delay: (error) =>
        error instanceof TimeoutError ? timer(250) : throwError(() => error),
    })
  );
};
