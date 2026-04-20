import mongoose from 'mongoose'
import { User, ClinicalRecord } from '../models/index.js'
import { env } from './env.js'

let isConnected = false

export const connectDatabase = async () => {
  if (isConnected) {
    return mongoose.connection
  }

  if (!env.databaseUrl) {
    throw new Error('DATABASE_URL is not configured in backend/.env')
  }

  try {
    await mongoose.connect(env.databaseUrl, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    })

    isConnected = true
    console.log('✅ MongoDB connected successfully via Mongoose')
    return mongoose.connection
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message)
    throw error
  }
}

export const closeDatabase = async () => {
  if (isConnected) {
    await mongoose.disconnect()
    isConnected = false
    console.log('MongoDB connection closed')
  }
}

export const seedDemoUser = async () => {
  try {
    const existingDemo = await User.findOne({ patientId: env.demoPatientId })

    if (existingDemo) {
      return existingDemo
    }

    const newUser = new User({
      patientId: env.demoPatientId,
      name: 'Demo Patient',
      email: 'demo@pathxai.local',
      passwordHash: env.demoPassword,
      role: 'patient',
      status: 'active',
    })

    await newUser.save()
    console.log(`✅ Demo user seeded: ${env.demoPatientId}`)
    return newUser
  } catch (error) {
    console.error('Error seeding demo user:', error.message)
    throw error
  }
}

export const initializeDatabase = async () => {
  await connectDatabase()
  await seedDemoUser()
}

export const findUserByPatientId = async (patientId) => {
  try {
    return await User.findOne({ patientId: { $regex: `^${patientId}$`, $options: 'i' } }).select('+passwordHash')
  } catch (error) {
    console.error('Error finding user:', error.message)
    throw error
  }
}

export const createUser = async ({ patientId, name, password, email = '', role = 'patient' }) => {
  try {
    const existingUser = await User.findOne({ patientId: { $regex: `^${patientId}$`, $options: 'i' } })
    if (existingUser) {
      throw new Error('Patient ID already exists')
    }

    const newUser = new User({
      patientId,
      name: name || patientId,
      email,
      passwordHash: password,
      role,
      status: 'active',
    })

    await newUser.save()
    return newUser.toJSON()
  } catch (error) {
    console.error('Error creating user:', error.message)
    throw error
  }
}

export const saveClinicalRecord = async (record) => {
  try {
    const newRecord = new ClinicalRecord({
      patientId: record.patientId,
      transcription: record.transcription || '',
      type: record.type || 'audio_upload',
      audio: record.audio || {},
      processing: record.processing || {},
      structuredData: record.structuredData || {},
      metadata: record.metadata || {},
    })

    await newRecord.save()
    return newRecord.toJSON()
  } catch (error) {
    console.error('Error saving clinical record:', error.message)
    throw error
  }
}

export const listClinicalRecordsByPatientId = async (patientId) => {
  try {
    return await ClinicalRecord.find({ patientId }).sort({ createdAt: -1 }).lean()
  } catch (error) {
    console.error('Error fetching clinical records:', error.message)
    throw error
  }
}
