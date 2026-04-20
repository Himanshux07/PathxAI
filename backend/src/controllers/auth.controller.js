import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { findUserByPatientId, createUser } from '../config/db.js'

export const register = asyncHandler(async (req, res) => {
  const { patientId, name, password, passwordConfirm } = req.body || {}

  if (!patientId || !name || !password || !passwordConfirm) {
    return res.status(400).json({ message: 'Patient ID, name, password, and password confirmation are required.' })
  }

  if (patientId.trim().length < 3) {
    return res.status(400).json({ message: 'Patient ID must be at least 3 characters long.' })
  }

  if (name.trim().length < 2) {
    return res.status(400).json({ message: 'Name must be at least 2 characters long.' })
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long.' })
  }

  if (password !== passwordConfirm) {
    return res.status(400).json({ message: 'Passwords do not match.' })
  }

  const existingUser = await findUserByPatientId(patientId)
  if (existingUser) {
    return res.status(409).json({ message: 'Patient ID already exists. Please use a different Patient ID.' })
  }

  const user = await createUser({
    patientId: patientId.trim(),
    name: name.trim(),
    password,
    role: 'patient',
  })

  const token = jwt.sign(
    {
      patientId: user.patientId,
      role: user.role,
      name: user.name,
    },
    env.jwtSecret,
    { expiresIn: '8h' },
  )

  return res.status(201).json({
    token,
    user: {
      patientId: user.patientId,
      name: user.name,
      role: user.role,
    },
  })
})

export const login = asyncHandler(async (req, res) => {
  const { patientId, password } = req.body || {}

  if (!patientId || !password) {
    return res.status(400).json({ message: 'Patient ID and password are required.' })
  }

  const user = await findUserByPatientId(patientId)

  if (!user) {
    return res.status(401).json({ message: 'Invalid patient ID or password.' })
  }

  const passwordMatches = await user.comparePassword(password)

  if (!passwordMatches) {
    return res.status(401).json({ message: 'Invalid patient ID or password.' })
  }

  const token = jwt.sign(
    {
      patientId: user.patientId,
      role: user.role,
      name: user.name,
    },
    env.jwtSecret,
    { expiresIn: '8h' },
  )

  return res.json({
    token,
    user: {
      patientId: user.patientId,
      name: user.name,
      role: user.role,
    },
  })
})
