import sys
import os

# Add the project root to sys.path to allow absolute imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.db.database import SessionLocal
from backend.models import Admin, App, Content, Screen, Session, Settings
from backend.config import settings

def test_database_setup():
    print("Starting automated database verification...")
    db = SessionLocal()
    try:
        # 1. Verify seed rows in session
        print("Checking session singleton...")
        sess = db.query(Session).filter(Session.id == 1).first()
        assert sess is not None, "Session singleton (id=1) not found!"
        assert sess.active_app_id is None, f"Expected active_app_id to be None, got {sess.active_app_id}"
        assert sess.current_batch == 0, f"Expected current_batch to be 0, got {sess.current_batch}"
        print("Session singleton: OK")

        # 2. Verify seed rows in settings
        print("Checking settings singleton...")
        sets = db.query(Settings).filter(Settings.id == 1).first()
        assert sets is not None, "Settings singleton (id=1) not found!"
        assert sets.default_screen_type == "text", f"Expected default_screen_type to be 'text', got {sets.default_screen_type}"
        print("Settings singleton: OK")

        # 3. Verify bootstrap admin
        print("Checking bootstrap admin user...")
        admin_user = db.query(Admin).filter(Admin.username == settings.ADMIN_USERNAME).first()
        assert admin_user is not None, f"Admin user '{settings.ADMIN_USERNAME}' not found!"
        assert admin_user.password_hash.startswith("$2b$") or admin_user.password_hash.startswith("$2a$"), "Password hash is not bcrypt!"
        print(f"Bootstrap admin '{settings.ADMIN_USERNAME}': OK")

        # 4. Verify FK cascade behavior: deleting an App deletes its Contents
        print("Testing App -> Content cascade delete behavior...")
        test_app = App(name="Test Cascade App", is_active=False)
        db.add(test_app)
        db.commit()
        db.refresh(test_app)

        test_content1 = Content(
            app_id=test_app.id,
            title="Slide 1",
            type="text",
            text_content="Content 1",
            display_order=0
        )
        test_content2 = Content(
            app_id=test_app.id,
            title="Slide 2",
            type="text",
            text_content="Content 2",
            display_order=1
        )
        db.add(test_content1)
        db.add(test_content2)
        db.commit()

        # Confirm content was saved
        contents = db.query(Content).filter(Content.app_id == test_app.id).all()
        assert len(contents) == 2, f"Expected 2 slides, got {len(contents)}"

        # Delete App
        db.delete(test_app)
        db.commit()

        # Check if contents are deleted
        deleted_contents = db.query(Content).filter(Content.app_id == test_app.id).all()
        assert len(deleted_contents) == 0, f"Expected 0 slides after App deletion, got {len(deleted_contents)}"
        print("App -> Content cascade delete: OK")

        # 5. Verify Session FK set null behavior: deleting active App nulls active_app_id
        print("Testing App -> Session ON DELETE SET NULL behavior...")
        active_app = App(name="Test Active App", is_active=False)
        db.add(active_app)
        db.commit()
        db.refresh(active_app)

        # Set as active in session
        sess.active_app_id = active_app.id
        db.commit()

        # Confirm it was updated
        db.refresh(sess)
        assert sess.active_app_id == active_app.id, f"Expected active_app_id to be {active_app.id}, got {sess.active_app_id}"

        # Delete the active App
        db.delete(active_app)
        db.commit()

        # Confirm session's active_app_id is now None
        db.refresh(sess)
        assert sess.active_app_id is None, f"Expected active_app_id to be set to None, got {sess.active_app_id}"
        print("App -> Session ON DELETE SET NULL: OK")

        print("\nAll database schema, seed, and constraint checks passed successfully! [PASSED]")

    except AssertionError as e:
        print(f"\nVerification FAILED: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\nAn unexpected error occurred: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    test_database_setup()
