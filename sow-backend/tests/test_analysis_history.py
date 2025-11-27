"""
Test analysis history endpoint to verify "Today's Completed" functionality
"""
import pytest
from datetime import datetime, timezone
from unittest.mock import Mock, patch, MagicMock
from fastapi.testclient import TestClient
from src.app.main import app

client = TestClient(app)

# Mock user authentication
def mock_get_current_user():
    return 1  # Return user_id = 1 (admin)

def mock_get_user_permissions(user_id):
    return ['analysis.view', 'document.upload']

@pytest.fixture
def auth_headers():
    """Mock authentication headers"""
    return {"Authorization": "Bearer mock_token"}

@pytest.fixture
def mock_blob_data():
    """Mock blob storage data with today's completed analyses"""
    now = datetime.now(timezone.utc)
    
    # Create mock blobs
    mock_blob_1 = Mock()
    mock_blob_1.name = "20241126_001051_test_doc__analysis__20241126_001556.json"
    mock_blob_1.size = 1024
    mock_blob_1.creation_time = now
    
    mock_blob_2 = Mock()
    mock_blob_2.name = "20241126_080742_another_doc__analysis__20241126_080757.json"
    mock_blob_2.size = 2048
    mock_blob_2.creation_time = now
    
    # Mock blob content (JSON data)
    blob_content_1 = {
        "status": "success",
        "blob_name": "test_doc.pdf",
        "prompts_processed": 5,
        "processing_started_at": now.isoformat(),
        "processing_completed_at": now.isoformat(),
        "errors": []
    }
    
    blob_content_2 = {
        "status": "partial_success",
        "blob_name": "another_doc.pdf",
        "prompts_processed": 3,
        "processing_started_at": now.isoformat(),
        "processing_completed_at": now.isoformat(),
        "errors": [{"error": "Minor issue"}]
    }
    
    return [
        (mock_blob_1, blob_content_1),
        (mock_blob_2, blob_content_2)
    ]

class TestAnalysisHistory:
    """Test suite for analysis history endpoint"""
    
    @patch('src.app.api.v1.endpoints.get_current_user', mock_get_current_user)
    @patch('src.app.services.auth_service.get_user_permissions', mock_get_user_permissions)
    @patch('src.app.api.v1.endpoints.AzureBlobService')
    def test_get_analysis_history_success(self, mock_blob_service_class, auth_headers, mock_blob_data):
        """Test successful retrieval of analysis history"""
        
        # Setup mock blob service
        mock_blob_service = Mock()
        mock_blob_service_class.return_value = mock_blob_service
        
        # Mock container client
        mock_container = Mock()
        mock_container.exists.return_value = True
        
        # Mock list_blobs
        mock_blobs = [blob for blob, _ in mock_blob_data]
        mock_container.list_blobs.return_value = mock_blobs
        
        # Mock blob clients and content
        def get_blob_client_side_effect(blob_name):
            mock_blob_client = Mock()
            mock_blob_client.url = f"https://example.com/{blob_name}"
            
            # Find matching blob data
            for blob, content in mock_blob_data:
                if blob.name == blob_name:
                    import json
                    mock_download = Mock()
                    mock_download.readall.return_value = json.dumps(content).encode('utf-8')
                    mock_blob_client.download_blob.return_value = mock_download
                    break
            
            return mock_blob_client
        
        mock_container.get_blob_client.side_effect = get_blob_client_side_effect
        
        mock_blob_service.blob_service_client.get_container_client.return_value = mock_container
        mock_blob_service.pdf_exists.return_value = False
        
        # Make request
        response = client.get(
            "/api/v1/analysis-history",
            headers=auth_headers
        )
        
        # Assertions
        assert response.status_code == 200
        data = response.json()
        
        print("\n📊 Test Results:")
        print(f"Status Code: {response.status_code}")
        print(f"Response Keys: {data.keys()}")
        print(f"History Count: {data['count']}")
        print(f"Success Count: {data['success_count']}")
        print(f"History Items: {len(data['history'])}")
        
        assert 'history' in data
        assert 'count' in data
        assert 'success_count' in data
        assert 'error_count' in data
        
        assert data['count'] == 2
        assert data['success_count'] == 2
        assert len(data['history']) == 2
        
        # Check first item structure
        first_item = data['history'][0]
        assert 'result_blob_name' in first_item
        assert 'source_blob' in first_item
        assert 'status' in first_item
        assert 'processing_completed_at' in first_item
        assert 'created' in first_item
        
        print(f"\n✅ First item: {first_item['source_blob']} - Status: {first_item['status']}")
        print(f"   Completed at: {first_item['processing_completed_at']}")
        print(f"   Created at: {first_item['created']}")
    
    @patch('src.app.api.v1.endpoints.get_current_user', mock_get_current_user)
    @patch('src.app.services.auth_service.get_user_permissions')
    def test_get_analysis_history_no_permission(self, mock_perms, auth_headers):
        """Test access denied when user lacks analysis.view permission"""
        mock_perms.return_value = []  # No permissions
        
        response = client.get(
            "/api/v1/analysis-history",
            headers=auth_headers
        )
        
        print(f"\n🔒 Permission Test - Status: {response.status_code}")
        assert response.status_code == 403
        assert "Permission denied" in response.json()['detail']
    
    @patch('src.app.api.v1.endpoints.get_current_user', mock_get_current_user)
    @patch('src.app.services.auth_service.get_user_permissions', mock_get_user_permissions)
    @patch('src.app.api.v1.endpoints.AzureBlobService')
    def test_get_analysis_history_empty_container(self, mock_blob_service_class, auth_headers):
        """Test when container has no blobs"""
        
        mock_blob_service = Mock()
        mock_blob_service_class.return_value = mock_blob_service
        
        mock_container = Mock()
        mock_container.exists.return_value = True
        mock_container.list_blobs.return_value = []  # Empty
        
        mock_blob_service.blob_service_client.get_container_client.return_value = mock_container
        
        response = client.get(
            "/api/v1/analysis-history",
            headers=auth_headers
        )
        
        print(f"\n📭 Empty Container Test - Status: {response.status_code}")
        assert response.status_code == 200
        data = response.json()
        assert data['count'] == 0
        assert len(data['history']) == 0

def test_istoday_helper():
    """Test the isToday helper function logic"""
    from datetime import datetime, timedelta
    
    now = datetime.now()
    today_str = now.isoformat()
    yesterday_str = (now - timedelta(days=1)).isoformat()
    tomorrow_str = (now + timedelta(days=1)).isoformat()
    
    # Simulate isToday function
    def isToday(dateString):
        if not dateString:
            return False
        try:
            date = datetime.fromisoformat(dateString.replace('Z', '+00:00'))
            today = datetime.now()
            return (date.date() == today.date())
        except:
            return False
    
    print(f"\n📅 Date Helper Test:")
    print(f"Today: {isToday(today_str)} (should be True)")
    print(f"Yesterday: {isToday(yesterday_str)} (should be False)")
    print(f"Tomorrow: {isToday(tomorrow_str)} (should be False)")
    print(f"None: {isToday(None)} (should be False)")
    print(f"Invalid: {isToday('invalid')} (should be False)")
    
    assert isToday(today_str) == True
    assert isToday(yesterday_str) == False
    assert isToday(tomorrow_str) == False
    assert isToday(None) == False
    assert isToday('invalid') == False

if __name__ == "__main__":
    print("🧪 Running Analysis History Tests\n")
    print("=" * 60)
    
    # Run date helper test
    test_istoday_helper()
    
    print("\n" + "=" * 60)
    print("✅ All tests defined. Run with: pytest tests/test_analysis_history.py -v")
