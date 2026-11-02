import { RecurrenceFrequency } from '../task/task.model';

export interface Reminder {
  id: number;
  scheduledAt: string;
  message: string;
  taskId: number;
  recurrenceId: number | null;
}

export interface ReminderRequest {
  scheduledAt: string;
  message: string;
  recurrenceFrequency?: RecurrenceFrequency | null;
  recurrenceInterval?: number | null;
  recurrenceEndDate?: string | null;
}
