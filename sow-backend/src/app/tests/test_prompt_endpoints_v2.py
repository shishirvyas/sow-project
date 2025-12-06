"""
Test cases for Prompt Template endpoints
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
from src.app.tests.mocks import MockPromptService


class TestGetPrompts:
    """Tests for GET /api/v1/prompts"""
    
    @patch('src.app.services.prompt_service.get_all_prompts', side_effect=MockPromptService.get_all_prompts)
    def test_get_prompts_success(self, mock_prompts, authenticated_client):
        """Test getting all prompts"""
        response = authenticated_client.get("/api/v1/prompts")
        
        assert response.status_code == 200
        data = response.json()
        assert "prompts" in data
        assert "count" in data
        assert data["count"] == 2
        assert len(data["prompts"]) == 2
        assert data["prompts"][0]["clause_id"] == "TEST-001"
        assert data["prompts"][0]["name"] == "Test Prompt 1"
        assert data["prompts"][0]["variable_count"] == 2
    
    def test_get_prompts_unauthorized(self, client):
        """Test getting prompts without auth"""
        response = client.get("/api/v1/prompts")
        
        # API returns 403 when not authenticated (not 401)
        assert response.status_code == 403
        assert "Not authenticated" in response.json()["detail"]


class TestGetPromptById:
    """Tests for GET /api/v1/prompts/{prompt_id}"""
    
    @patch('src.app.services.prompt_service.get_prompt_by_id', side_effect=MockPromptService.get_prompt_by_id)
    def test_get_prompt_success(self, mock_prompt, authenticated_client):
        """Test getting specific prompt by ID"""
        response = authenticated_client.get("/api/v1/prompts/1")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == 1
        assert data["clause_id"] == "TEST-001"
        assert data["name"] == "Test Prompt 1"
        assert "variables" in data
        assert len(data["variables"]) == 2
    
    @patch('src.app.services.prompt_service.get_prompt_by_id', side_effect=MockPromptService.get_prompt_by_id)
    def test_get_prompt_not_found(self, mock_prompt, authenticated_client):
        """Test getting non-existent prompt"""
        response = authenticated_client.get("/api/v1/prompts/999")
        
        assert response.status_code == 404
        assert "Prompt not found" in response.json()["detail"]


class TestCreatePrompt:
    """Tests for POST /api/v1/prompts"""
    
    @patch('src.app.services.prompt_service.create_prompt', side_effect=MockPromptService.create_prompt)
    def test_create_prompt_success(self, mock_create, authenticated_client):
        """Test creating new prompt"""
        payload = {
            "clause_id": "TEST-003",
            "name": "New Test Prompt",
            "prompt_text": "This is a new test prompt",
            "is_active": True
        }
        
        response = authenticated_client.post("/api/v1/prompts", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "Prompt created successfully" in data["message"]
        assert "prompt" in data
        assert data["prompt"]["clause_id"] == "TEST-003"
        assert data["prompt"]["name"] == "New Test Prompt"
    
    def test_create_prompt_invalid_data(self, authenticated_client):
        """Test creating prompt with invalid data"""
        payload = {
            "clause_id": "TEST-003",
            # Missing required fields: name, prompt_text
        }
        
        response = authenticated_client.post("/api/v1/prompts", json=payload)
        
        assert response.status_code == 422  # Validation error


class TestUpdatePrompt:
    """Tests for PUT /api/v1/prompts/{prompt_id}"""
    
    @patch('src.app.services.prompt_service.update_prompt', side_effect=MockPromptService.update_prompt)
    def test_update_prompt_success(self, mock_update, authenticated_client):
        """Test updating prompt"""
        payload = {
            "clause_id": "TEST-001-UPDATED",
            "name": "Updated Test Prompt",
            "prompt_text": "This is an updated test prompt",
            "is_active": False
        }
        
        response = authenticated_client.put("/api/v1/prompts/1", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "Prompt updated successfully" in data["message"]
        assert "prompt" in data
        assert data["prompt"]["clause_id"] == "TEST-001-UPDATED"
        assert data["prompt"]["name"] == "Updated Test Prompt"
    
    @patch('src.app.services.prompt_service.update_prompt', side_effect=MockPromptService.update_prompt)
    def test_update_prompt_not_found(self, mock_update, authenticated_client):
        """Test updating non-existent prompt"""
        payload = {
            "clause_id": "TEST-999",
            "name": "Non-existent Prompt",
            "prompt_text": "This prompt doesn't exist",
            "is_active": True
        }
        
        response = authenticated_client.put("/api/v1/prompts/999", json=payload)
        
        assert response.status_code == 404
        assert "Prompt not found" in response.json()["detail"]


class TestDeletePrompt:
    """Tests for DELETE /api/v1/prompts/{prompt_id}"""
    
    @patch('src.app.services.prompt_service.delete_prompt', side_effect=MockPromptService.delete_prompt)
    def test_delete_prompt_success(self, mock_delete, authenticated_client):
        """Test deleting prompt"""
        response = authenticated_client.delete("/api/v1/prompts/1")
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "Prompt deleted successfully" in data["message"]
    
    @patch('src.app.services.prompt_service.delete_prompt', side_effect=MockPromptService.delete_prompt)
    def test_delete_prompt_not_found(self, mock_delete, authenticated_client):
        """Test deleting non-existent prompt"""
        response = authenticated_client.delete("/api/v1/prompts/999")
        
        assert response.status_code == 404
        assert "Prompt not found" in response.json()["detail"]


class TestPromptVariables:
    """Tests for prompt variable endpoints"""
    
    @patch('src.app.services.prompt_service.get_prompt_variables', side_effect=MockPromptService.get_prompt_variables)
    def test_get_variables_success(self, mock_vars, authenticated_client):
        """Test getting prompt variables"""
        response = authenticated_client.get("/api/v1/prompts/1/variables")
        
        assert response.status_code == 200
        data = response.json()
        assert "variables" in data
        assert len(data["variables"]) == 2
        assert data["variables"][0]["variable_name"] == "VAR1"
        assert data["variables"][1]["variable_name"] == "VAR2"
    
    @patch('src.app.services.prompt_service.add_variable', side_effect=MockPromptService.add_variable)
    def test_create_variable_success(self, mock_add, authenticated_client):
        """Test creating prompt variable"""
        payload = {
            "variable_name": "VAR3",
            "variable_value": "value3",
            "description": "Test variable 3"
        }
        
        response = authenticated_client.post("/api/v1/prompts/1/variables", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "Variable added successfully" in data["message"]
        assert "variable" in data
        assert data["variable"]["variable_name"] == "VAR3"
        assert data["variable"]["variable_value"] == "value3"
    
    @patch('src.app.services.prompt_service.delete_variable', side_effect=MockPromptService.delete_variable)
    def test_delete_variable_success(self, mock_del, authenticated_client):
        """Test deleting prompt variable"""
        response = authenticated_client.delete("/api/v1/prompts/1/variables/1")
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "Variable deleted successfully" in data["message"]
