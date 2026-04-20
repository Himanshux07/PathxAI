const EMPTY_STRUCTURED_DATA = {
  language_detected: '',
  symptoms: [],
  duration: '',
  severity: '',
  diagnosis: '',
  medications: [],
  additional_notes: '',
  missing_information: [],
}

const formatFileSize = (bytes) => {
  if (!bytes) {
    return '0 B'
  }

  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }

  return `${size.toFixed(size < 10 && unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`
}

export const processClinicalUpload = async ({ file, patientId }) => {
  const fileName = file?.originalname || 'uploaded-audio'
  const fileSize = formatFileSize(file?.size || 0)

  return {
    transcription: `Audio file ${fileName} received for patient ${patientId}. Connect your transcription engine in server/src/services/clinical.service.js.`,
    structuredData: {
      ...EMPTY_STRUCTURED_DATA,
      additional_notes: `Uploaded file ${fileName} (${fileSize}). Backend pipeline is ready for transcription integration.`,
      missing_information: ['backend transcription engine not configured'],
    },
    fileName,
    fileSize,
    message: 'Audio received and queued for backend processing.',
  }
}

export const emptyStructuredData = EMPTY_STRUCTURED_DATA
