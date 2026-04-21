import { Router } from 'express'
import multer from 'multer'
import { requireAuth } from '../middleware/auth.js'
import { getClinicalRecords, processClinicalCapture, saveClinicalData, uploadClinicalAudio } from '../controllers/clinical.controller.js'

const clinicalRouter = Router()
const upload = multer({ storage: multer.memoryStorage() })

clinicalRouter.use(requireAuth)
clinicalRouter.post('/upload', upload.single('audio'), uploadClinicalAudio)
clinicalRouter.post('/process', upload.single('audio'), processClinicalCapture)
clinicalRouter.post('/save', saveClinicalData)
clinicalRouter.get('/records', getClinicalRecords)

export default clinicalRouter
