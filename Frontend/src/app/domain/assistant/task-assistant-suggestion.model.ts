export interface TaskAssistantSuggestion {
  answer: string;
  recommendedActions: string[];
  providerConfigured: boolean;
}

export interface TaskAssistantRequest {
  question: string;
}
