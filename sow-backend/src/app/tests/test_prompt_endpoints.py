"""
Test cases for Prompt Template endpoints
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from src.app.tests.mocks import (
    MockPromptService,
    mock_get_user_permissions,
    mock_get_user_permissions_no_access,
    mock_get_current_user_authenticated,
    mock_get_current_user_unauthenticated
)


class TestGetPrompts:
    """Tests for GET /api/v1/prompts"""
    
    @patch('src.app.api.v1.endpoints.get_current_user', side_effect=mock_get_current_user_authenticated)
    @patch('src.app.api.v1.endpoints.get_user_permissions', side_effect=mock_get_user_permissions)
    @patch('src.app.services.prompt_service.get_all_prompts', side_effect=MockPromptService.get_all_prompts)
    def test_get_prompts_success(self, mock_prompts, mock_perms, mock_user, client):
        """Test getting all prompts"""
        response = client.get("/api/v1/prompts")
        
        assert response.status_code == 200
        data = response.json()
        assert "prompts" in data
        assert "count" in data
        assert data["count"] == 2
        assert len(data["prompts"]) == 2
        assert data["prompts"][0]["clause_id"] == "TEST-001"
        assert data["prompts"][0]["name"] == "Test Prompt 1"
        assert data["prompts"][0]["variable_count"] == 2
    
    @patch('src.app.api.v1.endpoints.get_current_user', side_effect=mock_get_current_user_authenticated)
    @patch('src.app.api.v1.endpoints.get_user_permissions', side_effect=mock_get_user_permissions)
    @patch('src.app.services.prompt_service.get_all_prompts', side_effect=MockPromptService.get_all_prompts)
    def test_get_prompts_with_pagination(self, mock_prompts, mock_perms, mock_user, client):
        """Test getting prompts with pagination"""
        # Note: Current implementation doesn't support pagination
        # This test verifies the current behavior
        response = client.get("/api/v1/prompts")
        
        assert response.status_code == 200
        data = response.json()
        assert "prompts" in data
        assert len(data["prompts"]) == 2
    
    @patch('src.app.api.v1.endpoints.get_current_user', side_effect=mock_get_current_user_authenticated)
    @patch('src.app.api.v1.endpoints.get_user_permissions', side_effect=mock_get_user_permissions)
    @patch('src.app.services.prompt_service.get_all_prompts', side_effect=MockPromptService.get_all_prompts)
    def test_get_prompts_with_filters(self, mock_prompts, mock_perms, mock_user, client):
        """Test getting prompts with filters"""
        # Note: Current implementation doesn't support filters
        # This test verifies the current behavior returns all
        response = client.get("/api/v1/prompts?is_active=true")
        
        assert response.status_code == 200
        data = response.json()
        assert "prompts" in data
        # Returns all prompts regardless of filter (current behavior)
        assert len(data["prompts"]) == 2
    
    @patch('src.app.api.v1.endpoints.get_current_user', side_effect=mock_get_current_user_unauthenticated)
    def test_get_prompts_unauthorized(self, mock_user, client):
        """Test getting prompts without auth"""
        response = client.get("/api/v1/prompts")
        
        assert response.status_code == 401
        assert "Not authenticated" in response.json()["detail"]


    @patch('src.app.api.v1.endpoints.get_current_user', side_effect=mock_get_current_user_authenticated)
    @patch('src.app.api.v1.endpoints.get_user_permissions', side_effect=mock_get_user_permissions_no_access)
    def test_get_prompts_no_permission(self, mock_perms, mock_user, client):
        """Test getting prompts without permission"""
        response = client.get("/api/v1/prompts")
        
        assert response.status_code == 403
        assert "Insufficient permissions" in response.json()["detail"]


class TestGetPromptById:
    """Tests for GET /api/v1/prompts/{prompt_id}"""
    
    @patch('src.app.api.v1.endpoints.get_current_user', side_effect=mock_get_current_user_authenticated)
    @patch('src.app.api.v1.endpoints.get_user_permissions', side_effect=mock_get_user_permissions)
    @patch('src.app.services.prompt_service.get_prompt_by_id', side_effect=MockPromptService.get_prompt_by_id)
    def test_get_prompt_success(self, mock_prompt, mock_perms, mock_user, client):
        """Test getting specific prompt by ID"""
        response = client.get("/api/v1/prompts/1")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == 1
        assert data["clause_id"] == "TEST-001"
        assert data["name"] == "Test Prompt 1"
        assert "variables" in data
        assert len(data["variables"]) == 2
    
    @patch('src.app.api.v1.endpoints.get_current_user', side_effect=mock_get_current_user_authenticated)
    @patch('src.app.api.v1.endpoints.get_user_permissions', side_effect=mock_get_user_permissions)
    @patch('src.app.services.prompt_service.get_prompt_by_id', side_effect=MockPromptService.get_prompt_by_id)
    def test_get_prompt_not_found(self, mock_prompt, mock_perms, mock_user, client):
        """Test getting non-existent prompt"""
        response = client.get("/api/v1/prompts/999")
        
        assert response.status_code == 404
        assert "Prompt not found" in response.json()["detail"]
    
    @patch('src.app.api.v1.endpoints.get_current_user', side_effect=mock_get_current_user_unauthenticated)
    def test_get_prompt_unauthorized(self, mock_user, client):
        """Test getting prompt without auth"""
        response = client.get("/api/v1/prompts/1")
        
        assert response.status_code == 401
        assert "Not authenticated" in response.json()["detail"]


class TestCreatePrompt:
    """Tests for POST /api/v1/prompts"""
    
    @patch('src.app.api.v1.endpoints.get_current_user', side_effect=mock_get_current_user_authenticated)
    @patch('src.app.api.v1.endpoints.get_user_permissions', side_effect=mock_get_user_permissions)
    @patch('src.app.services.prompt_service.create_prompt', side_effect=MockPromptService.create_prompt)
    def test_create_prompt_success(self, mock_create, mock_perms, mock_user, client):
        """Test creating new prompt"""
        payload = {
            "clause_id": "TEST-003",
            "name": "New Test Prompt",
            "prompt_text": "This is a new test prompt",
            "is_active": True
        }
        
        response = client.post("/api/v1/prompts", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "Prompt created successfully" in data["message"]
        assert "prompt" in data
        assert data["prompt"]["clause_id"] == "TEST-003"
        assert data["prompt"]["name"] == "New Test Prompt"
    
    @patch('src.app.api.v1.endpoints.get_current_user', side_effect=mock_get_current_user_authenticated)
    @patch('src.app.api.v1.endpoints.get_user_permissions', side_effect=mock_get_user_permissions)
    def test_create_prompt_invalid_data(self, mock_perms, mock_user, client):
        """Test creating prompt with invalid data"""
        payload = {
            "clause_id": "TEST-003",
            # Missing required fields: name, prompt_text
        }
        
        response = client.post("/api/v1/prompts", json=payload)
        
        assert response.status_code == 422  # Validation error
    
    @patch('src.app.api.v1.endpoints.get_current_user', side_effect=mock_get_current_user_authenticated)
    @patch('src.app.api.v1.endpoints.get_user_permissions', side_effect=mock_get_user_permissions)
    @patch('src.app.services.prompt_service.create_prompt')
    def test_create_prompt_duplicate_name(self, mock_create, mock_perms, mock_user, client):
        """Test creating prompt with duplicate name"""
        # Mock database constraint violation
        mock_create.side_effect = Exception("Duplicate key value violates unique constraint")
        
        payload = {
            "clause_id": "TEST-001",
            "name": "Test Prompt 1",
            "prompt_text": "Duplicate prompt",
            "is_active": True
        }
        
        response = client.post("/api/v1/prompts", json=payload)
        
        assert response.status_code == 500
        assert "Duplicate key" in response.json()["detail"]
    
    @patch('src.app.api.v1.endpoints.get_current_user', side_effect=mock_get_current_user_unauthenticated)
    def test_create_prompt_unauthorized(self, mock_user, client):
        """Test creating prompt without auth"""
        payload = {
            "clause_id": "TEST-003",
            "name": "New Test Prompt",
            "prompt_text": "This is a new test prompt",
            "is_active": True
        }
        
        response = client.post("/api/v1/prompts", json=payload)
        
        assert response.status_code == 401
        assert "Not authenticated" in response.json()["detail"]
    
    @patch('src.app.api.v1.endpoints.get_current_user', side_effect=mock_get_current_user_authenticated)
    @patch('src.app.api.v1.endpoints.get_user_permissions', side_effect=mock_get_user_permissions_no_access)
    def test_create_prompt_no_permission(self, mock_perms, mock_user, client):
        """Test creating prompt without permission"""
        payload = {
            "clause_id": "TEST-003",
            "name": "New Test Prompt",
            "prompt_text": "This is a new test prompt",
            "is_active": True
        }
        
        response = client.post("/api/v1/prompts", json=payload)
        
        assert response.status_code == 403
        assert "Insufficient permissions" in response.json()["detail"]


class TestUpdatePrompt:
    """Tests for PUT /api/v1/prompts/{prompt_id}"""
    
    @patch('src.app.api.v1.endpoints.get_current_user', side_effect=mock_get_current_user_authenticated)
    @patch('src.app.api.v1.endpoints.get_user_permissions', side_effect=mock_get_user_permissions)
    @patch('src.app.services.prompt_service.update_prompt', side_effect=MockPromptService.update_prompt)
    def test_update_prompt_success(self, mock_update, mock_perms, mock_user, client):
        """Test updating prompt"""
        payload = {
            "clause_id": "TEST-001-UPDATED",
            "name": "Updated Test Prompt",
            "prompt_text": "This is an updated test prompt",
            "is_active": False
        }
        
        response = client.put("/api/v1/prompts/1", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "Prompt updated successfully" in data["message"]
        assert "prompt" in data
        assert data["prompt"]["clause_id"] == "TEST-001-UPDATED"
        assert data["prompt"]["name"] == "Updated Test Prompt"
    
    @patch('src.app.api.v1.endpoints.get_current_user', side_effect=mock_get_current_user_authenticated)
    @patch('src.app.api.v1.endpoints.get_user_permissions', side_effect=mock_get_user_permissions)
    @patch('src.app.services.prompt_service.update_prompt', side_effect=MockPromptService.update_prompt)
    def test_update_prompt_partial(self, mock_update, mock_perms, mock_user, client):
        """Test partial prompt update"""
        # Note: Current API requires all fields, but test documents the behavior
        payload = {
            "clause_id": "TEST-001",
            "name": "Partially Updated",
            "prompt_text": "Updated text only",
            "is_active": True
        }
        
        response = client.put("/api/v1/prompts/1", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["prompt"]["name"] == "Partially Updated"
    
    @patch('src.app.api.v1.endpoints.get_current_user', side_effect=mock_get_current_user_authenticated)
    @patch('src.app.api.v1.endpoints.get_user_permissions', side_effect=mock_get_user_permissions)
    @patch('src.app.services.prompt_service.update_prompt', side_effect=MockPromptService.update_prompt)
    def test_update_prompt_not_found(self, mock_update, mock_perms, mock_user, client):
        """Test updating non-existent prompt"""
        payload = {
            "clause_id": "TEST-999",
            "name": "Non-existent Prompt",
            "prompt_text": "This prompt doesn't exist",
            "is_active": True
        }
        
        response = client.put("/api/v1/prompts/999", json=payload)
        
        assert response.status_code == 404
        assert "Prompt not found" in response.json()["detail"]
    
    @patch('src.app.api.v1.endpoints.get_current_user', side_effect=mock_get_current_user_authenticated)
    @patch('src.app.api.v1.endpoints.get_user_permissions', side_effect=mock_get_user_permissions)
    def test_update_prompt_invalid_data(self, mock_perms, mock_user, client):
        """Test updating prompt with invalid data"""
        payload = {
            "clause_id": "TEST-001",
            # Missing required fields
        }
        
        response = client.put("/api/v1/prompts/1", json=payload)
        
        assert response.status_code == 422  # Validation error
    
    @patch('src.app.api.v1.endpoints.get_current_user', side_effect=mock_get_current_user_unauthenticated)
    def test_update_prompt_unauthorized(self, mock_user, client):
        """Test updating prompt without auth"""
        payload = {
            "clause_id": "TEST-001",
            "name": "Updated",
            "prompt_text": "Updated text",
            "is_active": True
        }
        
        response = client.put("/api/v1/prompts/1", json=payload)
        
        assert response.status_code == 401
        assert "Not authenticated" in response.json()["detail"]


class TestDeletePrompt:
    """Tests for DELETE /api/v1/prompts/{prompt_id}"""
    
    @patch('src.app.api.v1.endpoints.get_current_user', side_effect=mock_get_current_user_authenticated)
    @patch('src.app.api.v1.endpoints.get_user_permissions', side_effect=mock_get_user_permissions)
    @patch('src.app.services.prompt_service.delete_prompt', side_effect=MockPromptService.delete_prompt)
    def test_delete_prompt_success(self, mock_delete, mock_perms, mock_user, client):
        """Test deleting prompt"""
        response = client.delete("/api/v1/prompts/1")
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "Prompt deleted successfully" in data["message"]
    
    @patch('src.app.api.v1.endpoints.get_current_user', side_effect=mock_get_current_user_authenticated)
    @patch('src.app.api.v1.endpoints.get_user_permissions', side_effect=mock_get_user_permissions)
    @patch('src.app.services.prompt_service.delete_prompt', side_effect=MockPromptService.delete_prompt)
    def test_delete_prompt_not_found(self, mock_delete, mock_perms, mock_user, client):
        """Test deleting non-existent prompt"""
        response = client.delete("/api/v1/prompts/999")
        
        assert response.status_code == 404
        assert "Prompt not found" in response.json()["detail"]
    
    @patch('src.app.api.v1.endpoints.get_current_user', side_effect=mock_get_current_user_authenticated)
    @patch('src.app.api.v1.endpoints.get_user_permissions', side_effect=mock_get_user_permissions)
    @patch('src.app.services.prompt_service.delete_prompt')
    def test_delete_prompt_in_use(self, mock_delete, mock_perms, mock_user, client):
        """Test deleting prompt that's in use"""
        # Mock foreign key constraint violation
        mock_delete.side_effect = Exception("violates foreign key constraint")
        
        response = client.delete("/api/v1/prompts/1")
        
        assert response.status_code == 500
        assert "foreign key constraint" in response.json()["detail"]
    
    @patch('src.app.api.v1.endpoints.get_current_user', side_effect=mock_get_current_user_unauthenticated)
    def test_delete_prompt_unauthorized(self, mock_user, client):
        """Test deleting prompt without auth"""
        response = client.delete("/api/v1/prompts/1")
        
        assert response.status_code == 401
        assert "Not authenticated" in response.json()["detail"]


