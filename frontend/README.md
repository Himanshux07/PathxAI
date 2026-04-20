# Frontend - React + Vite

This is the client-side application for the Clinical Voice Assistant.

## Quick Start

```bash
cd frontend
npm install
npm run dev
```

Access at `http://localhost:5173`

## Build

```bash
npm run build
```

## Environment

The frontend proxies API calls to the backend at `/api`. During development, this points to `http://localhost:4000`.

If you need to change the backend URL, set `VITE_API_BASE_URL` environment variable in `.env`

### Configure `.env`

Create a `.env` file in the frontend directory:
```env
VITE_API_BASE_URL=/api
```

For production builds:
```bash
VITE_API_BASE_URL=https://api.yourdomain.com npm run build
```

