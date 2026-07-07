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

def test_phase9_hardening():
    print("Starting Phase 9 Integration Hardening & Edge Cases Tests...")
    db = SessionLocal()

    # 1. Cleanup existing Phase 9 test data to avoid pollution
    db.query(Content).filter(Content.title.like("Phase 9 Test Slide%")).delete(synchronize_session=False)
    db.query(App).filter(App.name.like("Phase 9 Test App%")).delete(synchronize_session=False)
    db.query(Screen).filter(Screen.screen_name.like("Phase 9 Test Screen%")).delete(synchronize_session=False)
    db.commit()

    # Find pre-existing active screens and temporarily deactivate them for test isolation
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

        # Setup: 4 active screens
        screens = []
        for i in range(1, 5):
            response = client.post("/api/screens", json={
                "screen_number": 800 + i,
                "screen_name": f"Phase 9 Test Screen {i}"
            }, headers=headers)
            assert response.status_code == 201
            screens.append(response.json())
        
        screens = sorted(screens, key=lambda s: s["screen_number"])
        print(f"Created 4 test screens: {[s['screen_name'] for s in screens]}")

        # Setup: 1 test app with 10 slides
        response = client.post("/api/apps", json={
            "name": "Phase 9 Test App",
            "icon_url": "http://example.com/phase9_icon.png"
        }, headers=headers)
        assert response.status_code == 201
        app_id = response.json()["id"]
        
        slides = []
        for i in range(1, 11):
            response = client.post(f"/api/apps/{app_id}/contents", json={
                "title": f"Phase 9 Test Slide {i}",
                "type": "text",
                "text_content": f"Slide {i} Content",
                "duration": 5
            }, headers=headers)
            assert response.status_code == 201
            slides.append(response.json())
        print(f"Created app {app_id} with 10 slides.")

        # Activate the App
        response = client.post(f"/api/apps/{app_id}/activate")
        assert response.status_code == 200
        
        # Verify initial batch is 0
        response = client.get("/api/session/state")
        assert response.json()["current_batch"] == 0

        # --- TEST 1: SCREEN COUNT CHANGES MID-SESSION CLAMPING ---
        print("\n--- Edge Case 1: Screen count changes mid-session (adding screens) ---")
        
        # Advance to batch 2 (max batch index for 4 screens, 10 slides: (10-1)//4 = 2)
        response = client.post("/api/session/next")
        response = client.post("/api/session/next")
        assert response.json()["current_batch"] == 2
        print("Moved to batch index 2 (Slide 9 & 10 visible, TV3 & TV4 showing default).")

        # Now add a 5th screen while at batch 2.
        # Active screens = 5, slides = 10. Max batch is (10-1)//5 = 1.
        # This should trigger clamp from 2 to 1.
        print("Adding a 5th active screen...")
        response = client.post("/api/screens", json={
            "screen_number": 805,
            "screen_name": "Phase 9 Test Screen 5"
        }, headers=headers)
        assert response.status_code == 201
        screen5 = response.json()

        # Fetch session state and confirm batch is clamped to 1
        response = client.get("/api/session/state")
        state = response.json()
        assert state["current_batch"] == 1, f"Expected batch to be clamped to 1, got {state['current_batch']}"
        print("✅ Success: Session batch clamped to 1 automatically when 5th screen was added.")

        # Deactivate screen 5 (active screens count goes back to 4. Max batch = 2. No automatic clamp needed)
        print("Deactivating 5th screen...")
        response = client.put(f"/api/screens/{screen5['id']}", json={
            "screen_number": 805,
            "screen_name": "Phase 9 Test Screen 5",
            "is_active": False
        }, headers=headers)
        assert response.status_code == 200

        # Move current_batch back to 2
        response = client.post("/api/session/next")
        assert response.json()["current_batch"] == 2

        # Reactivate screen 5. Active screens = 5, max batch = 1.
        # This should clamp batch to 1.
        print("Re-activating 5th screen...")
        response = client.put(f"/api/screens/{screen5['id']}", json={
            "screen_number": 805,
            "screen_name": "Phase 9 Test Screen 5",
            "is_active": True
        }, headers=headers)
        assert response.status_code == 200

        # Fetch state and confirm clamping
        response = client.get("/api/session/state")
        assert response.json()["current_batch"] == 1, "Expected batch to clamp to 1 on screen activation"
        print("✅ Success: Session batch clamped to 1 automatically when 5th screen was re-activated.")

        # Deactivate screen 5 for subsequent slide deletion tests
        client.put(f"/api/screens/{screen5['id']}", json={
            "screen_number": 805,
            "screen_name": "Phase 9 Test Screen 5",
            "is_active": False
        }, headers=headers)

        # --- TEST 2: SLIDE DELETION CLAMPING ---
        print("\n--- Edge Case 2: Slide deletion currently on-air ---")
        
        # Back to 4 screens. Move batch to 2.
        client.post("/api/session/next") # batch goes back to 2
        
        # Verify assignments at batch 2: Screen 1 shows Slide 9, Screen 2 shows Slide 10.
        state = client.get("/api/session/state").json()
        assert state["current_batch"] == 2
        assignment = state["assignment"]
        
        screen_1_key = str(screens[0]["id"])
        screen_2_key = str(screens[1]["id"])
        screen_3_key = str(screens[2]["id"])
        
        assert assignment[screen_1_key]["title"] == "Phase 9 Test Slide 9"
        assert assignment[screen_2_key]["title"] == "Phase 9 Test Slide 10"
        
        # Delete Slide 10 (which is visible on screen 2).
        # Slides count drops to 9. Max batch: (9-1)//4 = 2.
        # No clamp should occur, but Screen 2 assignment should become null (default).
        slide_10_id = slides[9]["id"]
        print(f"Deleting slide 10 (ID: {slide_10_id}) currently on-air on Screen 2...")
        response = client.delete(f"/api/contents/{slide_10_id}", headers=headers)
        assert response.status_code == 200
        
        state = client.get("/api/session/state").json()
        assert state["current_batch"] == 2
        assert state["assignment"][screen_1_key]["title"] == "Phase 9 Test Slide 9"
        assert state["assignment"][screen_2_key] is None
        print("✅ Success: Deleting slide 10 left batch at 2, but Screen 2 fell back to Default Screen.")

        # Now delete Slide 9 (visible on screen 1).
        # Slides count drops to 8. Max batch: (8-1)//4 = 1.
        # This is less than current_batch (2), so batch must clamp to 1.
        slide_9_id = slides[8]["id"]
        print(f"Deleting slide 9 (ID: {slide_9_id}) currently on-air on Screen 1...")
        response = client.delete(f"/api/contents/{slide_9_id}", headers=headers)
        assert response.status_code == 200

        state = client.get("/api/session/state").json()
        assert state["current_batch"] == 1, f"Expected batch to clamp to 1, got {state['current_batch']}"
        print("✅ Success: Session batch clamped to 1 automatically when slides count decreased.")

        # --- TEST 2.5: PDF DOCUMENT IMPORT AND SPLITTING ---
        print("\n--- Test 2.5: PDF Document Import and splitting ---")
        
        # A basic valid 2-page PDF binary string to upload
        dummy_pdf_bytes = (
            b"%PDF-1.4\n"
            b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
            b"2 0 obj\n<< /Type /Pages /Count 2 /Kids [ 3 0 R 4 0 R ] >>\nendobj\n"
            b"3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << >> >>\nendobj\n"
            b"4 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << >> >>\nendobj\n"
            b"xref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000054 00000 n\n0000000114 00000 n\n0000000174 00000 n\n"
            b"trailer\n<< /Size 5 /Root 1 0 R >>\n"
            b"startxref\n234\n"
            b"%%EOF\n"
        )
        
        from unittest.mock import patch
        with patch("backend.storage.supabase_storage.upload_file") as mock_upload:
            mock_upload.return_value = "https://supabase.co/storage/slide-media/presentation.pdf"
            
            response = client.post(
                f"/api/apps/{app_id}/contents/import_pdf",
                files={"file": ("presentation.pdf", dummy_pdf_bytes, "application/pdf")},
                headers=headers
            )
            assert response.status_code == 201
            imported_slides = response.json()
            
            # The app currently has 8 slides left (10 initial - 2 deleted).
            # Importing a 2-page PDF should add 2 new slides, making the total 10.
            assert len(imported_slides) == 10
            
            # Find the new slides (they will be at the end of the display order)
            pdf_slides = [s for s in imported_slides if s["type"] == "pdf"]
            assert len(pdf_slides) == 2
            
            # Verify titles and URLs
            assert pdf_slides[0]["title"] == "presentation - Page 1"
            assert pdf_slides[0]["file_url"] == "https://supabase.co/storage/slide-media/presentation.pdf#page=1"
            assert pdf_slides[1]["title"] == "presentation - Page 2"
            assert pdf_slides[1]["file_url"] == "https://supabase.co/storage/slide-media/presentation.pdf#page=2"
            
            # Verify sequential display_order
            assert pdf_slides[0]["display_order"] < pdf_slides[1]["display_order"]
            print("✅ Success: PDF document imported and split into sequential pages successfully.")

        # --- TEST 3: ACTIVE APP DELETION ---
        print("\n--- Edge Case 3: Deleting the active app ---")
        
        state = client.get("/api/session/state").json()
        assert state["active_app_id"] == app_id
        
        print(f"Deleting active app {app_id}...")
        response = client.delete(f"/api/apps/{app_id}", headers=headers)
        assert response.status_code == 200
        
        state = client.get("/api/session/state").json()
        assert state["active_app_id"] is None
        assert state["current_batch"] == 0
        for sid in state["assignment"]:
            assert state["assignment"][sid] is None
        print("✅ Success: Deleting active app nullified active_app_id and reset batch to 0.")

        # Clean up screen 5 as well
        client.delete(f"/api/screens/{screen5['id']}", headers=headers)

        print("\nAll Phase 9 Integration Hardening Tests Passed Successfully! [PASSED]")

    except Exception as e:
        db.rollback()
        print(f"\nTest FAILED with exception: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        # Clean up database test records
        print("\nCleaning up Phase 9 test data from DB...")
        for s in screens:
            client.delete(f"/api/screens/{s['id']}", headers=headers)
        client.delete(f"/api/apps/{app_id}", headers=headers)
        
        # Restore pre-existing active screens
        try:
            for sid in pre_existing_active_ids:
                db.query(Screen).filter(Screen.id == sid).update({Screen.is_active: True})
            db.commit()
            print("Restored pre-existing screens.")
        except Exception as restore_err:
            print(f"Failed to restore pre-existing screens: {restore_err}")
        db.close()

if __name__ == "__main__":
    test_phase9_hardening()