class TestGetPromptVariables:
    """Tests for GET /api/v1/prompts/{prompt_id}/variables"""
    
    @patch('src.app.api.v1.endpoints.get_current_user', side_effect=mock_get_current_user_authenticated)
    @patch('src.app.api.v1.endpoints.get_user_permissions', side_effect=mock_get_user_permissions)
    @patch('src.app.services.prompt_service.get_prompt_variables', side_effect=MockPromptService.get_prompt_variables)
    def test_get_variables_success(self, mock_vars, mock_perms, mock_user, client):
        """Test getting prompt variables"""
        response = client.get("/api/v1/prompts/1/variables")
        
        assert response.status_code == 200
        data = response.json()
        assert "variables" in data
        assert len(data["variables"]) == 2
        assert data["variables"][0]["variable_name"] == "VAR1"
        assert data["variables"][1]["variable_name"] == "VAR2"
    
    @patch('src.app.api.v1.endpoints.get_current_user', side_effect=mock_get_current_user_authenticated)
    @patch('src.app.api.v1.endpoints.get_user_permissions', side_effect=mock_get_user_permissions)
    @patch('src.app.services.prompt_service.get_prompt_variables', side_effect=MockPromptService.get_prompt_variables)
    def test_get_variables_empty(self, mock_vars, mock_perms, mock_user, client):
        """Test getting variables when none exist"""
        response = client.get("/api/v1/prompts/999/variables")
        
        assert response.status_code == 200
        data = response.json()
        assert "variables" in data
        assert len(data["variables"]) == 0
    
    @patch('src.app.api.v1.endpoints.get_current_user', side_effect=mock_get_current_user_authenticated)
    @patch('src.app.api.v1.endpoints.get_user_permissions', side_effect=mock_get_user_permissions)
    @patch('src.app.services.prompt_service.get_prompt_variables')
    def test_get_variables_prompt_not_found(self, mock_vars, mock_perms, mock_user, client):
        """Test getting variables for non-existent prompt"""
        # Mock raises exception for non-existent prompt
        mock_vars.side_effect = Exception("Prompt not found")
        
        response = client.get("/api/v1/prompts/999/variables")
        
        assert response.status_code == 500
        assert "Prompt not found" in response.json()["detail"]


