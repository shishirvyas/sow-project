"""
Mock utilities for testing
"""
from unittest.mock import MagicMock
from typing import List, Dict, Optional


class MockPromptService:
    """Mock prompt service for testing"""
    
    @staticmethod
    def get_all_prompts() -> List[Dict]:
        """Mock get all prompts"""
        return [
            {
                'id': 1,
                'clause_id': 'TEST-001',
                'name': 'Test Prompt 1',
                'prompt_text': 'This is test prompt 1',
                'is_active': True,
                'created_at': '2024-01-01T00:00:00',
                'updated_at': '2024-01-01T00:00:00',
                'variable_count': 2
            },
            {
                'id': 2,
                'clause_id': 'TEST-002',
                'name': 'Test Prompt 2',
                'prompt_text': 'This is test prompt 2',
                'is_active': False,
                'created_at': '2024-01-02T00:00:00',
                'updated_at': '2024-01-02T00:00:00',
                'variable_count': 0
            }
        ]
    
    @staticmethod
    def get_prompt_by_id(prompt_id: int) -> Optional[Dict]:
        """Mock get prompt by ID"""
        if prompt_id == 1:
            return {
                'id': 1,
                'clause_id': 'TEST-001',
                'name': 'Test Prompt 1',
                'prompt_text': 'This is test prompt 1',
                'is_active': True,
                'created_at': '2024-01-01T00:00:00',
                'updated_at': '2024-01-01T00:00:00',
                'variables': [
                    {
                        'id': 1,
                        'variable_name': 'VAR1',
                        'variable_value': 'value1',
                        'description': 'Test variable 1'
                    },
                    {
                        'id': 2,
                        'variable_name': 'VAR2',
                        'variable_value': 'value2',
                        'description': 'Test variable 2'
                    }
                ]
            }
        return None
    
    @staticmethod
    def create_prompt(clause_id: str, name: str, prompt_text: str, is_active: bool) -> Dict:
        """Mock create prompt"""
        return {
            'id': 3,
            'clause_id': clause_id,
            'name': name,
            'prompt_text': prompt_text,
            'is_active': is_active,
            'created_at': '2024-01-03T00:00:00',
            'updated_at': '2024-01-03T00:00:00'
        }
    
    @staticmethod
    def update_prompt(prompt_id: int, clause_id: str, name: str, prompt_text: str, is_active: bool) -> Optional[Dict]:
        """Mock update prompt"""
        if prompt_id == 1:
            return {
                'id': prompt_id,
                'clause_id': clause_id,
                'name': name,
                'prompt_text': prompt_text,
                'is_active': is_active,
                'updated_at': '2024-01-04T00:00:00'
            }
        return None
    
    @staticmethod
    def delete_prompt(prompt_id: int) -> bool:
        """Mock delete prompt"""
        return prompt_id == 1
    
    @staticmethod
    def get_prompt_variables(prompt_id: int) -> List[Dict]:
        """Mock get prompt variables"""
        if prompt_id == 1:
            return [
                {
                    'id': 1,
                    'variable_name': 'VAR1',
                    'variable_value': 'value1',
                    'description': 'Test variable 1'
                },
                {
                    'id': 2,
                    'variable_name': 'VAR2',
                    'variable_value': 'value2',
                    'description': 'Test variable 2'
                }
            ]
        return []
    
    @staticmethod
    def add_variable(prompt_id: int, variable_name: str, variable_value: str, description: Optional[str]) -> Dict:
        """Mock add variable"""
        return {
            'id': 3,
            'prompt_id': prompt_id,
            'variable_name': variable_name,
            'variable_value': variable_value,
            'description': description
        }
    
    @staticmethod
    def delete_variable(variable_id: int) -> bool:
        """Mock delete variable"""
        return variable_id in [1, 2]


def mock_get_user_permissions(user_id: int) -> List[str]:
    """Mock get user permissions - returns all prompt permissions"""
    return [
        'prompt.view',
        'prompt.create',
        'prompt.edit',
        'prompt.delete'
    ]


def mock_get_user_permissions_no_access(user_id: int) -> List[str]:
    """Mock get user permissions - returns no permissions"""
    return []


def mock_get_current_user_authenticated():
    """Mock authenticated user dependency"""
    return 1  # User ID


def mock_get_current_user_unauthenticated():
    """Mock unauthenticated user dependency - raises HTTPException"""
    from fastapi import HTTPException
    raise HTTPException(status_code=401, detail="Not authenticated")
