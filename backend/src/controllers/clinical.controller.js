import { asyncHandler } from '../middleware/asyncHandler.js'
import {
  emptyStructuredData,
  extractStructuredDataFromTranscription,
  processClinicalUpload,
} from '../services/clinical.service.js'
import { listClinicalRecordsByPatientId, saveClinicalRecord } from '../config/db.js'

export const uploadClinicalAudio = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Audio file is required.' })
  }

  const result = await processClinicalUpload({
    file: req.file,
    patientId: req.user.patientId,
  })

  await saveClinicalRecord({
    patientId: req.user.patientId,
    type: 'audio_upload',
    fileName: result.fileName,
    fileSize: result.fileSize,
    transcription: result.transcription,
    structuredData: result.structuredData,
  })

  return res.json(result)
})

export const saveClinicalData = asyncHandler(async (req, res) => {
  const { transcription = '', structuredData = emptyStructuredData } = req.body || {}
  const normalizedStructuredData =
    structuredData && Object.values(structuredData).some((value) => (Array.isArray(value) ? value.length > 0 : value !== ''))
      ? structuredData
      : extractStructuredDataFromTranscription(transcription)

  const savedRecord = await saveClinicalRecord({
    patientId: req.user.patientId,
    type: 'clinical_note',
    transcription,
    structuredData: normalizedStructuredData,
  })

  return res.json({
    message: 'Clinical data saved successfully.',
    record: savedRecord,
  })
})

export const getClinicalRecords = asyncHandler(async (req, res) => {
  const records = await listClinicalRecordsByPatientId(req.user.patientId)
  return res.json({ records })
})
