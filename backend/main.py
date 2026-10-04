"""QA Test Management & Defect Tracking API."""

import logging
import os
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from sqlalchemy.orm import Session

import crud
import models
from database import Base, engine, get_db
from schemas import (
    DefectCreate,
    DefectOut,
    DefectUpdate,
    ProjectCreate,
    ProjectOut,
    ProjectUpdate,
    TestCaseCreate,
    TestCaseOut,
    TestCaseUpdate,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("qa_tms")

LOCAL_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]


def _cors_origins():
    extra = [item.strip() for item in os.getenv("CORS_ORIGINS", "").split(",") if item.strip()]
    origins = []
    for origin in LOCAL_ORIGINS + extra:
        if origin not in origins and origin != "*":
            origins.append(origin)
    return origins


def init_db():
    Base.metadata.create_all(bind=engine)
    if os.getenv("SEED_DATA", "1") == "0":
        return
    from database import SessionLocal

    db = SessionLocal()
    try:
        crud.seed_if_empty(db)
    finally:
        db.close()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    logger.info("Database ready")
    yield


app = FastAPI(
    title="QA Test Management & Defect Tracking System",
    description="REST API for projects, test cases, test execution, defects, and reports.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Accept"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request, exc: RequestValidationError):
    messages = []
    for error in exc.errors():
        location = [str(item) for item in error.get("loc", []) if item not in ("body", "query")]
        message = error.get("msg", "Invalid value")
        prefix = "Value error, "
        if message.startswith(prefix):
            message = message[len(prefix) :]
        messages.append(f"{' '.join(location)}: {message}" if location else message)
    detail = "; ".join(messages) if messages else "Invalid input"
    return JSONResponse(status_code=422, content={"detail": detail})


@app.exception_handler(HTTPException)
async def http_exception_handler(_request, exc: HTTPException):
    detail = exc.detail if isinstance(exc.detail, str) else "Request failed"
    return JSONResponse(status_code=exc.status_code, content={"detail": detail})


@app.exception_handler(Exception)
async def unhandled_exception_handler(_request, exc: Exception):
    logger.exception("Unhandled error: %s", exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Please try again."},
    )


