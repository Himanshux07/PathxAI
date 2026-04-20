import { useEffect, useRef, useState } from 'react'

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

const initialAudioStatus = 'Not recorded'

function App() {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('pathx-theme')
    return savedTheme === 'dark' ? 'dark' : 'light'
  })
  const [patientId, setPatientId] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [audioStatus, setAudioStatus] = useState(initialAudioStatus)
  const [transcription, setTranscription] = useState('')
  const [structuredData, setStructuredData] = useState(EMPTY_STRUCTURED_DATA)
  const [saveStatus, setSaveStatus] = useState('Not saved')
  const [errorMessage, setErrorMessage] = useState('')

  const mediaRecorderRef = useRef(null)
  const mediaStreamRef = useRef(null)
  const chunksRef = useRef([])

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('pathx-theme', theme)
  }, [theme])

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop()
      }

      mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  const startRecording = async () => {
    setErrorMessage('')

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage('Microphone access is not supported in this browser.')
      return
    }

    if (!window.MediaRecorder) {
      setErrorMessage('MediaRecorder is not supported in this browser.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      recorder.onstop = async () => {
        setAudioStatus('Audio captured. Uploading for processing...')
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
        await uploadAudio(audioBlob)

        stream.getTracks().forEach((track) => track.stop())
        mediaStreamRef.current = null
      }

      mediaRecorderRef.current = recorder
      mediaStreamRef.current = stream

      recorder.start()
      setIsRecording(true)
      setAudioStatus('Recording in progress...')
      setSaveStatus('Not saved')
    } catch (error) {
      setErrorMessage('Unable to access microphone. Please allow permissions.')
      setAudioStatus(initialAudioStatus)
    }
  }

  const stopRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') {
      return
    }

    setIsRecording(false)
    mediaRecorderRef.current.stop()
  }

  const uploadAudio = async (audioBlob) => {
    const formData = new FormData()
    formData.append('audio', audioBlob, `recording-${Date.now()}.webm`)
    if (patientId.trim()) {
      formData.append('patientId', patientId.trim())
    }

    setIsProcessing(true)

    try {
      const response = await fetch('/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Upload request failed')
      }

      const payload = await response.json()
      const nextStructuredData =
        typeof payload.structuredData === 'object' && payload.structuredData !== null
          ? payload.structuredData
          : EMPTY_STRUCTURED_DATA

      setTranscription(payload.transcription || '')
      setStructuredData(nextStructuredData)
      setAudioStatus('Processed successfully.')
    } catch (error) {
      setErrorMessage('Failed to process audio. Please try again.')
      setAudioStatus('Processing failed.')
    } finally {
      setIsProcessing(false)
    }
  }

  const saveToDatabase = async () => {
    setErrorMessage('')

    if (!patientId.trim()) {
      setErrorMessage('Patient ID is required to save data.')
      return
    }

    if (!transcription && Object.values(structuredData).every((value) => value === '' || (Array.isArray(value) && value.length === 0))) {
      setErrorMessage('No processed data available to save yet.')
      return
    }

    setIsSaving(true)
    setSaveStatus('Saving...')

    try {
      const response = await fetch('/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId: patientId.trim(),
          transcription,
          structuredData,
          savedAt: new Date().toISOString(),
        }),
      })

      if (!response.ok) {
        throw new Error('Save request failed')
      }

      setSaveStatus('Saved successfully.')
    } catch (error) {
      setSaveStatus('Save failed.')
      setErrorMessage('Unable to save data to database right now.')
    } finally {
      setIsSaving(false)
    }
  }

  const canSave = !isSaving && !isProcessing && !isRecording
  const hasProcessedData =
    !!transcription ||
    Object.values(structuredData).some((value) =>
      Array.isArray(value) ? value.length > 0 : value !== '',
    )

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-lime-50 transition-colors dark:from-slate-950 dark:via-slate-900 dark:to-teal-950">
      <div className="mx-auto w-full max-w-6xl p-4 md:p-8">
        <div className="rounded-3xl border border-cyan-100 bg-white/90 p-4 shadow-xl shadow-cyan-100/50 backdrop-blur md:p-6 dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-black/20">
          <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 dark:border-slate-700 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 md:text-3xl">
                Clinical Voice Assistant
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Record, review, and save structured consultation data.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'))}
              className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Theme: {theme === 'light' ? 'Light' : 'Dark'}
            </button>
          </header>

          <main className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
            <section className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="patientId">
                  Patient ID
                </label>
                <input
                  id="patientId"
                  type="text"
                  value={patientId}
                  onChange={(event) => setPatientId(event.target.value)}
                  placeholder="e.g. OPD-23911"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-cyan-400 dark:focus:ring-cyan-900"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={isRecording || isProcessing}
                  className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-cyan-300 dark:disabled:bg-cyan-800"
                >
                  Start Recording
                </button>
                <button
                  type="button"
                  onClick={stopRecording}
                  disabled={!isRecording}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300 dark:disabled:bg-rose-800"
                >
                  Stop Recording
                </button>
              </div>

              <button
                type="button"
                onClick={saveToDatabase}
                disabled={!canSave || !hasProcessedData}
                className="w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300 dark:disabled:bg-emerald-800"
              >
                Save to Database
              </button>

              <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900">
                <p className="text-slate-700 dark:text-slate-200">Audio: {audioStatus}</p>
                <p className="mt-1 text-slate-700 dark:text-slate-200">Save: {saveStatus}</p>
                {isProcessing && <p className="mt-2 font-medium text-cyan-700 dark:text-cyan-300">Processing audio...</p>}
                {isSaving && <p className="mt-2 font-medium text-emerald-700 dark:text-emerald-300">Saving to database...</p>}
                {errorMessage && <p className="mt-2 font-medium text-rose-700 dark:text-rose-300">{errorMessage}</p>}
              </div>
            </section>

            <section className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                  Transcription
                </h2>
                <p className="mt-2 min-h-28 whitespace-pre-wrap text-sm leading-6 text-slate-800 dark:text-slate-100">
                  {transcription || 'Transcribed conversation will appear here.'}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800/50">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                  Structured JSON
                </h2>
                <pre className="mt-2 overflow-x-auto rounded-xl bg-slate-900 p-4 text-xs leading-6 text-slate-100 md:text-sm">
                  {JSON.stringify(structuredData, null, 2)}
                </pre>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  )
}

export default App
