export interface TaskAssistantSuggestion {
  answer: string;
  recommendedActions: string[];
  providerConfigured: boolean;
  proposedActions: AssistantActionProposal[];
}

export interface AssistantActionProposal {
  type: 'TASK_CREATE' | 'NOTE_CREATE' | 'TASK_UPDATE' | 'NOTE_UPDATE' | 'TASK_DELETE' | 'NOTE_DELETE';
  targetId: number | null;
  title: string;
  description: string;
  dueDate: string;
  priority: 'ALTA' | 'MEDIA' | 'BAJA';
}

export interface TaskAssistantRequest {
  question: string;
}
