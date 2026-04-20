import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { findUserByPatientId } from '../config/db.js'

export const login = asyncHandler(async (req, res) => {
  const { patientId, password } = req.body || {}

  if (!patientId || !password) {
    return res.status(400).json({ message: 'Patient ID and password are required.' })
  }

  const user = await findUserByPatientId(patientId)

  if (!user) {
    return res.status(401).json({ message: 'Invalid patient ID or password.' })
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash)

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
