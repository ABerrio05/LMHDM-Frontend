import { HttpInterceptorFn } from '@angular/common/http';
import { retry, throwError, timer, TimeoutError, timeout } from 'rxjs';

// En Docker local el backend puede estar ocupado con migraciones, correos o
// comprobaciones de salud. Un límite único de 20 s convertía respuestas lentas
// pero válidas en errores visibles de carga.
const READ_REQUEST_TIMEOUT_MS = 45_000;
const MUTATION_REQUEST_TIMEOUT_MS = 45_000;

const SAFE_RETRY_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Evita que una pantalla permanezca indefinidamente en estado de carga si la
 * API o un proveedor externo deja una conexión abierta sin responder.
 */
export const requestTimeoutInterceptor: HttpInterceptorFn = (request, next) => {
  const isSafeRead = SAFE_RETRY_METHODS.has(request.method);
  const timeoutMs = isSafeRead
    ? READ_REQUEST_TIMEOUT_MS
    : MUTATION_REQUEST_TIMEOUT_MS;
  const response$ = next(request).pipe(timeout(timeoutMs));

  // Al arrancar, el backend puede tardar puntualmente en calentar sus consultas.
  // Reintentamos solo lecturas: nunca mutaciones que podrían duplicar una acción.
  if (!isSafeRead) {
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
