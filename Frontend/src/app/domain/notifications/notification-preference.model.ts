export interface NotificationPreference {
  userId: number;
  activityEmailsEnabled: boolean;
  updatedAt: string | null;
}

export interface UpdateNotificationPreferenceRequest {
  activityEmailsEnabled: boolean;
}
