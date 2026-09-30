export type TaskPriority = 'ALTA' | 'MEDIA' | 'BAJA';

export type TaskStatus =
  | 'PENDIENTE'
  | 'EN_PROGRESO'
  | 'COMPLETADA';

export interface Task {
  id: number;
  title: string;
  description: string | null;
  dueDate: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  ownerId: number;
  spaceId: number | null;
  recurrenceId: number | null;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  dueDate?: string;
  priority: TaskPriority;
  spaceId?: number;
}

export interface UpdateTaskRequest {
  title: string;
  description?: string;
  dueDate?: string;
  priority: TaskPriority;
}

export interface UpdateTaskStatusRequest {
  status: TaskStatus;
}