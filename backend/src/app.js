import cors from 'cors'
import express from 'express'
import morgan from 'morgan'
import { env } from './config/env.js'
import authRouter from './routes/auth.routes.js'
import clinicalRouter from './routes/clinical.routes.js'
import { errorHandler } from './middleware/errorHandler.js'

const app = express()

app.use(cors({ origin: env.frontendOrigin, credentials: true }))
app.use(express.json({ limit: '2mb' }))
app.use(morgan('dev'))

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/auth', authRouter)
app.use('/api/clinical', clinicalRouter)

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found.' })
})

app.use(errorHandler)

export default app
