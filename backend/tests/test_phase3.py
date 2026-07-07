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

def test_phase3_logic():
    print("Starting Phase 3 Integration/Unit Tests...")
    db = SessionLocal()

    # 1. Cleanup existing Phase 3 test data to avoid pollution
    db.query(Content).filter(Content.title.like("Phase 3 Test Slide%")).delete(synchronize_session=False)
    db.query(App).filter(App.name.like("Phase 3 Test App%")).delete(synchronize_session=False)
    db.query(Screen).filter(Screen.screen_name.like("Phase 3 Test Screen%")).delete(synchronize_session=False)
    db.commit()

    # Find pre-existing active screens and temporarily deactivate them
    pre_existing_active_screens = db.query(Screen).filter(Screen.is_active == True).all()
    pre_existing_active_ids = [s.id for s in pre_existing_active_screens]
    for s in pre_existing_active_screens:
        s.is_active = False
    db.commit()

    try:
        # Get authentication headers
        response = client.post("/api/auth/login", json={"username": settings.ADMIN_USERNAME, "password": settings.ADMIN_PASSWORD})
        assert response.status_code == 200, f"Login failed: {response.json()}"
        token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Setup: 4 active screens (numbered 1, 2, 3, 4)
        screens = []
        for i in range(1, 5):
            response = client.post("/api/screens", json={
                "screen_number": 900 + i,
                "screen_name": f"Phase 3 Test Screen {i}"
            }, headers=headers)
            assert response.status_code == 201, f"Failed to create screen {i}: {response.json()}"
            screens.append(response.json())
        
        # Sort screens by screen_number to ensure correct positions
        screens = sorted(screens, key=lambda s: s["screen_number"])
        screen_ids = [s["id"] for s in screens]
        print(f"Created 4 test screens with IDs: {screen_ids}")

        # 3. Setup: 1 test app
        response = client.post("/api/apps", json={
            "name": "Phase 3 Test App",
            "icon_url": "http://example.com/phase3_icon.png"
        }, headers=headers)
        assert response.status_code == 201
        app_data = response.json()
        app_id = app_data["id"]
        print(f"Created test app with ID: {app_id}")

        # 4. Setup: 10 slides associated with the test app
        slides = []
        for i in range(1, 11):
            response = client.post(f"/api/apps/{app_id}/contents", json={
                "title": f"Phase 3 Test Slide {i}",
                "type": "text",
                "text_content": f"Slide {i} Content",
                "duration": 5
            }, headers=headers)
            assert response.status_code == 201
            slides.append(response.json())
        print(f"Created 10 test slides for app {app_id}")

        # 5. Activate the App (this should set active_app_id and reset batch to 0)
        response = client.post(f"/api/apps/{app_id}/activate")
        assert response.status_code == 200
        session_data = response.json()
        assert session_data["active_app_id"] == app_id
        assert session_data["current_batch"] == 0

        # --- TEST 1: WORKED EXAMPLE (4 screens, 10 slides) ---
        print("\n--- Test 1: Worked Example with 4 active screens ---")
        
        # Batch 0
        response = client.get("/api/session/state")
        assert response.status_code == 200
        state = response.json()
        assert state["active_app_id"] == app_id
        assert state["current_batch"] == 0
        
        assignment = state["assignment"]
        # Verify screens 1 to 4 receive slides 1 to 4
        for idx, screen in enumerate(screens):
            expected_slide_title = f"Phase 3 Test Slide {idx + 1}"
            screen_key = str(screen["id"])
            assert screen_key in assignment, f"Screen {screen_key} not in assignment"
            assert assignment[screen_key] is not None, f"Screen {screen_key} has null assignment"
            assert assignment[screen_key]["title"] == expected_slide_title
        print("Batch 0 mappings verified successfully.")

        # Batch 1 (Next)
        response = client.post("/api/session/next")
        assert response.status_code == 200
        state = response.json()
        assert state["current_batch"] == 1
        assignment = state["assignment"]
        # Verify screens 1 to 4 receive slides 5 to 8
        for idx, screen in enumerate(screens):
            expected_slide_title = f"Phase 3 Test Slide {idx + 5}"
            screen_key = str(screen["id"])
            assert screen_key in assignment
            assert assignment[screen_key] is not None
            assert assignment[screen_key]["title"] == expected_slide_title
        print("Batch 1 mappings verified successfully.")

        # Batch 2 (Next)
        response = client.post("/api/session/next")
        assert response.status_code == 200
        state = response.json()
        assert state["current_batch"] == 2
        assignment = state["assignment"]
        # Verify screens 1 and 2 receive slides 9 and 10
        # Verify screens 3 and 4 receive None (Default Screen)
        assert assignment[str(screens[0]["id"])]["title"] == "Phase 3 Test Slide 9"
        assert assignment[str(screens[1]["id"])]["title"] == "Phase 3 Test Slide 10"
        assert assignment[str(screens[2]["id"])] is None
        assert assignment[str(screens[3]["id"])] is None
        print("Batch 2 mappings verified successfully (including Default Screen fallbacks).")

        # --- TEST 2: LIMITS & CLAMPING ---
        print("\n--- Test 2: Pagination limits & Clamping ---")
        
        # Previous to batch 1
        response = client.post("/api/session/previous")
        assert response.json()["current_batch"] == 1
        
        # Previous to batch 0
        response = client.post("/api/session/previous")
        assert response.json()["current_batch"] == 0
        
        # Previous at batch 0 (should clamp to 0)
        response = client.post("/api/session/previous")
        assert response.json()["current_batch"] == 0
        print("Floor-at-zero pagination clamping verified successfully.")

        # --- TEST 3: DYNAMIC SCREEN COUNT RE-RANKING ---
        print("\n--- Test 3: Dynamic Screen Count Re-ranking ---")
        
        # Deactivate screen 2 (index 1 in the list)
        screen_to_deactivate = screens[1]
        print(f"Deactivating screen 2 (ID: {screen_to_deactivate['id']})")
        response = client.put(f"/api/screens/{screen_to_deactivate['id']}", json={
            "screen_number": screen_to_deactivate["screen_number"],
            "screen_name": screen_to_deactivate["screen_name"],
            "is_active": False
        }, headers=headers)
        assert response.status_code == 200
        assert response.json()["is_active"] is False

        # Get current session state (batch should still be 0)
        response = client.get("/api/session/state")
        assert response.status_code == 200
        state = response.json()
        assert state["current_batch"] == 0
        
        # Check active screens in response
        active_screens_in_state = state["screens"]
        active_screen_ids = [s["id"] for s in active_screens_in_state]
        assert len(active_screens_in_state) == 3
        assert screen_to_deactivate["id"] not in active_screen_ids
        print("Verified screen 2 is excluded from active screens list.")

        # Verify assignments for the remaining screens (1, 3, 4) re-rank to positions 0, 1, 2
        # Since active screens count is 3, batch size is 3. At batch 0, start_index = 0.
        # Position 0: Screen 1 -> Slide 1
        # Position 1: Screen 3 -> Slide 2
        # Position 2: Screen 4 -> Slide 3
        assignment = state["assignment"]
        assert assignment[str(screens[0]["id"])]["title"] == "Phase 3 Test Slide 1"
        assert assignment[str(screens[2]["id"])]["title"] == "Phase 3 Test Slide 2"
        assert assignment[str(screens[3]["id"])]["title"] == "Phase 3 Test Slide 3"
        assert str(screen_to_deactivate["id"]) not in assignment
        print("Re-ranked assignments at batch 0 verified successfully.")

        # Increment batch to 1. Start_index = 1 * 3 = 3.
        # Position 0: Screen 1 -> Slide 4
        # Position 1: Screen 3 -> Slide 5
        # Position 2: Screen 4 -> Slide 6
        response = client.post("/api/session/next")
        assert response.status_code == 200
        state = response.json()
        assert state["current_batch"] == 1
        assignment = state["assignment"]
        assert assignment[str(screens[0]["id"])]["title"] == "Phase 3 Test Slide 4"
        assert assignment[str(screens[2]["id"])]["title"] == "Phase 3 Test Slide 5"
        assert assignment[str(screens[3]["id"])]["title"] == "Phase 3 Test Slide 6"
        print("Re-ranked assignments at batch 1 verified successfully.")

        # Clean up database test records
        print("\nCleaning up Phase 3 test data from DB...")
        for s in screens:
            client.delete(f"/api/screens/{s['id']}", headers=headers)
        client.delete(f"/api/apps/{app_id}", headers=headers)
        db.commit()
        print("DB cleanup complete.")

        print("\nAll Phase 3 Integration/Unit Tests Passed Successfully! [PASSED]")

    except Exception as e:
        db.rollback()
        print(f"\nTest FAILED with exception: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        # Restore pre-existing active screens
        restore_db = SessionLocal()
        try:
            for sid in pre_existing_active_ids:
                restore_db.query(Screen).filter(Screen.id == sid).update({Screen.is_active: True})
            restore_db.commit()
            print("Restored pre-existing screens.")
        except Exception as restore_err:
            print(f"Failed to restore pre-existing screens: {restore_err}")
        finally:
            restore_db.close()
        db.close()

if __name__ == "__main__":
    test_phase3_logic()
