export interface Prompt {
  clause_id: string;
  name: string;
  prompt_text: string;
  is_active: boolean;
  id?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Variable {
  id?: number;
  variable_name: string;
  variable_value: string;
  description?: string;
}

export interface PromptWithVariables extends Prompt {
  variables?: Variable[];
}

export interface CreatePromptData {
  clause_id: string;
  name: string;
  prompt_text: string;
  is_active?: boolean;
}

export interface UpdateVariableData {
  variable_name: string;
  variable_value: string;
}

export interface CreateVariableData {
  variable_name: string;
  variable_value: string;
  description?: string;
}

export interface BulkVariablesData {
  variables: CreateVariableData[];
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}