def get_project_or_404(db: Session, project_id: int) -> models.Project:
    project = crud.get_project(db, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def ensure_project_exists(db: Session, project_id: int):
    if crud.get_project(db, project_id) is None:
        raise HTTPException(status_code=404, detail="Project not found")


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/projects", response_model=list[ProjectOut])
def read_projects(db: Session = Depends(get_db)):
    return crud.list_projects(db)


@app.post("/api/projects", response_model=ProjectOut, status_code=201)
def add_project(payload: ProjectCreate, db: Session = Depends(get_db)):
    return crud.create_project(db, payload.model_dump())


@app.get("/api/projects/{project_id}", response_model=ProjectOut)
def read_project(project_id: int, db: Session = Depends(get_db)):
    return get_project_or_404(db, project_id)


@app.put("/api/projects/{project_id}", response_model=ProjectOut)
def edit_project(project_id: int, payload: ProjectUpdate, db: Session = Depends(get_db)):
    project = get_project_or_404(db, project_id)
    data = payload.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")
    return crud.update_project(db, project, data)


@app.delete("/api/projects/{project_id}", status_code=204)
def remove_project(project_id: int, db: Session = Depends(get_db)):
    project = get_project_or_404(db, project_id)
    crud.delete_project(db, project)


@app.get("/api/test-cases", response_model=list[TestCaseOut])
def read_test_cases(
    project_id: int | None = None,
    status: str | None = None,
    priority: str | None = None,
    module: str | None = None,
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    _validate_choice(status, models.TEST_CASE_STATUSES, "status")
    _validate_choice(priority, models.PRIORITIES, "priority")
    return crud.list_test_cases(db, project_id, status, priority, module, search)


@app.post("/api/test-cases", response_model=TestCaseOut, status_code=201)
def add_test_case(payload: TestCaseCreate, db: Session = Depends(get_db)):
    ensure_project_exists(db, payload.project_id)
    return crud.create_test_case(db, payload.model_dump())


@app.get("/api/test-cases/{test_case_id}", response_model=TestCaseOut)
def read_test_case(test_case_id: int, db: Session = Depends(get_db)):
    test_case = crud.get_test_case(db, test_case_id)
    if test_case is None:
        raise HTTPException(status_code=404, detail="Test case not found")
    return test_case


@app.put("/api/test-cases/{test_case_id}", response_model=TestCaseOut)
def edit_test_case(test_case_id: int, payload: TestCaseUpdate, db: Session = Depends(get_db)):
    test_case = crud.get_test_case(db, test_case_id)
    if test_case is None:
        raise HTTPException(status_code=404, detail="Test case not found")
    data = payload.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")
    if "project_id" in data:
        ensure_project_exists(db, data["project_id"])
    return crud.update_test_case(db, test_case, data)


@app.delete("/api/test-cases/{test_case_id}", status_code=204)
def remove_test_case(test_case_id: int, db: Session = Depends(get_db)):
    test_case = crud.get_test_case(db, test_case_id)
    if test_case is None:
        raise HTTPException(status_code=404, detail="Test case not found")
    crud.delete_test_case(db, test_case)


@app.get("/api/defects", response_model=list[DefectOut])
def read_defects(
    project_id: int | None = None,
    severity: str | None = None,
    priority: str | None = None,
    status: str | None = None,
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    _validate_choice(severity, models.SEVERITIES, "severity")
    _validate_choice(priority, models.PRIORITIES, "priority")
    _validate_choice(status, models.DEFECT_STATUSES, "status")
    return crud.list_defects(db, project_id, severity, priority, status, search)


@app.post("/api/defects", response_model=DefectOut, status_code=201)
def add_defect(payload: DefectCreate, db: Session = Depends(get_db)):
    ensure_project_exists(db, payload.project_id)
    return crud.create_defect(db, payload.model_dump())


@app.get("/api/defects/{defect_id}", response_model=DefectOut)
def read_defect(defect_id: int, db: Session = Depends(get_db)):
    defect = crud.get_defect(db, defect_id)
    if defect is None:
        raise HTTPException(status_code=404, detail="Defect not found")
    return defect


@app.put("/api/defects/{defect_id}", response_model=DefectOut)
def edit_defect(defect_id: int, payload: DefectUpdate, db: Session = Depends(get_db)):
    defect = crud.get_defect(db, defect_id)
    if defect is None:
        raise HTTPException(status_code=404, detail="Defect not found")
    data = payload.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")
    if "project_id" in data:
        ensure_project_exists(db, data["project_id"])
    return crud.update_defect(db, defect, data)


@app.delete("/api/defects/{defect_id}", status_code=204)
def remove_defect(defect_id: int, db: Session = Depends(get_db)):
    defect = crud.get_defect(db, defect_id)
    if defect is None:
        raise HTTPException(status_code=404, detail="Defect not found")
    crud.delete_defect(db, defect)


@app.get("/api/dashboard")
def dashboard(db: Session = Depends(get_db)):
    return crud.dashboard_stats(db)


@app.get("/api/reports")
def reports(project_id: int | None = None, db: Session = Depends(get_db)):
    if project_id is not None:
        ensure_project_exists(db, project_id)
    return crud.report_stats(db, project_id)


@app.get("/api/reports/export/test-cases")
def export_test_cases(
    project_id: int | None = None,
    status: str | None = None,
    priority: str | None = None,
    module: str | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
):
    _validate_choice(status, models.TEST_CASE_STATUSES, "status")
    _validate_choice(priority, models.PRIORITIES, "priority")
    content = crud.test_cases_csv(db, project_id, status, priority, module, search)
    return _csv_response(content, "test-cases.csv")


@app.get("/api/reports/export/defects")
def export_defects(
    project_id: int | None = None,
    severity: str | None = None,
    priority: str | None = None,
    status: str | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
):
    _validate_choice(severity, models.SEVERITIES, "severity")
    _validate_choice(priority, models.PRIORITIES, "priority")
    _validate_choice(status, models.DEFECT_STATUSES, "status")
    content = crud.defects_csv(db, project_id, severity, priority, status, search)
    return _csv_response(content, "defects.csv")


def _validate_choice(value, allowed, field_name):
    if value is not None and value not in allowed:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid {field_name}. Allowed values: {', '.join(allowed)}",
        )


def _csv_response(content: str, filename: str):
    return Response(
        content=content,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=os.getenv("UVICORN_RELOAD") == "1")
