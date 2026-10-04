# QA Test Management & Defect Tracking System

A local web application for a QA tester to manage projects, write and execute test cases, track defects, and export reports. It runs with Python, FastAPI, SQLite, React, and Vite. No accounts, API keys, or paid services are required.

## Project overview

The tester creates a project, adds test cases, marks each case Pass, Fail, Blocked, or Not Run, and logs defects with severity and status. A dashboard and a reports page summarize the work. Test cases and defects can be downloaded as CSV files.

## Problem statement

Test results kept in scattered spreadsheets are hard to search, easy to overwrite, and poor at showing how many cases passed or how many critical defects are still open. This system keeps projects, execution results, and defects in one place with a repeatable QA workflow.

## Features

- Create, edit, delete, and open projects
- Create, edit, delete, and view test cases
- Search test cases and filter by project, status, priority, and module
- Execute a test case by setting Pass, Fail, Blocked, or Not Run
- Report defects and move them through Open, In Progress, Fixed, Retest, Closed, and Reopened
- Search defects and filter by severity, priority, and status
- Dashboard counts for projects, test results, and defects
- Pass, fail, blocked, and defect summaries
- CSV export for test cases and defects
- Sample project loaded once into an empty database
- Health check at `/api/health`

## Technology stack

| Layer | Tools |
| --- | --- |
| Frontend | React 18, Vite, JavaScript, HTML, CSS, React Router, Axios |
| Backend | Python, FastAPI, Pydantic, Uvicorn |
| Database | SQLite and SQLAlchemy |
| Tests | pytest |

## Architecture

The browser sends JSON requests to the FastAPI server. FastAPI validates the input, SQLAlchemy reads and writes `qa_testing.db`, and the React pages render the response. The frontend address is configured with `VITE_API_URL`, so a deployed build calls the hosted API instead of your computer.

```text
Browser (React)
    |
    |  HTTP JSON, base URL from VITE_API_URL
    v
FastAPI
    |
    v
SQLAlchemy  ->  SQLite file backend/qa_testing.db
```

## Folder structure

```text
qa-test-management-system/
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   ├── crud.py
│   ├── requirements.txt
│   ├── pytest.ini
│   ├── tests/
│   └── README.md
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── package.json
│   ├── vite.config.js
│   └── README.md
├── render.yaml
├── README.md
└── .gitignore
```

## Installation

Install both of these once:

1. Python 3.10 or newer. Check with `python --version`.
2. Node.js 18 or newer. Check with `node --version`.

The project folder is `qa-test-management-system`. Open two PowerShell windows. Use one for the backend and one for the frontend.

## Backend setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

Leave this window open. When it is ready, the API is at `http://127.0.0.1:8000`.

- Tables are created automatically.
- The database file is `backend/qa_testing.db`.
- The first start adds 1 sample project, 5 test cases, and 3 defects. Later starts do not add them again.
- API docs: `http://127.0.0.1:8000/docs`

## Frontend setup

In the second PowerShell window:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. The header should say **API connected**.

