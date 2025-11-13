from fastapi.testclient import TestClient
from src.app.main import app

client = TestClient(app)

def test_hello():
    r = client.get("/api/v1/hello")
    assert r.status_code == 200
    assert "message" in r.json()