# Backend - Express Server

This backend handles patient authentication, audio uploads, and clinical data persistence.

## Quick Start

```bash
cd backend
npm install
npm run dev
```

Server runs at `http://localhost:4000`

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with patient ID and password
  ```json
  {
    "patientId": "PATIENT001",
    "password": "123456"
  }
  ```

### Clinical Data
- `POST /api/clinical/upload` - Upload audio file (multipart/form-data)
- `POST /api/clinical/save` - Save transcription and structured data
- `GET /api/clinical/records` - Get patient's clinical records
- `GET /api/health` - Health check

## Authentication Model

- **Patient ID** = login identifier
- **Password** = account verification
- **JWT Token** = session management (8-hour expiry)

All authenticated endpoints require:
```
Authorization: Bearer <your-jwt-token>
```

## Environment Configuration

Create a `.env` file in the backend directory:

```env
# Server
PORT=4000
NODE_ENV=development

# JWT
JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRY=8h

# CORS
FRONTEND_ORIGIN=http://localhost:5173

# Database (currently file-based)
DB_TYPE=file
DB_PATH=./data/state.json

# Demo Credentials
DEMO_PATIENT_ID=PATIENT001
DEMO_PASSWORD=123456

# Logging
LOG_LEVEL=info

# Transcription (placeholder for future integration)
# TRANSCRIPTION_API_KEY=your-api-key
# TRANSCRIPTION_SERVICE=google
```

## Database Integration

Currently uses file-based persistence (`backend/data/state.json`).

To integrate your own database:

1. Update `src/config/db.js`:
   - `findUserByPatientId()` - Query users table
   - `createUser()` - Insert new user
   - `saveClinicalRecord()` - Insert clinical record
   - `listClinicalRecordsByPatientId()` - Query patient records

2. Update `DB_TYPE` and connection details in `.env`

Example for MongoDB:
```env
DB_TYPE=mongodb
DB_CONNECTION_STRING=mongodb://user:pass@host/database
```

## Running

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm run start
```

## File Structure

```
src/
├── server.js              # Entry point
├── app.js                 # Express setup & middleware
├── config/
│   ├── env.js            # Environment parsing
│   └── db.js             # Database layer
├── middleware/
│   ├── auth.js           # JWT verification
│   ├── asyncHandler.js   # Error wrapper
│   └── errorHandler.js   # Global error handler
├── controllers/
│   ├── auth.controller.js     # Login logic
│   └── clinical.controller.js # Audio & data logic
├── services/
│   └── clinical.service.js    # Audio processing
└── routes/
    ├── auth.routes.js        # Auth endpoints
    └── clinical.routes.js    # Clinical endpoints
```

## Customization

### Add Your Database

Replace the file-based DB in `src/config/db.js` with your database calls (MongoDB, PostgreSQL, MySQL, etc.)

### Add Transcription Service

Implement real transcription in `src/services/clinical.service.js` using:
- Google Cloud Speech-to-Text
- AWS Transcribe
- Azure Speech Services
- Local transcription engine

