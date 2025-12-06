# SOW Backend Test Suite

## Overview
Comprehensive test coverage for all API endpoints in the SOW Backend application.

## Test Structure

```
src/app/tests/
├── conftest.py                     # Shared fixtures and configuration
├── test_auth_endpoints.py          # Authentication tests (8 endpoints)
├── test_document_endpoints.py      # Document management tests (12 endpoints)
├── test_prompt_endpoints.py        # Prompt template tests (9 endpoints)
├── test_admin_endpoints.py         # Admin panel tests (17 endpoints)
├── test_notification_endpoints.py  # Notification tests (4 endpoints)
├── test_misc_endpoints.py          # Miscellaneous tests (6 endpoints)
├── test_profile_endpoints.py       # Profile tests (1 endpoint)
└── test_health.py                  # Health check test (existing)
```

## Total Coverage
- **57 Endpoints** across 7 test modules
- **200+ Test Cases** (stub functions created)

## Endpoints by Module

### Authentication (`test_auth_endpoints.py`)
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Token refresh
- `POST /api/v1/auth/logout` - User logout
- `GET /api/v1/auth/me` - Get current user
- `GET /api/v1/auth/permissions` - Get user permissions
- `GET /api/v1/auth/menu` - Get user menu
- `PUT /api/v1/auth/profile` - Update profile
- `PUT /api/v1/auth/change-password` - Change password

### Documents (`test_document_endpoints.py`)
- `POST /api/v1/upload-sow` - Upload document
- `POST /api/v1/process-sow-async/{blob_name}` - Async analysis
- `POST /api/v1/process-sow/{blob_name}` - Sync analysis
- `GET /api/v1/analysis-history` - Get analysis history
- `POST /api/v1/analysis-history/{result_blob_name}/generate-pdf` - Generate PDF
- `GET /api/v1/analysis-history/{result_blob_name}/pdf-url` - Get PDF URL
- `GET /api/v1/analysis-history/{result_blob_name}/download-pdf` - Download PDF
- `GET /api/v1/analysis-history/{result_blob_name}` - Get analysis details
- `GET /api/v1/my-documents` - Get user documents
- `GET /api/v1/documents/{blob_name}/info` - Get document info
- `GET /api/v1/documents/stats` - Get document stats

### Prompts (`test_prompt_endpoints.py`)
- `GET /api/v1/prompts` - List prompts
- `GET /api/v1/prompts/{prompt_id}` - Get prompt
- `POST /api/v1/prompts` - Create prompt
- `PUT /api/v1/prompts/{prompt_id}` - Update prompt
- `DELETE /api/v1/prompts/{prompt_id}` - Delete prompt
- `GET /api/v1/prompts/{prompt_id}/variables` - Get variables
- `POST /api/v1/prompts/{prompt_id}/variables` - Create variable
- `DELETE /api/v1/prompts/{prompt_id}/variables/{variable_id}` - Delete variable

### Admin (`test_admin_endpoints.py`)
- `GET /api/v1/admin/debug/my-permissions` - Debug permissions
- `GET /api/v1/admin/users` - List users
- `GET /api/v1/admin/users/{target_user_id}` - Get user
- `POST /api/v1/admin/users` - Create user
- `PUT /api/v1/admin/users/{target_user_id}` - Update user
- `DELETE /api/v1/admin/users/{target_user_id}` - Delete user
- `POST /api/v1/admin/users/{target_user_id}/roles` - Assign role
- `GET /api/v1/admin/roles` - List roles
- `GET /api/v1/admin/roles/{role_id}` - Get role
- `POST /api/v1/admin/roles` - Create role
- `PUT /api/v1/admin/roles/{role_id}` - Update role
- `DELETE /api/v1/admin/roles/{role_id}` - Delete role
- `POST /api/v1/admin/roles/{role_id}/permissions` - Assign permissions
- `GET /api/v1/admin/permissions` - List permissions
- `GET /api/v1/admin/audit-logs` - Get audit logs

### Notifications (`test_notification_endpoints.py`)
- `GET /api/v1/notifications` - Get notifications
- `POST /api/v1/notifications` - Create notification
- `PUT /api/v1/notifications/{nid}/read` - Mark as read
- `PUT /api/v1/notifications/mark_all_read` - Mark all read

### Miscellaneous (`test_misc_endpoints.py`)
- `GET /api/v1/hello` - Hello endpoint
- `GET /api/v1/config` - Get config
- `GET /api/v1/sows` - List SOWs
- `GET /api/v1/sows/{blob_name}` - Get SOW
- `DELETE /api/v1/sows/{blob_name}` - Delete SOW
- `POST /api/v1/process-sows` - Process multiple SOWs

### Profile (`test_profile_endpoints.py`)
- `GET /api/v1/profile` - Get profile

## Running Tests

### Run all tests
```bash
cd sow-backend
pytest src/app/tests/ -v
```

### Run specific test file
```bash
pytest src/app/tests/test_auth_endpoints.py -v
```

### Run specific test class
```bash
pytest src/app/tests/test_auth_endpoints.py::TestAuthLogin -v
```

### Run specific test case
```bash
pytest src/app/tests/test_auth_endpoints.py::TestAuthLogin::test_login_success -v
```

### Run with coverage
```bash
pytest src/app/tests/ --cov=src/app --cov-report=html
```

## Test Implementation Priority

### Phase 1 - Critical (Do First)
1. `test_auth_endpoints.py` - Authentication is core functionality
2. `test_document_endpoints.py` - Main feature of the app
3. `test_health.py` - Already implemented

### Phase 2 - Important
4. `test_prompt_endpoints.py` - Key feature for customization
5. `test_admin_endpoints.py` - Required for user management

### Phase 3 - Additional
6. `test_notification_endpoints.py` - Supporting feature
7. `test_misc_endpoints.py` - Utility endpoints
8. `test_profile_endpoints.py` - Simple endpoint

## Test Implementation Guidelines

### Each test should:
1. **Arrange** - Set up test data and mocks
2. **Act** - Call the endpoint
3. **Assert** - Verify response status and data

### Example Test Implementation:
```python
def test_login_success(self, client):
    """Test successful login with valid credentials"""
    # Arrange
    payload = {
        "email": "test@example.com",
        "password": "testpassword123"
    }
    
    # Act
    response = client.post("/api/v1/auth/login", json=payload)
    
    # Assert
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
```

## Mocking Strategy

### Database Mocking
Use `pytest-mock` or `unittest.mock` to mock database calls:
```python
def test_with_mock_db(self, client, mocker):
    mock_conn = mocker.patch('src.app.db.client.get_db_connection_dict')
    # ... test implementation
```

### External Services Mocking
Mock Azure Blob Storage, OpenAI, etc.:
```python
def test_upload_with_mock_azure(self, client, mocker):
    mock_blob = mocker.patch('src.app.services.azure_blob_service.AzureBlobService')
    # ... test implementation
```

## Test Data
Use fixtures in `conftest.py` for consistent test data across all tests.

## CI/CD Integration
These tests should be run automatically on:
- Every pull request
- Before deployment
- Nightly builds for comprehensive testing

## Next Steps
1. Implement tests in priority order (Phase 1 → Phase 2 → Phase 3)
2. Add integration tests for end-to-end workflows
3. Add load/performance tests for critical endpoints
4. Set up CI/CD pipeline with automated test runs
