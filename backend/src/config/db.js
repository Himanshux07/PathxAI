import bcrypt from 'bcryptjs'
import { MongoClient } from 'mongodb'
import { env } from './env.js'

let mongoClient = null
let db = null

const getDatabase = async () => {
  if (!db) {
    if (!env.databaseUrl) {
      throw new Error('DATABASE_URL is not configured in backend/.env')
    }

    mongoClient = new MongoClient(env.databaseUrl, {
      serverSelectionTimeoutMS: 5000,
    })

    await mongoClient.connect()
    db = mongoClient.db()

    await db.collection('users').createIndex({ patientId: 1 }, { unique: true })
    await db.collection('records').createIndex({ patientId: 1 })

    console.log('MongoDB connected successfully')
  }

  return db
}

const seedDemoUser = async (database) => {
  const usersCollection = database.collection('users')
  const existingDemo = await usersCollection.findOne({ patientId: env.demoPatientId })

  if (existingDemo) {
    return
  }

  const passwordHash = await bcrypt.hash(env.demoPassword, 10)
  await usersCollection.insertOne({
    patientId: env.demoPatientId,
    name: 'Demo Patient',
    role: 'patient',
    passwordHash,
    createdAt: new Date(),
  })

  console.log(`Demo user seeded: ${env.demoPatientId}`)
}

export const initializeDatabase = async () => {
  const database = await getDatabase()
  await seedDemoUser(database)
}

export const closeDatabase = async () => {
  if (mongoClient) {
    await mongoClient.close()
    mongoClient = null
    db = null
  }
}

export const findUserByPatientId = async (patientId) => {
  const database = await getDatabase()
  return database
    .collection('users')
    .findOne({ patientId: { $regex: `^${patientId}$`, $options: 'i' } })
}

export const createUser = async ({ patientId, name, password, role = 'patient' }) => {
  const database = await getDatabase()
  const usersCollection = database.collection('users')

  const existingUser = await usersCollection.findOne({ patientId: { $regex: `^${patientId}$`, $options: 'i' } })
  if (existingUser) {
    return existingUser
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const result = await usersCollection.insertOne({
    patientId,
    name: name || patientId,
    role,
    passwordHash,
    createdAt: new Date(),
  })

  return {
    _id: result.insertedId,
    patientId,
    name: name || patientId,
    role,
    createdAt: new Date(),
  }
}

export const saveClinicalRecord = async (record) => {
  const database = await getDatabase()
  const recordsCollection = database.collection('records')

  const result = await recordsCollection.insertOne({
    patientId: record.patientId,
    transcription: record.transcription || '',
    structuredData: record.structuredData || {},
    savedAt: record.savedAt || new Date(),
    createdAt: new Date(),
  })

  return {
    _id: result.insertedId,
    ...record,
    createdAt: new Date(),
  }
}

export const listClinicalRecordsByPatientId = async (patientId) => {
  const database = await getDatabase()
  return database
    .collection('records')
    .find({ patientId })
    .sort({ createdAt: -1 })
    .toArray()
}
