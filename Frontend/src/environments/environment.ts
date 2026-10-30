export const environment = {
  // En Docker, Nginx reenvía /api al contenedor backend.
  // En desarrollo se usa environment.development.ts con localhost:8080.
  apiUrl: '/api',
};
