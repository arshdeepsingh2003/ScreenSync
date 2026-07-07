import sys
import os
from fastapi.testclient import TestClient

# Add project root to sys.path to allow absolute imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.main import app
from backend.db.database import SessionLocal
from backend.models import Admin, App, Content, Screen, Session, Settings
from backend.config import settings

client = TestClient(app)

def test_flow():
    print("Starting Phase 2 Integration Tests...")
    db = SessionLocal()
    
    # 1. Clean up any existing test records if any left from previous runs/crashes
    db.query(Content).filter(Content.title.like("Test Slide%")).delete(synchronize_session=False)
    db.query(App).filter(App.name.like("Test App%")).delete(synchronize_session=False)
    db.query(Screen).filter(Screen.screen_name.like("Test Screen%")).delete(synchronize_session=False)
    db.commit()
    
    try:
        # 2. Test login failure
        print("Testing POST /api/auth/login with incorrect credentials...")
        response = client.post("/api/auth/login", json={"username": "admin", "password": "wrongpassword"})
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        assert response.json()["code"] == "INVALID_CREDENTIALS"
        print("Bad login rejected successfully.")

        # 3. Test login success
        print("Testing POST /api/auth/login with correct credentials...")
        response = client.post("/api/auth/login", json={"username": settings.ADMIN_USERNAME, "password": settings.ADMIN_PASSWORD})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        token_data = response.json()
        assert "access_token" in token_data
        token = token_data["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("Login successful, JWT token received.")

        # 4. Test App CRUD (unauthorized vs authorized)
        print("Testing POST /api/apps unauthorized...")
        response = client.post("/api/apps", json={"name": "Test App 1"})
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"

        print("Testing POST /api/apps authorized...")
        response = client.post("/api/apps", json={"name": "Test App 1", "icon_url": "http://example.com/icon.png"}, headers=headers)
        assert response.status_code == 201, f"Expected 201, got {response.status_code}"
        app_data = response.json()
        app_id = app_data["id"]
        assert app_data["name"] == "Test App 1"
        assert app_data["is_active"] is False
        print(f"Created App with ID: {app_id}")

        print("Testing GET /api/apps...")
        response = client.get("/api/apps")
        assert response.status_code == 200
        apps_list = response.json()
        assert len(apps_list) >= 1
        assert any(a["id"] == app_id for a in apps_list)

        print("Testing PUT /api/apps/{id}...")
        response = client.put(f"/api/apps/{app_id}", json={"name": "Test App 1 Updated", "icon_url": "http://example.com/icon2.png"}, headers=headers)
        assert response.status_code == 200
        assert response.json()["name"] == "Test App 1 Updated"

        # 5. Test Content CRUD
        print("Testing GET /api/apps/{id}/contents (should be empty)...")
        response = client.get(f"/api/apps/{app_id}/contents")
        assert response.status_code == 200
        assert len(response.json()) == 0

        print("Testing POST /api/apps/{id}/contents (slide 1)...")
        response = client.post(f"/api/apps/{app_id}/contents", json={
            "title": "Test Slide 1",
            "type": "text",
            "text_content": "Hello World",
            "duration": 5
        }, headers=headers)
        assert response.status_code == 201
        slide1 = response.json()
        assert slide1["display_order"] == 0
        slide1_id = slide1["id"]

        print("Testing POST /api/apps/{id}/contents (slide 2 with auto display order)...")
        response = client.post(f"/api/apps/{app_id}/contents", json={
            "title": "Test Slide 2",
            "type": "image",
            "file_url": "http://example.com/image.jpg",
            "duration": 10
        }, headers=headers)
        assert response.status_code == 201
        slide2 = response.json()
        assert slide2["display_order"] == 1
        slide2_id = slide2["id"]

        print("Testing GET /api/apps/{id}/contents (should contain 2 slides)...")
        response = client.get(f"/api/apps/{app_id}/contents")
        assert response.status_code == 200
        slides = response.json()
        assert len(slides) == 2
        assert slides[0]["id"] == slide1_id
        assert slides[1]["id"] == slide2_id

        # Reorder slides
        print("Testing PATCH /api/apps/{id}/contents/reorder...")
        response = client.patch(f"/api/apps/{app_id}/contents/reorder", json={"ordered_ids": [slide2_id, slide1_id]}, headers=headers)
        assert response.status_code == 200
        slides = response.json()
        assert len(slides) == 2
        assert slides[0]["id"] == slide2_id
        assert slides[0]["display_order"] == 0
        assert slides[1]["id"] == slide1_id
        assert slides[1]["display_order"] == 1

        # 6. Test activate App
        print("Testing POST /api/apps/{id}/activate...")
        response = client.post(f"/api/apps/{app_id}/activate")
        assert response.status_code == 200
        session_data = response.json()
        assert session_data["active_app_id"] == app_id
        assert session_data["current_batch"] == 0
        
        # Verify database session state matches
        sess_row = db.query(Session).filter(Session.id == 1).first()
        assert sess_row.active_app_id == app_id
        assert sess_row.current_batch == 0
        print("App activation and session reset verified in DB.")

        # 7. Test Screens CRUD
        print("Testing POST /api/screens...")
        response = client.post("/api/screens", json={"screen_number": 99, "screen_name": "Test Screen 1"}, headers=headers)
        assert response.status_code == 201
        screen_data = response.json()
        screen_id = screen_data["id"]
        assert screen_data["screen_number"] == 99
        assert screen_data["screen_name"] == "Test Screen 1"
        assert screen_data["is_active"] is True

        print("Testing POST /api/screens duplicate screen number...")
        response = client.post("/api/screens", json={"screen_number": 99, "screen_name": "Test Screen Duplicate"}, headers=headers)
        assert response.status_code == 409, f"Expected 409, got {response.status_code}"
        assert response.json()["code"] == "SCREEN_NUMBER_TAKEN"

        print("Testing GET /api/screens...")
        response = client.get("/api/screens")
        assert response.status_code == 200
        screens = response.json()
        assert len(screens) >= 1
        assert any(s["id"] == screen_id for s in screens)

        # 8. Test Settings GET and PUT
        print("Testing GET /api/settings...")
        response = client.get("/api/settings")
        assert response.status_code == 200
        
        print("Testing PUT /api/settings...")
        response = client.put("/api/settings", json={
            "default_screen_type": "text",
            "default_screen_text": "Updated Default Text",
            "default_screen_url": None
        }, headers=headers)
        assert response.status_code == 200
        updated_settings = response.json()
        assert updated_settings["default_screen_text"] == "Updated Default Text"

        # 9. Clean up database
        print("Cleaning up test data from DB...")
        db.query(Screen).filter(Screen.id == screen_id).delete(synchronize_session=False)
        db.query(App).filter(App.id == app_id).delete(synchronize_session=False)
        db.commit()
        print("DB cleanup complete.")

        print("\nAll Phase 2 Integration Tests Passed Successfully! [PASSED]")

    except Exception as e:
        db.rollback()
        print(f"\nTest FAILED with exception: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    test_flow()
