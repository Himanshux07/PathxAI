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
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

const loadJson = (value) => {
  try {
    return value ? JSON.parse(value) : null
  } catch {
    return null
  }
}

const formatDateTime = (value) => {
  if (!value) {
    return 'Unknown time'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Unknown time'
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

const getPrescriptionTitle = (record) => {
  const diagnosis = record?.structuredData?.diagnosis
  if (diagnosis) {
    return diagnosis
  }

  const symptoms = record?.structuredData?.symptoms
  if (Array.isArray(symptoms) && symptoms.length > 0) {
    return symptoms.slice(0, 2).join(', ')
  }

  return record?.type === 'audio_upload' ? 'Audio consultation' : 'Clinical note'
}

function App() {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('pathx-theme')
    return savedTheme === 'dark' ? 'dark' : 'light'
  })
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('pathx-token') || '')
  const [currentUser, setCurrentUser] = useState(() => loadJson(localStorage.getItem('pathx-user')))
  const [loginForm, setLoginForm] = useState({
    patientId: '',
    password: '',
  })
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [authError, setAuthError] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [audioStatus, setAudioStatus] = useState(initialAudioStatus)
  const [transcription, setTranscription] = useState('')
  const [structuredData, setStructuredData] = useState(EMPTY_STRUCTURED_DATA)
  const [saveStatus, setSaveStatus] = useState('Not saved')
  const [errorMessage, setErrorMessage] = useState('')
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [uploadedFileName, setUploadedFileName] = useState('')
  const [previousRecords, setPreviousRecords] = useState([])
  const [isLoadingRecords, setIsLoadingRecords] = useState(false)

  const mediaRecorderRef = useRef(null)
  const mediaStreamRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const fileInputRef = useRef(null)

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
    if (authToken) {
      localStorage.setItem('pathx-token', authToken)
    } else {
      localStorage.removeItem('pathx-token')
    }
  }, [authToken])

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('pathx-user', JSON.stringify(currentUser))
    } else {
      localStorage.removeItem('pathx-user')
    }
  }, [currentUser])

  useEffect(() => {
    const loadPreviousRecords = async () => {
      if (!authToken || !currentUser) {
        setPreviousRecords([])
        return
      }

      setIsLoadingRecords(true)

      try {
        const response = await apiFetch('/clinical/records')

        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          throw new Error(payload?.message || 'Failed to load previous records.')
        }

        const payload = await response.json()
        setPreviousRecords(Array.isArray(payload.records) ? payload.records : [])
      } catch (error) {
        setPreviousRecords([])
        setErrorMessage(error.message || 'Unable to load previous records.')
      } finally {
        setIsLoadingRecords(false)
      }
    }

    loadPreviousRecords()
  }, [authToken, currentUser])

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop()
      }

      if (timerRef.current) {
        clearInterval(timerRef.current)
      }

      mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  const patientId = currentUser?.patientId || ''

  const handleLogout = () => {
    setAuthToken('')
    setCurrentUser(null)
    setLoginForm({ patientId: '', password: '' })
    setIsRecording(false)
    setIsProcessing(false)
    setIsSaving(false)
    setAudioStatus(initialAudioStatus)
    setTranscription('')
    setStructuredData(EMPTY_STRUCTURED_DATA)
    setSaveStatus('Not saved')
    setErrorMessage('')
    setAuthError('')
    setRecordingSeconds(0)
    setUploadedFileName('')
    setPreviousRecords([])

    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }

    mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
    mediaStreamRef.current = null
  }

  const apiFetch = async (path, options = {}) => {
    const headers = {
      ...(options.headers || {}),
    }

    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    })

    if (response.status === 401) {
      handleLogout()
      throw new Error('Session expired. Please login again.')
    }

    return response
  }

  const handleLogin = async (event) => {
    event.preventDefault()
    setAuthError('')

    if (!loginForm.patientId.trim() || !loginForm.password.trim()) {
      setAuthError('Patient ID and password are required.')
      return
    }

    setIsAuthenticating(true)

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId: loginForm.patientId.trim(),
          password: loginForm.password,
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.message || 'Invalid login credentials')
      }

      const payload = await response.json()
      setAuthToken(payload.token)
      setCurrentUser(payload.user)
      setLoginForm({ patientId: '', password: '' })
      setAudioStatus('Ready')
      setSaveStatus('Not saved')
      setErrorMessage('')
      setTranscription('')
      setStructuredData(EMPTY_STRUCTURED_DATA)
      setPreviousRecords([])
    } catch (error) {
      setAuthError(error.message || 'Unable to login right now.')
    } finally {
      setIsAuthenticating(false)
    }
  }

  const startRecording = async () => {
    setErrorMessage('')
    setUploadedFileName('')

    if (!authToken || !patientId) {
      setErrorMessage('Please login first.')
      return
    }

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
      setRecordingSeconds(0)

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
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((currentSeconds) => currentSeconds + 1)
      }, 1000)
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

    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    mediaRecorderRef.current.stop()
  }

  const uploadAudio = async (audioBlob, sourceLabel = '') => {
    const formData = new FormData()
    const fileName = sourceLabel || `recording-${Date.now()}.webm`
    formData.append('audio', audioBlob, fileName)

    setIsProcessing(true)

    try {
      const response = await apiFetch('/clinical/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.message || 'Upload request failed')
      }

      const payload = await response.json()
      const nextStructuredData =
        typeof payload.structuredData === 'object' && payload.structuredData !== null
          ? payload.structuredData
          : EMPTY_STRUCTURED_DATA

      setTranscription(payload.transcription || '')
      setStructuredData(nextStructuredData)
      setAudioStatus(payload.message || 'Processed successfully.')
    } catch (error) {
      setErrorMessage(error.message || 'Failed to process audio. Please try again.')
      setAudioStatus('Processing failed.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRecordedFileUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    if (!authToken || !patientId) {
      setErrorMessage('Please login first.')
      event.target.value = ''
      return
    }

    setErrorMessage('')
    setUploadedFileName(file.name)
    setAudioStatus('Selected file. Uploading for processing...')
    setSaveStatus('Not saved')
    setRecordingSeconds(0)
    await uploadAudio(file, file.name)
    event.target.value = ''
  }

  const openFilePicker = () => {
    fileInputRef.current?.click()
  }

  const saveToDatabase = async () => {
    setErrorMessage('')

    if (!authToken || !patientId) {
      setErrorMessage('Please login first.')
      return
    }

    const hasProcessedData =
      !!transcription ||
      Object.values(structuredData).some((value) =>
        Array.isArray(value) ? value.length > 0 : value !== '',
      )

    if (!hasProcessedData) {
      setErrorMessage('No processed data available to save yet.')
      return
    }

    setIsSaving(true)
    setSaveStatus('Saving...')

    try {
      const response = await apiFetch('/clinical/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId,
          transcription,
          structuredData,
          savedAt: new Date().toISOString(),
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.message || 'Save request failed')
      }

      setSaveStatus('Saved successfully.')
      const refreshResponse = await apiFetch('/clinical/records')
      if (refreshResponse.ok) {
        const refreshPayload = await refreshResponse.json()
        setPreviousRecords(Array.isArray(refreshPayload.records) ? refreshPayload.records : [])
      }
    } catch (error) {
      setSaveStatus('Save failed.')
      setErrorMessage(error.message || 'Unable to save data to database right now.')
    } finally {
      setIsSaving(false)
    }
  }

  const recordingLabel = isRecording
    ? `Live recording ${Math.floor(recordingSeconds / 60)
        .toString()
        .padStart(2, '0')}:${(recordingSeconds % 60).toString().padStart(2, '0')}`
    : 'Mic idle'

  const hasProcessedData =
    !!transcription ||
    Object.values(structuredData).some((value) =>
      Array.isArray(value) ? value.length > 0 : value !== '',
    )

  if (!authToken || !currentUser) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.16),_transparent_28%),linear-gradient(135deg,_#f8fafc,_#eefcf8)] px-4 py-6 transition-colors dark:bg-[radial-gradient(circle_at_top_left,_rgba(8,145,178,0.24),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.18),_transparent_28%),linear-gradient(135deg,_#020617,_#0f172a)] md:px-8 md:py-8">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center justify-center">
          <div className="grid w-full overflow-hidden rounded-[2rem] border border-white/60 bg-white/85 shadow-[0_24px_80px_rgba(14,165,233,0.12)] backdrop-blur dark:border-slate-700 dark:bg-slate-900/85 dark:shadow-black/30 lg:grid-cols-2">
            <section className="bg-gradient-to-br from-cyan-600 via-sky-600 to-emerald-600 p-6 text-white md:p-8">
              <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-50">
                Patient Login
              </div>
              <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">Patient ID is your login identity.</h1>
              <p className="mt-3 max-w-xl text-sm text-cyan-50/95 md:text-base">
                Use your patient ID to sign in. The password confirms ownership of the record and keeps the workflow tied to the right patient.
              </p>
              <div className="mt-8 space-y-3 rounded-[1.4rem] border border-white/15 bg-white/10 p-4 text-sm text-cyan-50">
                <p className="font-semibold">What login means here</p>
                <p>Patient ID = account identifier.</p>
                <p>Password = authentication check.</p>
              </div>
            </section>

            <section className="p-6 md:p-8">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Sign in</h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Access your clinical assistant session.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'))}
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                </button>
              </div>

              <form className="space-y-4" onSubmit={handleLogin}>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="loginPatientId">
                    Patient ID
                  </label>
                  <input
                    id="loginPatientId"
                    type="text"
                    value={loginForm.patientId}
                    onChange={(event) => setLoginForm((current) => ({ ...current, patientId: event.target.value }))}
                    placeholder="PATIENT001"
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-cyan-400 dark:focus:ring-cyan-900"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="loginPassword">
                    Password
                  </label>
                  <input
                    id="loginPassword"
                    type="password"
                    value={loginForm.password}
                    onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                    placeholder="••••••••"
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-cyan-400 dark:focus:ring-cyan-900"
                  />
                </div>

                {authError && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">{authError}</p>}

                <button
                  type="submit"
                  disabled={isAuthenticating}
                  className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-950/20 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
                >
                  {isAuthenticating ? 'Signing in...' : 'Login'}
                </button>

                <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Demo login is seeded on the backend for development. Replace it later with your database and env settings.
                </p>
              </form>
            </section>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.14),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.12),_transparent_28%),linear-gradient(135deg,_#f8fafc,_#eefcf8)] transition-colors dark:bg-[radial-gradient(circle_at_top_left,_rgba(8,145,178,0.25),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.16),_transparent_28%),linear-gradient(135deg,_#020617,_#0f172a)]">
      <div className="mx-auto w-full max-w-6xl p-4 md:p-8">
        <div className="overflow-hidden rounded-[2rem] border border-white/60 bg-white/85 shadow-[0_24px_80px_rgba(14,165,233,0.12)] backdrop-blur dark:border-slate-700 dark:bg-slate-900/85 dark:shadow-black/30">
          <header className="border-b border-slate-200/80 bg-gradient-to-r from-cyan-600 via-sky-600 to-emerald-600 px-5 py-5 text-white dark:border-slate-700 md:px-8 md:py-7">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.28em] text-cyan-50">
                  Clinical Voice Assistant
                </div>
                <h1 className="mt-3 text-2xl font-bold tracking-tight md:text-4xl">
                  Capture consults, structure data, and save fast.
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-cyan-50/95 md:text-base">
                  Record live audio, upload an existing file, and store the structured note with the patient session.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-cyan-50">
                  Patient: {patientId}
                </span>
                <button
                  type="button"
                  onClick={() => setTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'))}
                  className="rounded-full border border-white/25 bg-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/25"
                >
                  {theme === 'light' ? 'Switch to Dark' : 'Switch to Light'}
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-full border border-white/25 bg-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/25"
                >
                  Logout
                </button>
              </div>
            </div>
          </header>

          <main className="grid gap-6 p-5 md:p-8 lg:grid-cols-[0.95fr_1.05fr]">
            <section className="space-y-4 rounded-[1.6rem] border border-slate-200 bg-slate-50/80 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/50 md:p-5">
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900/80">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
                    Recording mode
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{recordingLabel}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    isRecording
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200'
                  }`}
                >
                  {isRecording ? 'Recording' : 'Ready'}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={isRecording || isProcessing}
                  className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-950/20 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400 dark:bg-cyan-500 dark:text-slate-950 dark:hover:bg-cyan-400"
                >
                  Start Recording
                </button>
                <button
                  type="button"
                  onClick={stopRecording}
                  disabled={!isRecording}
                  className="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300 dark:disabled:bg-rose-800"
                >
                  Stop Recording
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={openFilePicker}
                  disabled={isProcessing || isRecording}
                  className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Upload Recorded File
                </button>
                <button
                  type="button"
                  onClick={saveToDatabase}
                  disabled={!hasProcessedData || isSaving || isProcessing || isRecording}
                  className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300 dark:disabled:bg-emerald-800"
                >
                  Save to Database
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={handleRecordedFileUpload}
              />

              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-200">
                    {audioStatus}
                  </span>
                  {uploadedFileName && (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      File: {uploadedFileName}
                    </span>
                  )}
                </div>
                <p className="mt-3 text-slate-700 dark:text-slate-200">Save status: {saveStatus}</p>
                <p className="mt-1 text-slate-500 dark:text-slate-400">Logged in as patient ID: {patientId}</p>
                {isProcessing && <p className="mt-2 font-medium text-cyan-700 dark:text-cyan-300">Processing audio...</p>}
                {isSaving && <p className="mt-2 font-medium text-emerald-700 dark:text-emerald-300">Saving to database...</p>}
                {errorMessage && <p className="mt-2 font-medium text-rose-700 dark:text-rose-300">{errorMessage}</p>}
              </div>
            </section>

            <section className="space-y-4">
              <div className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                  Transcription
                </h2>
                <p className="mt-2 min-h-28 whitespace-pre-wrap text-sm leading-6 text-slate-800 dark:text-slate-100">
                  {transcription || 'Transcribed conversation will appear here.'}
                </p>
              </div>

              <div className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                  Structured JSON
                </h2>
                <pre className="mt-2 overflow-x-auto rounded-xl bg-slate-900 p-4 text-xs leading-6 text-slate-100 md:text-sm">
                  {JSON.stringify(structuredData, null, 2)}
                </pre>
              </div>

              <div className="rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                    Previous Prescriptions
                  </h2>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    {previousRecords.length} record{previousRecords.length === 1 ? '' : 's'}
                  </span>
                </div>

                {isLoadingRecords ? (
                  <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Loading previous records...</p>
                ) : previousRecords.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                    No previous prescription data found yet.
                  </p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {previousRecords.map((record) => (
                      <article
                        key={record._id || record.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {getPrescriptionTitle(record)}
                            </h3>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {formatDateTime(record.createdAt)}
                            </p>
                          </div>
                          <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-200">
                            {record.type || 'clinical_note'}
                          </span>
                        </div>

                        <div className="mt-3 grid gap-2 text-sm text-slate-700 dark:text-slate-200">
                          <p>
                            <span className="font-semibold">Transcription:</span>{' '}
                            {record.transcription || 'No transcription available.'}
                          </p>
                          <p>
                            <span className="font-semibold">Symptoms:</span>{' '}
                            {Array.isArray(record.structuredData?.symptoms) && record.structuredData.symptoms.length > 0
                              ? record.structuredData.symptoms.join(', ')
                              : 'Not specified'}
                          </p>
                          <p>
                            <span className="font-semibold">Diagnosis:</span>{' '}
                            {record.structuredData?.diagnosis || 'Not specified'}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  )
}

export default App
