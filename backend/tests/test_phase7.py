"""
Phase 7 — TV Client Integration Test Script

Tests the exact worked example from 02-system-architecture.md §3:
- 4 active screens
- 1 app with 10 slides
- Batch 0: TV1=Slide1, TV2=Slide2, TV3=Slide3, TV4=Slide4
- Batch 1: TV1=Slide5, TV2=Slide6, TV3=Slide7, TV4=Slide8
- Batch 2: TV1=Slide9, TV2=Slide10, TV3=Default, TV4=Default

Also tests:
- Screen identity resolution via screen_number
- Inactive screen exclusion from ranking
- Dynamic screen count re-ranking
- Session state endpoint shape
- Settings endpoint for Default Screen fallback
"""

import requests
import sys
import json

BASE_URL = "http://localhost:8000"
TOKEN = None

def log_pass(msg):
    print(f"  ✅ PASS: {msg}")

def log_fail(msg):
    print(f"  ❌ FAIL: {msg}")

def log_info(msg):
    print(f"  ℹ️  {msg}")

def log_section(msg):
    print(f"\n{'='*60}")
    print(f"  {msg}")
    print(f"{'='*60}")

# ─── Auth helpers ───

def admin_headers():
    return {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json"
    }

def login():
    global TOKEN
    # Try common passwords
    passwords = ["Admin@123", "adminpassword", "admin"]
    for pwd in passwords:
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "admin",
            "password": pwd
        })
        if r.status_code == 200:
            TOKEN = r.json()["access_token"]
            log_info(f"Logged in with password '{pwd}'")
            return True
    
    log_fail(f"Could not authenticate. Last response: {r.status_code} {r.text}")
    return False

# ─── Cleanup helpers ───

def cleanup_screens():
    """Delete all existing screens."""
    r = requests.get(f"{BASE_URL}/api/screens")
    screens = r.json()
    for s in screens:
        requests.delete(f"{BASE_URL}/api/screens/{s['id']}", headers=admin_headers())
    log_info(f"Cleaned up {len(screens)} existing screens")

def cleanup_apps():
    """Delete all existing apps (cascades to contents)."""
    r = requests.get(f"{BASE_URL}/api/apps")
    apps = r.json()
    for a in apps:
        requests.delete(f"{BASE_URL}/api/apps/{a['id']}", headers=admin_headers())
    log_info(f"Cleaned up {len(apps)} existing apps")

# ─── Seed helpers ───

def create_screens(count=4):
    """Create N active screens with screen_number 1..N."""
    screens = []
    for i in range(1, count + 1):
        r = requests.post(f"{BASE_URL}/api/screens", 
            json={"screen_number": i, "screen_name": f"TV{i}"},
            headers=admin_headers()
        )
        if r.status_code in (200, 201):
            screens.append(r.json())
        else:
            log_fail(f"Failed to create screen {i}: {r.status_code} {r.text}")
            return []
    log_info(f"Created {len(screens)} screens: {[s['screen_name'] for s in screens]}")
    return screens

def create_app_with_slides(num_slides=10):
    """Create an app with N text slides."""
    # Create app
    r = requests.post(f"{BASE_URL}/api/apps",
        json={"name": "Phase7 Test App", "icon_url": ""},
        headers=admin_headers()
    )
    if r.status_code not in (200, 201):
        log_fail(f"Failed to create app: {r.status_code} {r.text}")
        return None, []
    
    app = r.json()
    log_info(f"Created app: {app['name']} (id={app['id']})")
    
    # Create slides
    slides = []
    for i in range(1, num_slides + 1):
        r = requests.post(f"{BASE_URL}/api/apps/{app['id']}/contents",
            json={
                "title": f"Slide {i}",
                "type": "text",
                "text_content": f"This is the content of Slide {i}",
                "display_order": i - 1,
                "duration": 10
            },
            headers=admin_headers()
        )
        if r.status_code in (200, 201):
            slides.append(r.json())
        else:
            log_fail(f"Failed to create slide {i}: {r.status_code} {r.text}")
            return app, slides
    
    log_info(f"Created {len(slides)} slides for app '{app['name']}'")
    return app, slides


# ═══════════════════════════════════════════════════════════
#  TEST SUITE
# ═══════════════════════════════════════════════════════════

results = {"passed": 0, "failed": 0, "tests": []}

