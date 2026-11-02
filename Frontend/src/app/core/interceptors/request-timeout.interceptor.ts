import { HttpInterceptorFn } from '@angular/common/http';
import { timeout } from 'rxjs';

/**
 * Evita que una pantalla permanezca indefinidamente en estado de carga si la
 * API o un proveedor externo deja una conexión abierta sin responder.
 */
export const requestTimeoutInterceptor: HttpInterceptorFn = (request, next) =>
  next(request).pipe(timeout(20_000));
