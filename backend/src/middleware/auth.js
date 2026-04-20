import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

  if (!token) {
    return res.status(401).json({ message: 'Authentication token is required.' })
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret)
    req.user = {
      patientId: decoded.patientId,
      role: decoded.role,
      name: decoded.name,
    }
    return next()
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired authentication token.' })
  }
}