def assert_eq(actual, expected, msg):
    if actual == expected:
        log_pass(msg)
        results["passed"] += 1
        results["tests"].append(("PASS", msg))
    else:
        log_fail(f"{msg} | expected={expected!r}, got={actual!r}")
        results["failed"] += 1
        results["tests"].append(("FAIL", f"{msg} | expected={expected!r}, got={actual!r}"))

def assert_true(condition, msg):
    if condition:
        log_pass(msg)
        results["passed"] += 1
        results["tests"].append(("PASS", msg))
    else:
        log_fail(msg)
        results["failed"] += 1
        results["tests"].append(("FAIL", msg))


def test_health():
    log_section("TEST 0: Health Check")
    r = requests.get(f"{BASE_URL}/api/health")
    assert_eq(r.status_code, 200, "Health endpoint returns 200")
    data = r.json()
    assert_eq(data["status"], "ok", "Status is 'ok'")
    assert_eq(data["database"]["connected"], True, "Database is connected")


def test_session_state_endpoint():
    log_section("TEST 1: Session State Endpoint Shape")
    r = requests.get(f"{BASE_URL}/api/session/state")
    assert_eq(r.status_code, 200, "GET /api/session/state returns 200")
    data = r.json()
    assert_true("active_app_id" in data, "Response has 'active_app_id'")
    assert_true("current_batch" in data, "Response has 'current_batch'")
    assert_true("screens" in data, "Response has 'screens'")
    assert_true("assignment" in data, "Response has 'assignment'")


def test_batch0_assignment(app, screens, slides):
    """Test batch 0: 4 screens, 10 slides → slides 1-4 assigned."""
    log_section("TEST 2: Batch 0 Assignment (Worked Example)")
    
    # Activate the app (resets batch to 0)
    r = requests.post(f"{BASE_URL}/api/apps/{app['id']}/activate")
    assert_eq(r.status_code, 200, f"Activate app returns 200")
    
    # Get session state
    r = requests.get(f"{BASE_URL}/api/session/state")
    state = r.json()
    
    assert_eq(state["active_app_id"], app["id"], "Active app ID matches")
    assert_eq(state["current_batch"], 0, "Current batch is 0")
    assert_eq(len(state["screens"]), 4, "4 active screens returned")
    
    assignment = state["assignment"]
    screen_ids = [str(s["id"]) for s in state["screens"]]
    
    # TV1 → Slide 1, TV2 → Slide 2, TV3 → Slide 3, TV4 → Slide 4
    for i, sid in enumerate(screen_ids):
        expected_title = f"Slide {i + 1}"
        assert_true(
            sid in assignment and assignment[sid] is not None,
            f"Screen {i+1} (id={sid}) has an assignment"
        )
        if assignment[sid]:
            assert_eq(
                assignment[sid]["title"],
                expected_title,
                f"TV{i+1} shows '{expected_title}'"
            )


def test_batch1_assignment(app):
    """Test batch 1: slides 5-8 assigned."""
    log_section("TEST 3: Batch 1 Assignment (Next)")
    
    r = requests.post(f"{BASE_URL}/api/session/next")
    assert_eq(r.status_code, 200, "POST /api/session/next returns 200")
    
    state = r.json()
    assert_eq(state["current_batch"], 1, "Current batch is 1")
    
    assignment = state["assignment"]
    screen_ids = [str(s["id"]) for s in state["screens"]]
    
    # TV1 → Slide 5, TV2 → Slide 6, TV3 → Slide 7, TV4 → Slide 8
    for i, sid in enumerate(screen_ids):
        expected_title = f"Slide {i + 5}"
        assert_true(
            sid in assignment and assignment[sid] is not None,
            f"Screen {i+1} (id={sid}) has assignment at batch 1"
        )
        if assignment[sid]:
            assert_eq(
                assignment[sid]["title"],
                expected_title,
                f"TV{i+1} shows '{expected_title}' at batch 1"
            )


