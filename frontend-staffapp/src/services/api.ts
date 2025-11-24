import axios from 'axios';
import type {
  CreatePromptData,
  UpdateVariableData,
  CreateVariableData,
  BulkVariablesData,
} from '../types/prompt.types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const promptApi = {
  // List all prompts
  listPrompts: async () => {
    const response = await api.get('/prompts');
    return response.data;
  },

  // Get specific prompt with populated variables
  getPrompt: async (clauseId: string) => {
    const response = await api.get(`/prompts/${clauseId}`);
    return response.data;
  },

  // Get variables for a prompt
  getVariables: async (clauseId: string) => {
    const response = await api.get(`/prompts/${clauseId}/variables`);
    return response.data;
  },

  // Update a variable
  updateVariable: async (clauseId: string, data: UpdateVariableData) => {
    const response = await api.put(`/prompts/${clauseId}/variables`, data);
    return response.data;
  },

  // Create new prompt
  createPrompt: async (data: CreatePromptData) => {
    const response = await api.post('/prompts', data);
    return response.data;
  },

  // Add single variable
  addVariable: async (clauseId: string, data: CreateVariableData) => {
    const response = await api.post(`/prompts/${clauseId}/variables`, data);
    return response.data;
  },

  // Bulk add variables
  bulkAddVariables: async (clauseId: string, data: BulkVariablesData) => {
    const response = await api.post(`/prompts/${clauseId}/variables/bulk`, data);
    return response.data;
  },
};

export default api;
