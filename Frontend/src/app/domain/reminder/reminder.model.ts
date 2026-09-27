export interface Reminder {
  id: number;
  scheduledAt: string;
  message: string;
  taskId: number;
}

export interface ReminderRequest {
  scheduledAt: string;
  message: string;
}