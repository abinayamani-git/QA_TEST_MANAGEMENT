"""API tests for health, CRUD, validation, dashboard, reports, and CSV export."""

from crud import seed_if_empty
from database import SessionLocal


def _project(client, name="Checkout"):
    response = client.post("/api/projects", json={"name": name, "description": "Checkout flow"})
    assert response.status_code == 201
    return response.json()


def _test_case(client, project_id, **overrides):
    payload = {
        "project_id": project_id,
        "title": "Place an order",
        "module": "Checkout",
        "priority": "High",
        "preconditions": "Cart has one item",
        "test_steps": "Click Pay",
        "expected_result": "Order is confirmed",
        "actual_result": "",
        "status": "Not Run",
    }
    payload.update(overrides)
    response = client.post("/api/test-cases", json=payload)
    assert response.status_code == 201
    return response.json()


def _defect(client, project_id, **overrides):
    payload = {
        "project_id": project_id,
        "title": "Payment button does nothing",
        "description": "Clicking Pay does not submit",
        "severity": "Major",
        "priority": "High",
        "steps_to_reproduce": "Open checkout and click Pay",
        "expected_result": "Payment starts",
        "actual_result": "Nothing happens",
        "status": "Open",
    }
    payload.update(overrides)
    response = client.post("/api/defects", json=payload)
    assert response.status_code == 201
    return response.json()


def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_project_crud(client):
    created = _project(client, "Billing")
    assert created["name"] == "Billing"
    assert created["description"] == "Checkout flow"

    listing = client.get("/api/projects")
    assert listing.status_code == 200
    assert len(listing.json()) == 1

    fetched = client.get(f"/api/projects/{created['id']}")
    assert fetched.status_code == 200
    assert fetched.json()["name"] == "Billing"

    updated = client.put(
        f"/api/projects/{created['id']}",
        json={"name": "Billing Portal", "description": "Updated"},
    )
    assert updated.status_code == 200
    assert updated.json()["name"] == "Billing Portal"

    missing = client.get("/api/projects/9999")
    assert missing.status_code == 404
    assert missing.json()["detail"] == "Project not found"

    deleted = client.delete(f"/api/projects/{created['id']}")
    assert deleted.status_code == 204
    assert client.get(f"/api/projects/{created['id']}").status_code == 404


def test_project_validation(client):
    blank = client.post("/api/projects", json={"name": "   ", "description": ""})
    assert blank.status_code == 422
    empty = client.post("/api/projects", json={"name": ""})
    assert empty.status_code == 422


def test_test_case_crud_and_filters(client):
    project = _project(client)
    other = _project(client, "Search")
    created = _test_case(client, project["id"])
    _test_case(client, project["id"], title="Apply coupon", module="Pricing", priority="Low", status="Pass")
    _test_case(client, other["id"], title="Search products", module="Catalog", status="Fail")

    assert client.get(f"/api/test-cases/{created['id']}").status_code == 200

    updated = client.put(
        f"/api/test-cases/{created['id']}",
        json={"status": "Fail", "actual_result": "Button stayed disabled"},
    )
    assert updated.status_code == 200
    assert updated.json()["status"] == "Fail"
    assert updated.json()["actual_result"] == "Button stayed disabled"

    by_project = client.get("/api/test-cases", params={"project_id": project["id"]})
    assert by_project.status_code == 200
    assert len(by_project.json()) == 2

    by_status = client.get("/api/test-cases", params={"status": "Pass"})
    assert [row["title"] for row in by_status.json()] == ["Apply coupon"]

    by_priority = client.get("/api/test-cases", params={"priority": "Low"})
    assert len(by_priority.json()) == 1

    by_module = client.get("/api/test-cases", params={"module": "cat"})
    assert by_module.json()[0]["module"] == "Catalog"

    by_search = client.get("/api/test-cases", params={"search": "coupon"})
    assert by_search.json()[0]["title"] == "Apply coupon"

    invalid = client.get("/api/test-cases", params={"status": "Skipped"})
    assert invalid.status_code == 422

    assert client.get("/api/test-cases/9999").status_code == 404
    assert client.delete(f"/api/test-cases/{created['id']}").status_code == 204
    assert client.get(f"/api/test-cases/{created['id']}").status_code == 404


def test_test_case_validation(client):
    project = _project(client)
    blank = client.post(
        "/api/test-cases",
        json={"project_id": project["id"], "title": "   "},
    )
    assert blank.status_code == 422

    bad_status = client.post(
        "/api/test-cases",
        json={"project_id": project["id"], "title": "Real title", "status": "Maybe"},
    )
    assert bad_status.status_code == 422

    bad_priority = client.post(
        "/api/test-cases",
        json={"project_id": project["id"], "title": "Real title", "priority": "Urgent"},
    )
    assert bad_priority.status_code == 422

    missing_project = client.post("/api/test-cases", json={"project_id": 9999, "title": "Orphan"})
    assert missing_project.status_code == 404


