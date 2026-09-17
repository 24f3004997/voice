# VoxShield frontend

This is the React dashboard for uploading one audio file and displaying exactly
what the FastAPI backend returns.

## Run it

From this `frontend` folder:

```powershell
npm install
npm run dev
```

Open the address Vite prints (normally `http://localhost:5173`). The included
Vite proxy sends `/api/*` requests to `http://127.0.0.1:8000`, so start the
backend first.

## What the UI deliberately does

- validates supported file extensions and the 25 MB limit before upload;
- shows loading and server-error states;
- displays a probability and risk only when the backend returns actual values;
- marks the current development detector as **No model output**, rather than
  inventing a genuine/synthetic result.
