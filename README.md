# Functiomed Frontend

React + Vite frontend for Functiomed medical platform.

## Setup

```bash
cp .env.example .env
# Edit .env with your values

npm install
npm run dev
```

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_API_URL` | FastAPI backend URL (default: `/api` via Vite proxy) |
| `VITE_LIVEKIT_URL` | LiveKit server WebSocket URL |

## Pages

| Route | Description |
|---|---|
| `/chat` | Voice agent — LiveKit session + booking status panel |
| `/admin` | Dashboard with stats and charts |
| `/admin/bookings` | Bookings CRUD — filter, edit, cancel, delete |
| `/admin/doctors` | Doctors CRUD + service assignment manager |
| `/admin/services` | Services CRUD |
| `/admin/slots` | Slots CRUD — filter by doctor/service, toggle availability |
| `/admin/pdfs` | PDF upload/delete — drag-and-drop |

## Backend Requirements

Expects the following endpoints to exist on your FastAPI backend:

- `GET/POST/PATCH/DELETE /bookings/...`
- `GET/POST/PATCH/DELETE /clinic/services/...`
- `GET/POST/PATCH/DELETE /clinic/doctors/...`
- `GET/POST/PATCH/DELETE /clinic/slots/...`
- `GET/POST/DELETE /pdfs/...`
- `GET /livekit/token?room=...&identity=...`

All proxied through `/api` in development.
