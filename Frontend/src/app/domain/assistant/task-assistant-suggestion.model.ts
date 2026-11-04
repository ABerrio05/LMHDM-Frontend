export interface TaskAssistantSuggestion {
  answer: string;
  recommendedActions: string[];
  providerConfigured: boolean;
  proposedActions: AssistantActionProposal[];
}

export interface AssistantActionProposal {
  type: 'TASK' | 'NOTE';
  title: string;
  description: string;
  dueDate: string;
  priority: 'ALTA' | 'MEDIA' | 'BAJA';
}

export interface TaskAssistantRequest {
  question: string;
}
