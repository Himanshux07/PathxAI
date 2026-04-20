import mongoose from 'mongoose'

const clinicalRecordSchema = new mongoose.Schema(
  {
    patientId: {
      type: String,
      required: [true, 'Patient ID is required'],
      index: true,
    },
    transcription: {
      type: String,
      default: '',
    },
    type: {
      type: String,
      enum: ['audio_upload', 'audio_record', 'text_note'],
      default: 'audio_upload',
    },
    audio: {
      storageProvider: {
        type: String,
        enum: ['cloudinary', 'none'],
        default: 'none',
      },
      url: {
        type: String,
        default: '',
      },
      publicId: {
        type: String,
        default: '',
      },
      originalFileName: {
        type: String,
        default: '',
      },
      mimeType: {
        type: String,
        default: '',
      },
      sizeBytes: {
        type: Number,
        default: 0,
      },
    },
    processing: {
      status: {
        type: String,
        enum: ['uploaded', 'transcribed', 'structured', 'failed'],
        default: 'uploaded',
      },
      transcriptionProvider: {
        type: String,
        default: '',
      },
      aiProvider: {
        type: String,
        default: '',
      },
      durationMs: {
        type: Number,
        default: 0,
      },
      errorMessage: {
        type: String,
        default: '',
      },
    },
    structuredData: {
      language_detected: {
        type: String,
        default: 'Unknown',
      },
      symptoms: [
        {
          type: String,
        },
      ],
      duration: {
        type: String,
        default: '',
      },
      severity: {
        type: String,
        enum: ['mild', 'moderate', 'severe', 'critical', ''],
        default: '',
      },
      diagnosis: {
        type: String,
        default: '',
      },
      medications: [
        {
          type: String,
        },
      ],
      additional_notes: {
        type: String,
        default: '',
      },
      missing_information: [
        {
          type: String,
        },
      ],
    },
    metadata: {
      uploadedFileName: {
        type: String,
        default: '',
      },
      fileSize: {
        type: Number,
        default: 0,
      },
      processingTime: {
        type: Number,
        default: 0,
      },
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
)

// Index for efficient queries by patient and date
clinicalRecordSchema.index({ patientId: 1, createdAt: -1 })
clinicalRecordSchema.index({ 'audio.publicId': 1 })

// Virtual to get age of record
clinicalRecordSchema.virtual('ageInHours').get(function () {
  return Math.floor((Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60))
})

// Ensure virtuals are included in toJSON
clinicalRecordSchema.set('toJSON', { virtuals: true })

const ClinicalRecord = mongoose.model('ClinicalRecord', clinicalRecordSchema)

export default ClinicalRecord