def test_defect_crud_and_filters(client):
    project = _project(client)
    created = _defect(client, project["id"])
    _defect(
        client,
        project["id"],
        title="Typo on receipt",
        severity="Minor",
        priority="Low",
        status="Closed",
    )

    assert client.get(f"/api/defects/{created['id']}").json()["title"] == "Payment button does nothing"

    updated = client.put(f"/api/defects/{created['id']}", json={"status": "Retest"})
    assert updated.status_code == 200
    assert updated.json()["status"] == "Retest"

    assert len(client.get("/api/defects", params={"severity": "Minor"}).json()) == 1
    assert len(client.get("/api/defects", params={"priority": "Low"}).json()) == 1
    assert len(client.get("/api/defects", params={"status": "Closed"}).json()) == 1
    assert client.get("/api/defects", params={"search": "receipt"}).json()[0]["severity"] == "Minor"

    assert client.get("/api/defects", params={"severity": "Blocker"}).status_code == 422
    assert client.get("/api/defects/9999").status_code == 404
    assert client.delete(f"/api/defects/{created['id']}").status_code == 204


def test_defect_validation(client):
    project = _project(client)
    assert client.post("/api/defects", json={"project_id": project["id"], "title": " "}).status_code == 422
    assert (
        client.post(
            "/api/defects",
            json={"project_id": project["id"], "title": "Broken total", "severity": "Huge"},
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/api/defects",
            json={"project_id": project["id"], "title": "Broken total", "status": "Done"},
        ).status_code
        == 422
    )
    assert client.post("/api/defects", json={"project_id": 9999, "title": "Missing"}).status_code == 404


def test_delete_project_removes_related_records(client):
    project = _project(client)
    case = _test_case(client, project["id"])
    defect = _defect(client, project["id"])
    assert client.delete(f"/api/projects/{project['id']}").status_code == 204
    assert client.get(f"/api/test-cases/{case['id']}").status_code == 404
    assert client.get(f"/api/defects/{defect['id']}").status_code == 404


def test_dashboard_and_reports(client):
    project = _project(client)
    _test_case(client, project["id"], status="Pass", priority="High")
    _test_case(client, project["id"], title="Second", status="Fail", priority="Critical")
    _test_case(client, project["id"], title="Third", status="Blocked", priority="Medium")
    _test_case(client, project["id"], title="Fourth", status="Not Run", priority="Low")
    _defect(client, project["id"], severity="Critical", priority="Critical", status="Open")
    _defect(client, project["id"], title="Copy issue", severity="Minor", priority="Low", status="Closed")

    dashboard = client.get("/api/dashboard")
    assert dashboard.status_code == 200
    body = dashboard.json()
    assert body["total_projects"] == 1
    assert body["total_test_cases"] == 4
    assert body["passed_test_cases"] == 1
    assert body["failed_test_cases"] == 1
    assert body["blocked_test_cases"] == 1
    assert body["not_run_test_cases"] == 1
    assert body["open_defects"] == 1
    assert body["critical_defects"] == 1
    assert body["closed_defects"] == 1
    assert body["total_defects"] == 2

    report = client.get("/api/reports", params={"project_id": project["id"]})
    assert report.status_code == 200
    stats = report.json()
    assert stats["pass_percentage"] == 25.0
    assert stats["fail_percentage"] == 25.0
    assert stats["blocked_percentage"] == 25.0
    assert stats["not_run_percentage"] == 25.0
    assert stats["defect_summary"]["Open"] == 1
    assert stats["defect_summary"]["Closed"] == 1
    assert stats["severity_summary"]["Critical"] == 1
    assert stats["severity_summary"]["Minor"] == 1
    assert client.get("/api/reports", params={"project_id": 9999}).status_code == 404


def test_csv_export(client):
    project = _project(client, "Portal")
    _test_case(client, project["id"], title="Valid login")
    _defect(client, project["id"], title="Wrong password accepted")

    cases = client.get("/api/reports/export/test-cases")
    assert cases.status_code == 200
    assert "text/csv" in cases.headers["content-type"]
    assert "Valid login" in cases.text
    assert "Portal" in cases.text

    defects = client.get("/api/reports/export/defects", params={"status": "Open"})
    assert defects.status_code == 200
    assert "Wrong password accepted" in defects.text


def test_seed_data_is_not_duplicated(client):
    from models import Defect as DefectRecord
    from models import Project as ProjectRecord
    from models import TestCase as TestCaseRecord

    db = SessionLocal()
    try:
        seed_if_empty(db)
        seed_if_empty(db)
        assert db.query(ProjectRecord).count() == 1
        assert db.query(TestCaseRecord).count() == 5
        assert db.query(DefectRecord).count() == 3
        assert {row.status for row in db.query(TestCaseRecord).all()} == {"Pass", "Fail", "Blocked", "Not Run"}
    finally:
        db.close()


def test_cors_allows_local_frontend(client):
    response = client.options(
        "/api/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_unknown_record_updates_return_404(client):
    assert client.put("/api/projects/5", json={"name": "Nope"}).status_code == 404
    assert client.put("/api/test-cases/5", json={"status": "Pass"}).status_code == 404
    assert client.put("/api/defects/5", json={"status": "Closed"}).status_code == 404
    assert client.delete("/api/defects/5").status_code == 404
