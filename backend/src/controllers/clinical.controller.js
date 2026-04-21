import { asyncHandler } from '../middleware/asyncHandler.js'
import {
  emptyStructuredData,
  extractStructuredDataFromTranscription,
  processClinicalSession,
  processClinicalUpload,
} from '../services/clinical.service.js'
import { listClinicalRecordsByPatientId, saveClinicalRecord } from '../config/db.js'

const resolveTargetPatientId = (req) => {
  const bodyPatientId = typeof req.body?.patientId === 'string' ? req.body.patientId.trim() : ''
  const queryPatientId = typeof req.query?.patientId === 'string' ? req.query.patientId.trim() : ''
  const requestedPatientId = bodyPatientId || queryPatientId
  const canActForOtherPatient = ['doctor', 'admin'].includes(req.user?.role)

  if (canActForOtherPatient && requestedPatientId) {
    return requestedPatientId
  }

  return req.user.patientId
}

export const uploadClinicalAudio = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Audio file is required.' })
  }

  const targetPatientId = resolveTargetPatientId(req)

  const result = await processClinicalUpload({
    file: req.file,
    patientId: targetPatientId,
  })

  await saveClinicalRecord({
    patientId: targetPatientId,
    type: 'audio_upload',
    transcription: result.transcription,
    audio: result.audio,
    processing: result.processing,
    structuredData: result.structuredData,
    metadata: {
      uploadedFileName: result.fileName,
      fileSize: Number(req.file.size || 0),
      processingTime: Number(result.processing?.durationMs || 0),
      initiatedBy: req.user.patientId,
      initiatedByRole: req.user.role,
    },
  })

  return res.json(result)
})

export const processClinicalCapture = asyncHandler(async (req, res) => {
  const {
    sourceType = 'audio_upload',
    realtimeTranscription = '',
    transcriptionProvider = 'realtime_stt_agent',
    groqApiKey = '',
    autoSave = true,
  } = req.body || {}

  if (!req.file && !`${realtimeTranscription || ''}`.trim()) {
    const error = new Error('Either an audio file or realtime transcription text is required.')
    error.statusCode = 400
    throw error
  }

  const targetPatientId = resolveTargetPatientId(req)
  const result = await processClinicalSession({
    file: req.file,
    patientId: targetPatientId,
    sourceType,
    realtimeTranscription,
    transcriptionProvider,
    groqApiKey,
  })

  let savedRecord = null
  if (autoSave) {
    savedRecord = await saveClinicalRecord({
      patientId: targetPatientId,
      type: result.sourceType,
      transcription: result.transcription,
      audio: result.audio,
      processing: result.processing,
      structuredData: result.structuredData,
      metadata: {
        uploadedFileName: result.fileName,
        fileSize: Number(req.file?.size || 0),
        processingTime: Number(result.processing?.durationMs || 0),
        initiatedBy: req.user.patientId,
        initiatedByRole: req.user.role,
        sourceType: result.sourceType,
      },
    })
  }

  return res.json({
    ...result,
    autoSaved: Boolean(autoSave),
    record: savedRecord,
  })
})

export const saveClinicalData = asyncHandler(async (req, res) => {
  const { transcription = '', structuredData = emptyStructuredData } = req.body || {}
  const targetPatientId = resolveTargetPatientId(req)

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
    patientId: targetPatientId,
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
    metadata: {
      initiatedBy: req.user.patientId,
      initiatedByRole: req.user.role,
      sourceType: 'text_note',
    },
  })

  return res.json({
    message: 'Clinical data saved successfully.',
    record: savedRecord,
  })
})

export const getClinicalRecords = asyncHandler(async (req, res) => {
  const targetPatientId = resolveTargetPatientId(req)
  const records = await listClinicalRecordsByPatientId(targetPatientId)
  return res.json({ records })
})
