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
    transcription: result.transcription,
    audio: result.audio,
    processing: result.processing,
    structuredData: result.structuredData,
    metadata: {
      uploadedFileName: result.fileName,
      fileSize: Number(req.file.size || 0),
      processingTime: Number(result.processing?.durationMs || 0),
    },
  })

  return res.json(result)
})

export const saveClinicalData = asyncHandler(async (req, res) => {
  const { transcription = '', structuredData = emptyStructuredData } = req.body || {}

  let parsedStructuredData = structuredData
  if (typeof structuredData === 'string') {
    try {
      parsedStructuredData = JSON.parse(structuredData)
    } catch {
      const error = new Error('Invalid structured JSON. Please provide valid JSON data.')
      error.statusCode = 400
      throw error
    }
  }

  if (!parsedStructuredData || typeof parsedStructuredData !== 'object' || Array.isArray(parsedStructuredData)) {
    const error = new Error('Invalid structured JSON object.')
    error.statusCode = 400
    throw error
  }

  const normalizedStructuredData =
    parsedStructuredData &&
    Object.values(parsedStructuredData).some((value) => (Array.isArray(value) ? value.length > 0 : value !== ''))
      ? parsedStructuredData
      : extractStructuredDataFromTranscription(transcription)

  const savedRecord = await saveClinicalRecord({
    patientId: req.user.patientId,
    type: 'text_note',
    transcription,
    processing: {
      status: 'structured',
      transcriptionProvider: 'manual_or_existing',
      aiProvider: 'manual_or_rule_based',
      durationMs: 0,
      errorMessage: '',
    },
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
