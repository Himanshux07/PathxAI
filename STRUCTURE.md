# PathxAI Project Structure

This document describes the organized file structure with separate frontend and backend directories.

## Directory Layout

```
PathxAI/
│
├── frontend/                        # React Frontend (Vite)
│   ├── src/
│   │   ├── App.jsx                  # Main React component with full UI
│   │   ├── main.jsx                 # React entry point
│   │   └── index.css                # Tailwind and global styles
│   ├── index.html                   # HTML template
│   ├── package.json                 # Frontend dependencies
│   ├── vite.config.js               # Vite configuration with API proxy
│   ├── tailwind.config.js           # Tailwind CSS config (dark mode: class)
│   ├── postcss.config.js            # PostCSS plugins
│   ├── eslint.config.js             # ESLint rules
│   ├── .env                         # Frontend environment variables
│   └── README.md                    # Frontend setup guide
│
├── backend/                         # Express Backend
│   ├── src/
│   │   ├── server.js                # Express app entry point
│   │   ├── app.js                   # Express initialization & middleware
│   │   ├── config/
│   │   │   ├── env.js               # Environment variable parsing
│   │   │   └── db.js                # File-based persistence layer
│   │   ├── middleware/
│   │   │   ├── auth.js              # JWT verification middleware
│   │   │   ├── asyncHandler.js      # Async error wrapper
│   │   │   └── errorHandler.js      # Global error handler
│   │   ├── controllers/
│   │   │   ├── auth.controller.js   # Login endpoint logic
│   │   │   └── clinical.controller.js # Audio & data endpoints
│   │   ├── services/
│   │   │   └── clinical.service.js  # Audio processing (placeholder)
│   │   └── routes/
│   │       ├── auth.routes.js       # Authentication routes
│   │       └── clinical.routes.js   # Clinical data routes
│   ├── data/
│   │   └── state.json               # File-based user & record storage (git-ignored)
│   ├── pack                         # Backend environment variables
│   ├── .env.example                 # Environment template (reference)
│   └── README.md                    # Backend API documentation
│
├── README.md                        # Root project documentation
├── package.json                     # Root scripts for both projects
├── .gitignore                       # Git ignore rules
└── STRUCTURE.md                     # This file
└── package-root.json                # Reference file (can be deleted)
```

## Key Separation Points

### Frontend (`frontend/`)
- Handles all UI/UX
- Authentication: Stores JWT token in localStorage
- API Communication: Proxied via Vite to `/api`
- Theme Management: Dark mode via Tailwind CSS class
- Build: `npm run build` in frontend directory
- Environment: `frontend/.env` for API configuration

### Backend (`backend/`)
- Handles all business logic and data persistence
- Authentication: Issues JWT tokens
- API Routes: All endpoints under `/api`
- Database: Currently file-based, replaceable with custom DB
- Environment: `backend/.env` for server and database config

## Running Both Projects

### Development Mode

**Option 1: Run from root (parallel)**
```bash
npm run install:all    # Install all dependencies
npm run dev:all        # Start both frontend and backend
```

**Option 2: Run individually**
```bash
cd frontend && npm run dev     # Terminal 1 - Frontend at :5173
cd backend && npm run dev      # Terminal 2 - Backend at :4000
```

### Production Build

**Frontend:**
```bash
cd frontend && npm run build
```
Output: `frontend/dist/` (ready for deployment)

**Backend:**
```bash
cd backend && npm run start
```

## How Frontend and Backend Communicate

1. **Login Flow:**
   - Frontend: POST to `/api/auth/login` with `{ patientId, password }`
   - Backend: Verifies credentials, returns `{ token, user }`
   - Frontend: Stores token in localStorage

2. **Authenticated Requests:**
   - Frontend: All `/api/*` requests include `Authorization: Bearer <token>`
   - Backend: Middleware validates token, extracts patient data

3. **Data Upload:**
   - Frontend: POST multipart form with audio file to `/api/clinical/upload`
   - Backend: Processes audio, returns transcription + structured JSON

4. **Data Persistence:**
   - Frontend: POST JSON to `/api/clinical/save`
   - Backend: Saves to database (currently `state.json`)

## Configuration
backend/.env`)

```env
PORT=4000
NODE_ENV=development
JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRY=8h
FRONTEND_ORIGIN=http://localhost:5173
DB_TYPE=file
DB_PATH=./data/state.json
DEMO_PATIENT_ID=PATIENT001
DEMO_PASSWORD=123456
LOG_LEVEL=info
# TRANSCRIPTION_API_KEY=your-key-here
# TRANSCRIPTION_SERVICE=google
```

### Frontend Environment (`frontend/.env`, optional)

```env
VITE_API_BASE_URL=/api
```

## Next Steps

1. **Database Integration:** Replace `backend/src/config/db.js` with your database calls
2. **Transcription Engine:** Implement real transcription in `backend/src/services/clinical.service.js`
3. **Environment Setup:** Fill in `backend/.env` and `frontend/.env` with real values
4. **Deployment:** Deploy frontend build artifacts and backend server separately

---

For detailed setup: See [frontend/README.md](./frontend/README.md) and [backend/README.md](./backend
For detailed setup: See [client/README.md](./client/README.md) and [server/README.md](./server/README.md)
