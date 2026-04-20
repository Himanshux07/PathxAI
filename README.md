# PartexAI - Medical Voice Assistant

A comprehensive full-stack application for voice-driven clinical data extraction in Indian hospitals, supporting multilingual conversations (English, Hindi, Marathi).

## Project Structure

```
PathxAI/
├── frontend/             # React frontend (Vite)
│   ├── src/              # React components and styles
│   ├── package.json
│   ├── vite.config.js
│   ├── .env              # Frontend environment variables
│   └── README.md
│
└── backend/              # Express backend
    ├── src/              # Routes, controllers, services
    ├── data/             # File-based persistence
    ├── package.json
    ├── .env              # Backend environment variables
    └── README.md
```

## Quick Start

### Prerequisites
- Node.js 18+ and npm

### Run Both (Development)

From the root directory:

```bash
# Install dependencies for all
npm run install:all

# Run both in development mode
npm run dev:all
```

### Run Individually

**Frontend:**
```bash
cd frontend
npm run dev
```
Access at `http://localhost:5173`

**Backend:**
```bash
cd backend
npm run dev
```
API available at `http://localhost:4000`

## Features

- **Voice Recording**: Real-time audio capture and file upload
- **Multilingual Support**: English, Hindi, Marathi conversation processing
- **Patient-ID Authentication**: JWT-based login with patient ID as identifier
- **Structured Data Extraction**: Converts speech to structured JSON clinical notes
- **Dark/Light Theme**: Theme toggle with localStorage persistence
- **Responsive UI**: Mobile-friendly interface built with React + Tailwind CSS
- **Backend API**: RESTful endpoints with authentication middleware

## Authentication

The system uses patient ID as the account identifier:
- Login requires a **Patient ID** and **Password**
- Successful login returns a JWT token (8-hour expiry)
- Token is sent in `Authorization: Bearer <token>` header for authenticated requests
- Demo credentials are seeded on first backend startup (see `server/.env.example`)

## Development Notes

### Frontend-Backend Communication

The frontend proxies API calls via Vite:
- Frontend endpoint: `/api`
- Backend URL: `http://localhost:4000` (dev only)

### Database Integration

Currently uses file-based persistence (`backend/data/state.json`). To integrate your own database:

1. Update `backend/src/config/db.js` functions:
   - `findUserByPatientId()`
   - `createUser()`
   - `saveClinicalRecord()`
   - `listClinicalRecordsByPatientId()`

2. Update `backend/.env` with your database connection string

### Environment Variables

**Backend** (`backend/.env`):
```
PORT=4000
JWT_SECRET=your-secret-key
FRONTEND_ORIGIN=http://localhost:5173
DB_TYPE=file
DEMO_PATIENT_ID=PATIENT001
DEMO_PASSWORD=123456
```

**Frontend** (`frontend/.env`, optional):
```
VITE_API_BASE_URL=/api
```

## Documentation

- [client/README.md](./client/README.md) - Frontend setup details
- [server/README.md](./server/README.md) - Backend API documentation

---

**License:** MIT