def test_batch2_default_screen_fallback(app):
    """Test batch 2: TV1=Slide9, TV2=Slide10, TV3=Default, TV4=Default."""
    log_section("TEST 4: Batch 2 — Default Screen Fallback (Core Phase 7 Test)")
    
    r = requests.post(f"{BASE_URL}/api/session/next")
    assert_eq(r.status_code, 200, "POST /api/session/next (batch 2) returns 200")
    
    state = r.json()
    assert_eq(state["current_batch"], 2, "Current batch is 2")
    
    assignment = state["assignment"]
    screen_ids = [str(s["id"]) for s in state["screens"]]
    
    # TV1 → Slide 9
    assert_true(
        assignment.get(screen_ids[0]) is not None,
        "TV1 has a slide assigned"
    )
    if assignment.get(screen_ids[0]):
        assert_eq(
            assignment[screen_ids[0]]["title"], "Slide 9",
            "TV1 shows 'Slide 9'"
        )
    
    # TV2 → Slide 10
    assert_true(
        assignment.get(screen_ids[1]) is not None,
        "TV2 has a slide assigned"
    )
    if assignment.get(screen_ids[1]):
        assert_eq(
            assignment[screen_ids[1]]["title"], "Slide 10",
            "TV2 shows 'Slide 10'"
        )
    
    # TV3 → null (Default Screen)
    assert_eq(
        assignment.get(screen_ids[2]), None,
        "TV3 assignment is null (→ Default Screen)"
    )
    
    # TV4 → null (Default Screen)
    assert_eq(
        assignment.get(screen_ids[3]), None,
        "TV4 assignment is null (→ Default Screen)"
    )


def test_previous_floor_at_zero():
    """Test Previous floors at batch 0."""
    log_section("TEST 5: Previous Floor at Batch 0")
    
    # Go back to batch 0 first
    requests.post(f"{BASE_URL}/api/session/previous")
    requests.post(f"{BASE_URL}/api/session/previous")
    
    # Now try Previous at batch 0
    r = requests.post(f"{BASE_URL}/api/session/previous")
    assert_eq(r.status_code, 200, "Previous at batch 0 returns 200")
    state = r.json()
    assert_eq(state["current_batch"], 0, "Batch floors at 0, doesn't go negative")


def test_settings_endpoint():
    """Test that settings endpoint returns Default Screen config."""
    log_section("TEST 6: Settings (Default Screen Config)")
    
    r = requests.get(f"{BASE_URL}/api/settings")
    assert_eq(r.status_code, 200, "GET /api/settings returns 200")
    data = r.json()
    assert_true("default_screen_type" in data, "Settings has 'default_screen_type'")
    log_info(f"Default screen config: type={data.get('default_screen_type')}")


def test_screen_identity_resolution(screens):
    """Test that screens list is ordered by screen_number for correct position ranking."""
    log_section("TEST 7: Screen Identity Resolution & Ranking")
    
    r = requests.get(f"{BASE_URL}/api/session/state")
    state = r.json()
    
    state_screens = state["screens"]
    
    # Verify screens are ordered by screen_number
    screen_numbers = [s["screen_number"] for s in state_screens]
    assert_eq(
        screen_numbers,
        sorted(screen_numbers),
        "Screens are ordered by screen_number ascending"
    )
    
    # Verify all 4 screens are present
    assert_eq(len(state_screens), 4, "All 4 active screens returned in state")


def test_dynamic_screen_count(app, screens):
    """
    Test: deactivate screen 2, confirm re-ranking with 3 screens.
    With 3 active screens and 10 slides at batch 0:
    TV1=Slide1, TV3=Slide2, TV4=Slide3
    """
    log_section("TEST 8: Dynamic Screen Count (Remove Screen Mid-Session)")
    
    # Deactivate screen 2 (toggle is_active to false)
    screen2 = screens[1]  # screen_number=2
    r = requests.put(
        f"{BASE_URL}/api/screens/{screen2['id']}",
        json={"screen_number": screen2["screen_number"], "screen_name": screen2["screen_name"], "is_active": False},
        headers=admin_headers()
    )
    assert_eq(r.status_code, 200, "Deactivate screen 2 returns 200")
    
    # Reset to batch 0
    r = requests.post(f"{BASE_URL}/api/apps/{app['id']}/activate")
    
    # Get state with 3 active screens
    r = requests.get(f"{BASE_URL}/api/session/state")
    state = r.json()
    
    assert_eq(len(state["screens"]), 3, "3 active screens after deactivating screen 2")
    
    assignment = state["assignment"]
    screen_ids = [str(s["id"]) for s in state["screens"]]
    
    # Now batch size is 3: TV1=Slide1, TV3=Slide2, TV4=Slide3
    assert_eq(
        assignment[screen_ids[0]]["title"], "Slide 1",
        "After re-rank: position 0 (TV1) shows Slide 1"
    )
    assert_eq(
        assignment[screen_ids[1]]["title"], "Slide 2",
        "After re-rank: position 1 (TV3) shows Slide 2"
    )
    assert_eq(
        assignment[screen_ids[2]]["title"], "Slide 3",
        "After re-rank: position 2 (TV4) shows Slide 3"
    )
    
    # Re-activate screen 2 for subsequent tests
    r = requests.put(
        f"{BASE_URL}/api/screens/{screen2['id']}",
        json={"screen_number": screen2["screen_number"], "screen_name": screen2["screen_name"], "is_active": True},
        headers=admin_headers()
    )
    assert_eq(r.status_code, 200, "Re-activate screen 2 returns 200")


