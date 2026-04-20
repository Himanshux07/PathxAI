import 'dotenv/config'
import app from './app.js'
import { env } from './config/env.js'
import { initializeDatabase } from './config/db.js'

const startServer = async () => {
  await initializeDatabase()

  app.listen(env.port, () => {
    console.log(`Server listening on http://localhost:${env.port}`)
  })
}

startServer().catch((error) => {
  console.error('Failed to start server:', error)
  process.exit(1)
})
