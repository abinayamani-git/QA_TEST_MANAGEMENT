# Backend

FastAPI service for projects, test cases, defects, dashboard statistics, and CSV reports. The SQLite file `qa_testing.db` is created in this folder the first time the server starts. You do not create tables yourself.

## Run locally

From this folder in PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

The API listens on `http://127.0.0.1:8000`. Interactive docs are at `http://127.0.0.1:8000/docs`.

## Tests

```powershell
.\.venv\Scripts\python.exe -m pytest -q
```

Tests use a temporary in-memory database and do not change `qa_testing.db`.

## Production start

```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

Set `CORS_ORIGINS` to the deployed frontend origin, for example `https://your-frontend.onrender.com`. Local origins `http://localhost:5173` and `http://127.0.0.1:5173` are always allowed.

Set `SEED_DATA=0` to skip the sample project. The sample is inserted only when the database has no projects.