def test_contents_endpoint(app):
    """Test that contents endpoint returns ordered slides for the active app."""
    log_section("TEST 9: Contents Endpoint (Slides Ordered)")
    
    r = requests.get(f"{BASE_URL}/api/apps/{app['id']}/contents")
    assert_eq(r.status_code, 200, "GET /api/apps/:id/contents returns 200")
    
    slides = r.json()
    assert_eq(len(slides), 10, "10 slides returned for the test app")
    
    # Verify ordering by display_order
    orders = [s["display_order"] for s in slides]
    assert_eq(orders, sorted(orders), "Slides are ordered by display_order ascending")
    
    # Verify each slide has the expected fields for TV rendering
    slide = slides[0]
    required_fields = ["id", "type", "title", "text_content", "file_url", "display_order"]
    for field in required_fields:
        assert_true(field in slide, f"Slide has required field '{field}'")


def test_websocket_events():
    """Test that batch:changed event is emitted (via checking response shape after next/prev)."""
    log_section("TEST 10: WebSocket Event Contracts (Indirect)")
    
    # We test the response shape which mirrors what gets broadcast
    r = requests.post(f"{BASE_URL}/api/session/next")
    state = r.json()
    
    # The response (and broadcast payload) should contain current_batch
    assert_true("current_batch" in state, "Next response has 'current_batch' for broadcast")
    assert_true("assignment" in state, "Next response has 'assignment' for clients")
    
    # Reset
    requests.post(f"{BASE_URL}/api/session/previous")


# ═══════════════════════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("\n" + "🖥️  " * 10)
    print("  PHASE 7 — TV CLIENT INTEGRATION TEST")
    print("  Testing the worked example from 02-system-architecture.md §3")
    print("🖥️  " * 10)
    
    # 0. Health check
    test_health()
    
    # 1. Login
    log_section("SETUP: Authentication")
    if not login():
        print("\n⛔ Cannot authenticate. Aborting tests.")
        sys.exit(1)
    
    # 2. Cleanup existing data
    log_section("SETUP: Cleanup & Seed Data")
    cleanup_apps()
    cleanup_screens()
    
    # 3. Seed: 4 screens + 1 app with 10 slides
    screens = create_screens(4)
    if len(screens) != 4:
        print("\n⛔ Failed to create 4 screens. Aborting.")
        sys.exit(1)
    
    app, slides = create_app_with_slides(10)
    if not app or len(slides) != 10:
        print("\n⛔ Failed to create app with 10 slides. Aborting.")
        sys.exit(1)
    
    # 4. Run tests
    test_session_state_endpoint()
    test_batch0_assignment(app, screens, slides)
    test_batch1_assignment(app)
    test_batch2_default_screen_fallback(app)
    test_previous_floor_at_zero()
    test_settings_endpoint()
    test_screen_identity_resolution(screens)
    test_dynamic_screen_count(app, screens)
    test_contents_endpoint(app)
    test_websocket_events()
    
    # 5. Summary
    print("\n" + "=" * 60)
    print(f"  📊 RESULTS: {results['passed']} passed, {results['failed']} failed")
    print("=" * 60)
    
    if results["failed"] > 0:
        print("\n  Failed tests:")
        for status, msg in results["tests"]:
            if status == "FAIL":
                print(f"    ❌ {msg}")
    
    print()
    sys.exit(0 if results["failed"] == 0 else 1)
