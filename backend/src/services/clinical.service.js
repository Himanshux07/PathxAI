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

const symptomKeywords = [
  'fever',
  'cough',
  'cold',
  'headache',
  'head pain',
  'body pain',
  'pain',
  'vomiting',
  'nausea',
  'diarrhea',
  'stomach pain',
  'breathlessness',
  'shortness of breath',
  'chest pain',
  'dizziness',
  'weakness',
  'fatigue',
  'sore throat',
  'runny nose',
  'back pain',
]

const medicationKeywords = [
  'paracetamol',
  'acetaminophen',
  'ibuprofen',
  'diclofenac',
  'azithromycin',
  'amoxicillin',
  'metformin',
  'insulin',
  'pantoprazole',
  'omeprazole',
  'cetirizine',
  'loratadine',
  'dolo',
]

const severityKeywords = [
  { keyword: 'mild', value: 'mild' },
  { keyword: 'moderate', value: 'moderate' },
  { keyword: 'severe', value: 'severe' },
  { keyword: 'very severe', value: 'severe' },
  { keyword: 'extreme', value: 'severe' },
]

const diagnosisKeywords = [
  'viral fever',
  'viral infection',
  'gastritis',
  'migraine',
  'hypertension',
  'diabetes',
  'asthma',
  'bronchitis',
  'infection',
  'allergy',
  'uti',
  'urinary tract infection',
]

const languageHints = [
  { language: 'Hindi', patterns: [' aap ', ' mujhe ', ' dard ', ' bukhar ', ' khansi ', ' pet ', ' se ', ' nahi ', ' hai '], script: /[\u0900-\u097F]/ },
  { language: 'Marathi', patterns: [' mala ', ' aahe ', ' zala ', ' jhala ', ' kay ', ' hota ', ' dukhat ', ' tond '], script: /[\u0900-\u097F]/ },
]

const normalizeText = (value = '') => value.toLowerCase().replace(/\s+/g, ' ').trim()

const formatList = (items) => {
  if (!items.length) {
    return []
  }

  return [...new Set(items.map((item) => item.trim()).filter(Boolean))]
}

const detectLanguage = (transcription) => {
  const normalizedText = normalizeText(transcription)

  for (const hint of languageHints) {
    if (hint.script.test(transcription)) {
      return hint.language
    }

    if (hint.patterns.some((pattern) => normalizedText.includes(pattern.trim()))) {
      return hint.language
    }
  }

  if (/[a-z]/i.test(transcription)) {
    return 'English'
  }

  return 'Unknown'
}

const extractDuration = (transcription) => {
  const durationPatterns = [
    /for\s+(\d+\s+(?:day|days|week|weeks|month|months|year|years))/i,
    /since\s+(yesterday|today|last\s+\w+|\d+\s+(?:day|days|week|weeks|month|months|year|years)\s+ago)/i,
    /(\d+\s+(?:day|days|week|weeks|month|months|year|years))/i,
  ]

  for (const pattern of durationPatterns) {
    const match = transcription.match(pattern)
    if (match?.[1]) {
      return match[1]
    }
  }

  return ''
}

const extractSeverity = (transcription) => {
  const normalizedText = normalizeText(transcription)
  const severity = severityKeywords.find(({ keyword }) => normalizedText.includes(keyword))
  return severity?.value || ''
}

const extractSymptoms = (transcription) => {
  const normalizedText = normalizeText(transcription)
  const symptoms = symptomKeywords.filter((keyword) => normalizedText.includes(keyword))
  return formatList(symptoms)
}

const extractMedications = (transcription) => {
  const normalizedText = normalizeText(transcription)
  const medications = medicationKeywords.filter((keyword) => normalizedText.includes(keyword))
  return formatList(medications)
}

const extractDiagnosis = (transcription) => {
  const normalizedText = normalizeText(transcription)
  const diagnosis = diagnosisKeywords.find((keyword) => normalizedText.includes(keyword))
  return diagnosis || ''
}

export const extractStructuredDataFromTranscription = (transcription) => {
  const text = typeof transcription === 'string' ? transcription.trim() : ''
  const symptoms = extractSymptoms(text)
  const medications = extractMedications(text)
  const duration = extractDuration(text)
  const severity = extractSeverity(text)
  const diagnosis = extractDiagnosis(text)
  const languageDetected = detectLanguage(text)

  const missingInformation = []

  if (!symptoms.length) missingInformation.push('symptoms')
  if (!duration) missingInformation.push('duration')
  if (!severity) missingInformation.push('severity')
  if (!diagnosis) missingInformation.push('diagnosis')
  if (!medications.length) missingInformation.push('medications')

  return {
    language_detected: languageDetected,
    symptoms,
    duration,
    severity,
    diagnosis,
    medications,
    additional_notes: text,
    missing_information: missingInformation,
  }
}

const transcribeWithOpenAI = async (file) => {
  if (!file?.buffer?.length) {
    throw new Error('Audio file buffer is empty.')
  }

  const formData = new FormData()
  const audioBlob = new Blob([file.buffer], { type: file.mimetype || 'audio/webm' })
  formData.append('file', audioBlob, file.originalname || 'audio.webm')
  formData.append('model', process.env.TRANSCRIPTION_MODEL || 'whisper-1')

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.TRANSCRIPTION_API_KEY}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const errorPayload = await response.text().catch(() => '')
    throw new Error(`Transcription provider error: ${response.status} ${errorPayload}`)
  }

  const payload = await response.json()
  return payload.text || ''
}

const getTranscriptionText = async ({ file, patientId }) => {
  const provider = normalizeText(process.env.TRANSCRIPTION_PROVIDER || 'mock')

  if (provider === 'openai' && process.env.TRANSCRIPTION_API_KEY) {
    return transcribeWithOpenAI(file)
  }

  const fileName = file?.originalname || 'uploaded-audio'
  return `Audio file ${fileName} received for patient ${patientId}. Configure TRANSCRIPTION_PROVIDER=OpenAI and TRANSCRIPTION_API_KEY to transcribe audio.`
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
  const transcription = await getTranscriptionText({ file, patientId })
  const structuredData = extractStructuredDataFromTranscription(transcription)

  return {
    transcription,
    structuredData: {
      ...EMPTY_STRUCTURED_DATA,
      ...structuredData,
      additional_notes: `${structuredData.additional_notes}\nUploaded file ${fileName} (${fileSize}).`,
    },
    fileName,
    fileSize,
    message: 'Audio processed and structured data prepared.',
  }
}

export const emptyStructuredData = EMPTY_STRUCTURED_DATA