class TestCreatePromptVariable:
    """Tests for POST /api/v1/prompts/{prompt_id}/variables"""
    
    @patch('src.app.api.v1.endpoints.get_current_user', side_effect=mock_get_current_user_authenticated)
    @patch('src.app.api.v1.endpoints.get_user_permissions', side_effect=mock_get_user_permissions)
    @patch('src.app.services.prompt_service.add_variable', side_effect=MockPromptService.add_variable)
    def test_create_variable_success(self, mock_add, mock_perms, mock_user, client):
        """Test creating prompt variable"""
        payload = {
            "variable_name": "VAR3",
            "variable_value": "value3",
            "description": "Test variable 3"
        }
        
        response = client.post("/api/v1/prompts/1/variables", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "Variable added successfully" in data["message"]
        assert "variable" in data
        assert data["variable"]["variable_name"] == "VAR3"
        assert data["variable"]["variable_value"] == "value3"
    
    @patch('src.app.api.v1.endpoints.get_current_user', side_effect=mock_get_current_user_authenticated)
    @patch('src.app.api.v1.endpoints.get_user_permissions', side_effect=mock_get_user_permissions)
    def test_create_variable_invalid_data(self, mock_perms, mock_user, client):
        """Test creating variable with invalid data"""
        payload = {
            "variable_name": "VAR3",
            # Missing required variable_value
        }
        
        response = client.post("/api/v1/prompts/1/variables", json=payload)
        
        assert response.status_code == 422  # Validation error
    
    @patch('src.app.api.v1.endpoints.get_current_user', side_effect=mock_get_current_user_authenticated)
    @patch('src.app.api.v1.endpoints.get_user_permissions', side_effect=mock_get_user_permissions)
    @patch('src.app.services.prompt_service.add_variable')
    def test_create_variable_duplicate(self, mock_add, mock_perms, mock_user, client):
        """Test creating duplicate variable"""
        # Mock duplicate key constraint violation
        mock_add.side_effect = Exception("Duplicate key value violates unique constraint")
        
        payload = {
            "variable_name": "VAR1",  # Already exists
            "variable_value": "duplicate",
            "description": "Duplicate variable"
        }
        
        response = client.post("/api/v1/prompts/1/variables", json=payload)
        
        assert response.status_code == 500
        assert "Duplicate key" in response.json()["detail"]
    
    @patch('src.app.api.v1.endpoints.get_current_user', side_effect=mock_get_current_user_authenticated)
    @patch('src.app.api.v1.endpoints.get_user_permissions', side_effect=mock_get_user_permissions)
    @patch('src.app.services.prompt_service.add_variable')
    def test_create_variable_prompt_not_found(self, mock_add, mock_perms, mock_user, client):
        """Test creating variable for non-existent prompt"""
        # Mock foreign key constraint violation
        mock_add.side_effect = Exception("violates foreign key constraint")
        
        payload = {
            "variable_name": "VAR_NEW",
            "variable_value": "value_new",
            "description": "Variable for non-existent prompt"
        }
        
        response = client.post("/api/v1/prompts/999/variables", json=payload)
        
        assert response.status_code == 500
        assert "foreign key constraint" in response.json()["detail"]


class TestDeletePromptVariable:
    """Tests for DELETE /api/v1/prompts/{prompt_id}/variables/{variable_id}"""
    
    @patch('src.app.api.v1.endpoints.get_current_user', side_effect=mock_get_current_user_authenticated)
    @patch('src.app.api.v1.endpoints.get_user_permissions', side_effect=mock_get_user_permissions)
    @patch('src.app.services.prompt_service.delete_variable', side_effect=MockPromptService.delete_variable)
    def test_delete_variable_success(self, mock_del, mock_perms, mock_user, client):
        """Test deleting prompt variable"""
        response = client.delete("/api/v1/prompts/1/variables/1")
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "Variable deleted successfully" in data["message"]
    
    @patch('src.app.api.v1.endpoints.get_current_user', side_effect=mock_get_current_user_authenticated)
    @patch('src.app.api.v1.endpoints.get_user_permissions', side_effect=mock_get_user_permissions)
    @patch('src.app.services.prompt_service.delete_variable', side_effect=MockPromptService.delete_variable)
    def test_delete_variable_not_found(self, mock_del, mock_perms, mock_user, client):
        """Test deleting non-existent variable"""
        # Mock returns False for non-existent variable
        response = client.delete("/api/v1/prompts/1/variables/999")
        
        assert response.status_code == 200
        # Note: Current implementation doesn't check if variable exists
        # It just returns success message
    
    @patch('src.app.api.v1.endpoints.get_current_user', side_effect=mock_get_current_user_authenticated)
    @patch('src.app.api.v1.endpoints.get_user_permissions', side_effect=mock_get_user_permissions)
    @patch('src.app.services.prompt_service.delete_variable')
    def test_delete_variable_prompt_not_found(self, mock_del, mock_perms, mock_user, client):
        """Test deleting variable from non-existent prompt"""
        # Mock database error
        mock_del.side_effect = Exception("Variable not found")
        
        response = client.delete("/api/v1/prompts/999/variables/1")
        
        assert response.status_code == 500
        assert "Variable not found" in response.json()["detail"]
