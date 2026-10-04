"""Database operations for projects, test cases, defects, and reports."""

import csv
import io

from sqlalchemy import func
from sqlalchemy.orm import Session

from models import (
    DEFECT_STATUSES,
    PRIORITIES,
    SEVERITIES,
    TEST_CASE_STATUSES,
    Defect,
    Project,
    TestCase,
    utcnow,
)


def seed_if_empty(db: Session) -> None:
    """Insert sample QA data once. Does nothing if a project already exists."""
    if db.query(Project).count() > 0:
        return

    project = Project(
        name="Customer Portal",
        description="Web portal where customers sign in, manage their profile, and view orders.",
    )
    db.add(project)
    db.flush()

    db.add_all(
        [
            TestCase(
                project_id=project.id,
                title="Valid customer login",
                module="Authentication",
                priority="High",
                preconditions="A registered customer account exists.",
                test_steps="1. Open the login page.\n2. Enter a valid email and password.\n3. Click Sign in.",
                expected_result="The customer lands on the account dashboard.",
                actual_result="Dashboard opened for the registered customer.",
                status="Pass",
            ),
            TestCase(
                project_id=project.id,
                title="Reject an incorrect password",
                module="Authentication",
                priority="Critical",
                preconditions="A registered customer account exists.",
                test_steps="1. Open the login page.\n2. Enter a valid email and a wrong password.\n3. Click Sign in.",
                expected_result="Login is denied and an error message is shown.",
                actual_result="The user was signed in even though the password was wrong.",
                status="Fail",
            ),
            TestCase(
                project_id=project.id,
                title="Require an email address",
                module="Authentication",
                priority="Medium",
                preconditions="The login page is open.",
                test_steps="1. Leave the email field empty.\n2. Enter a password.\n3. Click Sign in.",
                expected_result="The form shows that email is required and does not submit.",
                actual_result="Validation message 'Email is required' is displayed.",
                status="Pass",
            ),
            TestCase(
                project_id=project.id,
                title="Send a password reset link",
                module="Authentication",
                priority="High",
                preconditions="The mail service is available.",
                test_steps="1. Open Forgot password.\n2. Enter a registered email.\n3. Submit the form.",
                expected_result="A reset email arrives within one minute.",
                actual_result="Mail service was unavailable in this environment.",
                status="Blocked",
            ),
            TestCase(
                project_id=project.id,
                title="Keep the session after refresh",
                module="Dashboard",
                priority="Low",
                preconditions="The customer is signed in with Remember me checked.",
                test_steps="1. Sign in with Remember me checked.\n2. Refresh the browser.",
                expected_result="The customer stays signed in.",
                actual_result="",
                status="Not Run",
            ),
        ]
    )

    db.add_all(
        [
            Defect(
                project_id=project.id,
                title="Login succeeds with a wrong password",
                description="Authentication accepts an incorrect password and opens the dashboard.",
                severity="Critical",
                priority="Critical",
                steps_to_reproduce="1. Open the login page.\n2. Enter a valid email and an incorrect password.\n3. Click Sign in.",
                expected_result="Access is denied.",
                actual_result="The dashboard opens.",
                status="Open",
            ),
            Defect(
                project_id=project.id,
                title="Password reset email is delayed",
                description="Reset emails are not delivered within the expected minute.",
                severity="Major",
                priority="High",
                steps_to_reproduce="1. Request a password reset for a known account.\n2. Wait two minutes.",
                expected_result="The email arrives within one minute.",
                actual_result="No email arrived and the mail log shows a timeout.",
                status="In Progress",
            ),
            Defect(
                project_id=project.id,
                title="Dashboard greeting has a typo",
                description="The welcome heading says 'Welcom back'.",
                severity="Minor",
                priority="Low",
                steps_to_reproduce="1. Sign in with a valid account.\n2. Read the dashboard heading.",
                expected_result="The heading says 'Welcome back'.",
                actual_result="The heading says 'Welcom back'.",
                status="Closed",
            ),
        ]
    )
    db.commit()


