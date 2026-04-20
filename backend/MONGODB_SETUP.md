# MongoDB Database Configuration

To use MongoDB with this backend, follow these steps:

## 1. Update `backend/.env`

```env
# Database Configuration
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/database-name?retryWrites=true&w=majority
DB_TYPE=mongodb
```

Replace with your actual MongoDB connection string from MongoDB Atlas.

## 2. Replace `backend/src/config/db.js`

Use the MongoDB version we created (`db-mongodb.js`):

```bash
# Option 1: Copy MongoDB version
cp backend/src/config/db-mongodb.js backend/src/config/db.js
```

Or manually replace the content of `backend/src/config/db.js` with `db-mongodb.js`.

## 3. Install MongoDB Driver

```bash
cd backend
npm install mongodb
```

## 4. Start the Backend

```bash
npm run dev
```

The backend will:
- Connect to your MongoDB cluster
- Create collections if they don't exist
- Create indexes for performance
- Seed the demo user automatically

## Collections Created

1. **users** - Stores patient accounts
   ```javascript
   {
     _id: ObjectId,
     patientId: "PATIENT001",
     name: "Patient Name",
     role: "patient",
     passwordHash: "bcrypt-hash",
     createdAt: Date
   }
   ```

2. **records** - Stores clinical data
   ```javascript
   {
     _id: ObjectId,
     patientId: "PATIENT001",
     transcription: "Medical notes...",
     structuredData: { symptoms: [...], diagnosis: "...", ... },
     savedAt: Date,
     createdAt: Date
   }
   ```

## API Works the Same

- Login: `POST /api/auth/login`
- Upload: `POST /api/clinical/upload`
- Save: `POST /api/clinical/save`
- Records: `GET /api/clinical/records`

No changes needed in frontend or API routes!

## Connection String Format

### MongoDB Atlas (Cloud)
```
mongodb+srv://username:password@cluster.mongodb.net/database-name?retryWrites=true&w=majority
```

### MongoDB Local
```
mongodb://localhost:27017/database-name
```

### MongoDB Atlas Connection String Steps

1. Go to MongoDB Atlas → Your Cluster
2. Click "Connect"
3. Select "Connect your application"
4. Choose Node.js driver
5. Copy the connection string
6. Replace `<password>` with your database password
7. Paste into `DATABASE_URL` in `.env`

---

**Need help with MongoDB Atlas?** Check [MongoDB Atlas Connection Guide](https://docs.mongodb.com/guides/cloud/connectionstring/)
