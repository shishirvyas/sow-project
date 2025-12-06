"""
Test configuration and fixtures for SOW Backend
"""
import sys
from pathlib import Path

# Add project root to path
ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT))

import pytest
from fastapi.testclient import TestClient
from src.app.main import app


@pytest.fixture
def client():
    """Test client for API requests"""
    return TestClient(app)


@pytest.fixture
def authenticated_client():
    """Test client with authentication override"""
    from src.app.api.v1.auth import get_current_user
    from src.app.services.auth_service import get_user_permissions
    
    def mock_current_user():
        return 1  # Mock user ID
    
    def mock_permissions(user_id: int):
        return [
            'prompt.view',
            'prompt.create',
            'prompt.edit',
            'prompt.delete',
            'document.upload',
            'analysis.create',
            'file.view_all'
        ]
    
    app.dependency_overrides[get_current_user] = mock_current_user
    app.dependency_overrides[get_user_permissions] = mock_permissions
    
    client = TestClient(app)
    yield client
    
    # Clean up
    app.dependency_overrides.clear()


@pytest.fixture
def auth_headers():
    """Mock authentication headers"""
    return {
        "Authorization": "Bearer mock_token_for_testing"
    }


@pytest.fixture
def admin_headers():
    """Mock admin authentication headers"""
    return {
        "Authorization": "Bearer mock_admin_token_for_testing"
    }


@pytest.fixture
def mock_user():
    """Mock user data"""
    return {
        "id": 1,
        "email": "test@example.com",
        "full_name": "Test User",
        "is_active": True,
        "is_verified": True
    }


@pytest.fixture
def mock_admin():
    """Mock admin user data"""
    return {
        "id": 2,
        "email": "admin@example.com",
        "full_name": "Admin User",
        "is_active": True,
        "is_verified": True,
        "is_admin": True
    }


@pytest.fixture
def mock_document():
    """Mock document data"""
    return {
        "blob_name": "test_document.pdf",
        "original_filename": "test_document.pdf",
        "file_size_bytes": 1024,
        "uploaded_by": 1
    }


@pytest.fixture
def mock_prompt():
    """Mock prompt template data"""
    return {
        "id": 1,
        "name": "Test Prompt",
        "description": "Test prompt description",
        "template_content": "Test template content",
        "is_active": True
    }