If `npm` is not recognized, install the Node.js LTS installer from [https://nodejs.org](https://nodejs.org), then close PowerShell and open it again.

This download folder name contains `&`. Windows `npm run dev` and `npm run build` can fail in that folder because `&` splits the command. From the `frontend` folder, start and build with:

```powershell
powershell -ExecutionPolicy Bypass -File .\dev.ps1
powershell -ExecutionPolicy Bypass -File .\build.ps1
```

After you move the project to a folder path that does not contain `&`, `npm run dev` and `npm run build` work normally. Render does not have this problem.

Local API address, already saved in `frontend/.env.development`:

```text
VITE_API_URL=http://127.0.0.1:8000
```

## API documentation

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Returns `{"status":"ok"}` |
| GET, POST | `/api/projects` | List or create projects |
| GET, PUT, DELETE | `/api/projects/{id}` | Read, update, or delete one project |
| GET, POST | `/api/test-cases` | List or create test cases |
| GET, PUT, DELETE | `/api/test-cases/{id}` | Read, update, or delete one test case |
| GET, POST | `/api/defects` | List or create defects |
| GET, PUT, DELETE | `/api/defects/{id}` | Read, update, or delete one defect |
| GET | `/api/dashboard` | Summary counts |
| GET | `/api/reports` | Execution and defect percentages |
| GET | `/api/reports/export/test-cases` | Test case CSV |
| GET | `/api/reports/export/defects` | Defect CSV |

List endpoints accept filters:

- Test cases: `project_id`, `search`, `status`, `priority`, `module`
- Defects: `project_id`, `search`, `severity`, `priority`, `status`
- Reports and CSV exports: `project_id`

Allowed test case statuses: Not Run, Pass, Fail, Blocked.

Allowed priorities: Low, Medium, High, Critical.

Allowed defect severities: Minor, Major, Critical.

Allowed defect statuses: Open, In Progress, Fixed, Retest, Closed, Reopened.

Empty titles and unknown status, priority, or severity values are rejected with HTTP 422. Missing records return HTTP 404. Unexpected server errors return a short message and HTTP 500, without a Python traceback.

Deleting a project also deletes its test cases and defects.

CORS allows `http://localhost:5173` and `http://127.0.0.1:5173`. Add more origins with the `CORS_ORIGINS` environment variable, separated by commas.

## Database information

SQLite is the default database. SQLAlchemy creates the tables on startup. The file is `backend/qa_testing.db`.

| Table | Important columns |
| --- | --- |
| projects | id, name, description, created_at |
| test_cases | id, project_id, title, module, priority, preconditions, test_steps, expected_result, actual_result, status, created_at, updated_at |
| defects | id, project_id, title, description, severity, priority, steps_to_reproduce, expected_result, actual_result, status, created_at, updated_at |

To start over, stop the backend and delete `qa_testing.db`. The next start creates a new file and loads the sample data again.

On a free Render disk, SQLite data can disappear when the service redeploys. That is expected for this first version. A later version can move to PostgreSQL.

## Testing instructions

Backend, from the `backend` folder:

```powershell
.\.venv\Scripts\activate
python -m pytest -q
```

The tests cover health, project CRUD, test case CRUD, defect CRUD, dashboard, reports, CSV export, validation, missing records, search, filters, and one-time seed data.

Frontend checks, with both servers running:

1. Open Dashboard, Projects, Test Cases, Defects, and Reports from the sidebar.
2. Create a project, then edit it and open it.
3. Create a test case and change its status to Pass or Fail.
4. Search and filter test cases.
5. Create a defect and change its status.
6. Search and filter defects.
7. Confirm the dashboard numbers change.
8. On Reports, export both CSV files and open them in Excel or a text editor.
9. From `frontend`, run `npm run build` and confirm it finishes without errors.

## Deployment instructions

Deploy the backend first, copy its public URL, then build the frontend with that URL.

### Backend on Render Web Service

| Setting | Value |
| --- | --- |
| Root directory | `backend` |
| Runtime | Python |
| Build command | `pip install -r requirements.txt` |
| Start command | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| Environment variable `CORS_ORIGINS` | Your frontend URL, such as `https://qa-tms-web.onrender.com` |
| Environment variable `SEED_DATA` | `1` for sample data, or `0` to start empty |

Do not type a fixed port. Render sets `PORT`.

After the service is live, open `https://YOUR-BACKEND-URL.onrender.com/api/health`. It must return `{"status":"ok"}`.

### Frontend on Render Static Site

| Setting | Value |
| --- | --- |
| Root directory | `frontend` |
| Build command | `npm install && npm run build` |
| Publish directory | `dist` |
| Environment variable `VITE_API_URL` | `https://YOUR-BACKEND-URL.onrender.com` |

Add this rewrite before the first build, or the site will be blank when someone opens a page directly:

| Source | Destination | Action |
| --- | --- | --- |
| `/*` | `/index.html` | Rewrite |

`VITE_API_URL` is read while the frontend is built. If you change it later, build the site again. Do not set it to `localhost` on Render.

`render.yaml` in the project root records the same backend service, static site, and rewrite.

## Screenshots

Add your own images after you run the app:

1. Dashboard with project, test, and defect counts
2. Projects page
3. Test cases table with status filters
4. Defect details
5. Reports page and a downloaded CSV

## Future enhancements

- Sign-in and tester roles
- PostgreSQL for hosted data that survives redeploys
- File attachments on defects
- Link a failed test case to the defect it found
- Test runs and execution history
- Email when a critical defect is opened
- Continuous integration that runs pytest and the frontend build on every push

## Resume notes

This project shows manual test design, test execution, defect tracking, REST APIs, FastAPI, React, Python, SQL, CRUD, API testing with pytest, reporting, CSV export, and deployment on Render.
