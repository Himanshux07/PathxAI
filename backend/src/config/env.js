export const env = {
  port: Number.parseInt(process.env.PORT || '4000', 10),
  jwtSecret: process.env.JWT_SECRET || 'change-this-secret',
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL || '',
  dbType: process.env.DB_TYPE || 'file',
  demoPatientId: process.env.DEMO_PATIENT_ID || 'PATIENT001',
  demoPassword: process.env.DEMO_PASSWORD || '123456',
}
