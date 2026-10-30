/** Acción HTTP registrada para el usuario que inició sesión. */
export interface AuditLog {
  id: number;
  userId: number;
  action: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  requestId: string;
  createdAt: string;
}
