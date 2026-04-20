import bcrypt from 'bcryptjs'
import { MongoClient, ObjectId } from 'mongodb'
import { env } from './env.js'

let mongoClient = null
let db = null

const getDatabase = async () => {
  if (!db) {
    if (!env.databaseUrl) {
      throw new Error('DATABASE_URL is not configured in .env')
    }

    mongoClient = new MongoClient(env.databaseUrl, {
      serverSelectionTimeoutMS: 5000,
    })

    await mongoClient.connect()
    db = mongoClient.db()

    // Create indexes for performance
    await db.collection('users').createIndex({ patientId: 1 })
    await db.collection('records').createIndex({ patientId: 1 })

    console.log('MongoDB connected successfully')
  }

  return db
}

export const closeDatabase = async () => {
  if (mongoClient) {
    await mongoClient.close()
    db = null
    mongoClient = null
  }
}

const seedDemoUser = async (database) => {
  const usersCollection = database.collection('users')
  const existingDemo = await usersCollection.findOne({ patientId: env.demoPatientId })

  if (!existingDemo) {
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
}

export const findUserByPatientId = async (patientId) => {
  try {
    const database = await getDatabase()
    const user = await database.collection('users').findOne({ patientId: { $regex: `^${patientId}$`, $options: 'i' } })
    return user || null
  } catch (error) {
    console.error('Error finding user:', error)
    throw error
  }
}

export const createUser = async ({ patientId, name, password, role = 'patient' }) => {
  try {
    const database = await getDatabase()
    const usersCollection = database.collection('users')

    // Check if user already exists
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
  } catch (error) {
    console.error('Error creating user:', error)
    throw error
  }
}

export const saveClinicalRecord = async (record) => {
  try {
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
  } catch (error) {
    console.error('Error saving clinical record:', error)
    throw error
  }
}

export const listClinicalRecordsByPatientId = async (patientId) => {
  try {
    const database = await getDatabase()
    const records = await database
      .collection('records')
      .find({ patientId })
      .sort({ createdAt: -1 })
      .toArray()

    return records
  } catch (error) {
    console.error('Error listing records:', error)
    throw error
  }
}

// Initialize database on first call
export const initializeDatabase = async () => {
  try {
    const database = await getDatabase()
    await seedDemoUser(database)
  } catch (error) {
    console.error('Error initializing database:', error)
    throw error
  }
}