def list_projects(db: Session):
    return db.query(Project).order_by(Project.id.desc()).all()


def get_project(db: Session, project_id: int):
    return db.query(Project).filter(Project.id == project_id).first()


def create_project(db: Session, data: dict):
    project = Project(**data)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def update_project(db: Session, project: Project, data: dict):
    for key, value in data.items():
        setattr(project, key, value)
    db.commit()
    db.refresh(project)
    return project


def delete_project(db: Session, project: Project):
    db.delete(project)
    db.commit()


def _apply_test_case_filters(query, project_id, status, priority, module, search):
    if project_id is not None:
        query = query.filter(TestCase.project_id == project_id)
    if status:
        query = query.filter(TestCase.status == status)
    if priority:
        query = query.filter(TestCase.priority == priority)
    if module:
        query = query.filter(TestCase.module.ilike(f"%{module.strip()}%"))
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            TestCase.title.ilike(term)
            | TestCase.module.ilike(term)
            | TestCase.test_steps.ilike(term)
            | TestCase.expected_result.ilike(term)
        )
    return query


def list_test_cases(db: Session, project_id=None, status=None, priority=None, module=None, search=None):
    query = _apply_test_case_filters(db.query(TestCase), project_id, status, priority, module, search)
    return query.order_by(TestCase.id.desc()).all()


def get_test_case(db: Session, test_case_id: int):
    return db.query(TestCase).filter(TestCase.id == test_case_id).first()


def create_test_case(db: Session, data: dict):
    test_case = TestCase(**data)
    db.add(test_case)
    db.commit()
    db.refresh(test_case)
    return test_case


def update_test_case(db: Session, test_case: TestCase, data: dict):
    for key, value in data.items():
        setattr(test_case, key, value)
    test_case.updated_at = utcnow()
    db.commit()
    db.refresh(test_case)
    return test_case


def delete_test_case(db: Session, test_case: TestCase):
    db.delete(test_case)
    db.commit()


def _apply_defect_filters(query, project_id, severity, priority, status, search):
    if project_id is not None:
        query = query.filter(Defect.project_id == project_id)
    if severity:
        query = query.filter(Defect.severity == severity)
    if priority:
        query = query.filter(Defect.priority == priority)
    if status:
        query = query.filter(Defect.status == status)
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            Defect.title.ilike(term)
            | Defect.description.ilike(term)
            | Defect.steps_to_reproduce.ilike(term)
        )
    return query


def list_defects(db: Session, project_id=None, severity=None, priority=None, status=None, search=None):
    query = _apply_defect_filters(db.query(Defect), project_id, severity, priority, status, search)
    return query.order_by(Defect.id.desc()).all()


def get_defect(db: Session, defect_id: int):
    return db.query(Defect).filter(Defect.id == defect_id).first()


def create_defect(db: Session, data: dict):
    defect = Defect(**data)
    db.add(defect)
    db.commit()
    db.refresh(defect)
    return defect


def update_defect(db: Session, defect: Defect, data: dict):
    for key, value in data.items():
        setattr(defect, key, value)
    defect.updated_at = utcnow()
    db.commit()
    db.refresh(defect)
    return defect


def delete_defect(db: Session, defect: Defect):
    db.delete(defect)
    db.commit()


def _percentage(part: int, total: int) -> float:
    if total == 0:
        return 0.0
    return round((part * 100) / total, 1)


def _count_map(db: Session, model, column, allowed, project_id=None):
    counts = {name: 0 for name in allowed}
    query = db.query(column, func.count(model.id))
    if project_id is not None:
        query = query.filter(model.project_id == project_id)
    for name, count in query.group_by(column).all():
        counts[name] = count
    return counts


