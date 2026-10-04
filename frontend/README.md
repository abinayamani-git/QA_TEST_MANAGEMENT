# Frontend

React application for the QA workspace. The page talks to the backend through `VITE_API_URL`.

Local development already has this value in `.env.development`:

```text
VITE_API_URL=http://127.0.0.1:8000
```

That file is used only by `npm run dev`. A production build does not fall back to localhost. Set `VITE_API_URL` to the public backend URL before `npm run build`.

## Run locally

From this folder, with Node.js 18 or newer:

```powershell
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

If the project path contains `&`, run `powershell -ExecutionPolicy Bypass -File .\dev.ps1` instead of `npm run dev`, and `powershell -ExecutionPolicy Bypass -File .\build.ps1` instead of `npm run build`.

## Production build

```powershell
npm run build
```

Vite writes the site to `dist`. Direct links such as `/projects` need the host to rewrite every path to `/index.html`. The root `render.yaml` includes that rewrite.
