import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { AuthService } from '../auth/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  const token = authService.getAccessToken();

  let headers = req.headers.set(
    'ngrok-skip-browser-warning',
    'true'
  );

  if (token) {
    headers = headers.set(
      'Authorization',
      `Bearer ${token}`
    );
  }

  const authReq = req.clone({
    headers,
  });

  console.log('INTERCEPTOR:', {
    url: authReq.url,
    hasToken: !!token,
    hasNgrokHeader: authReq.headers.has(
      'ngrok-skip-browser-warning'
    ),
  });

  return next(authReq);
};