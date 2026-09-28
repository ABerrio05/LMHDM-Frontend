import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('accessToken');

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

  return next(
    req.clone({
      headers,
    })
  );
};