def dashboard_stats(db: Session):
    status_counts = _count_map(db, TestCase, TestCase.status, TEST_CASE_STATUSES)
    severity_counts = _count_map(db, Defect, Defect.severity, SEVERITIES)
    defect_status_counts = _count_map(db, Defect, Defect.status, DEFECT_STATUSES)
    return {
        "total_projects": db.query(Project).count(),
        "total_test_cases": db.query(TestCase).count(),
        "passed_test_cases": status_counts["Pass"],
        "failed_test_cases": status_counts["Fail"],
        "blocked_test_cases": status_counts["Blocked"],
        "not_run_test_cases": status_counts["Not Run"],
        "open_defects": defect_status_counts["Open"],
        "critical_defects": severity_counts["Critical"],
        "closed_defects": defect_status_counts["Closed"],
        "total_defects": db.query(Defect).count(),
    }


def report_stats(db: Session, project_id=None):
    case_query = db.query(TestCase)
    defect_query = db.query(Defect)
    if project_id is not None:
        case_query = case_query.filter(TestCase.project_id == project_id)
        defect_query = defect_query.filter(Defect.project_id == project_id)

    status_counts = _count_map(db, TestCase, TestCase.status, TEST_CASE_STATUSES, project_id)
    total_cases = case_query.count()
    return {
        "total_test_cases": total_cases,
        "passed": status_counts["Pass"],
        "failed": status_counts["Fail"],
        "blocked": status_counts["Blocked"],
        "not_run": status_counts["Not Run"],
        "pass_percentage": _percentage(status_counts["Pass"], total_cases),
        "fail_percentage": _percentage(status_counts["Fail"], total_cases),
        "blocked_percentage": _percentage(status_counts["Blocked"], total_cases),
        "not_run_percentage": _percentage(status_counts["Not Run"], total_cases),
        "total_defects": defect_query.count(),
        "defect_summary": _count_map(db, Defect, Defect.status, DEFECT_STATUSES, project_id),
        "severity_summary": _count_map(db, Defect, Defect.severity, SEVERITIES, project_id),
        "priority_summary": _count_map(db, Defect, Defect.priority, PRIORITIES, project_id),
    }


def _project_names(db: Session):
    return {project.id: project.name for project in db.query(Project).all()}


def test_cases_csv(db: Session, project_id=None, status=None, priority=None, module=None, search=None) -> str:
    names = _project_names(db)
    rows = list_test_cases(db, project_id, status, priority, module, search)
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "ID",
            "Project",
            "Title",
            "Module",
            "Priority",
            "Status",
            "Preconditions",
            "Test Steps",
            "Expected Result",
            "Actual Result",
            "Created At",
            "Updated At",
        ]
    )
    for row in reversed(rows):
        writer.writerow(
            [
                row.id,
                names.get(row.project_id, ""),
                row.title,
                row.module,
                row.priority,
                row.status,
                row.preconditions,
                row.test_steps,
                row.expected_result,
                row.actual_result,
                row.created_at.isoformat(sep=" ", timespec="seconds"),
                row.updated_at.isoformat(sep=" ", timespec="seconds"),
            ]
        )
    return "\ufeff" + buffer.getvalue()


def defects_csv(db: Session, project_id=None, severity=None, priority=None, status=None, search=None) -> str:
    names = _project_names(db)
    rows = list_defects(db, project_id, severity, priority, status, search)
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "ID",
            "Project",
            "Title",
            "Description",
            "Severity",
            "Priority",
            "Status",
            "Steps to Reproduce",
            "Expected Result",
            "Actual Result",
            "Created At",
            "Updated At",
        ]
    )
    for row in reversed(rows):
        writer.writerow(
            [
                row.id,
                names.get(row.project_id, ""),
                row.title,
                row.description,
                row.severity,
                row.priority,
                row.status,
                row.steps_to_reproduce,
                row.expected_result,
                row.actual_result,
                row.created_at.isoformat(sep=" ", timespec="seconds"),
                row.updated_at.isoformat(sep=" ", timespec="seconds"),
            ]
        )
    return "\ufeff" + buffer.getvalue()
