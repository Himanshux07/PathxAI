import { v2 as cloudinary } from 'cloudinary'

let cloudinaryConfigured = false

const hasCloudinaryConfig = () =>
  !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)

const ensureCloudinaryConfigured = () => {
  if (cloudinaryConfigured || !hasCloudinaryConfig()) {
    return
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  })

  cloudinaryConfigured = true
}

export const uploadAudioBufferToCloudinary = async ({ file, patientId }) => {
  if (!file?.buffer?.length || !hasCloudinaryConfig()) {
    return null
  }

  ensureCloudinaryConfigured()

  const base64 = file.buffer.toString('base64')
  const mimeType = file.mimetype || 'audio/webm'
  const dataUri = `data:${mimeType};base64,${base64}`

  const uploadResult = await cloudinary.uploader.upload(dataUri, {
    resource_type: 'video',
    folder: `pathxai/clinical-audio/${patientId}`,
    public_id: `${Date.now()}-${(file.originalname || 'audio').replace(/[^a-zA-Z0-9_-]/g, '-')}`,
    overwrite: false,
  })

  return {
    storageProvider: 'cloudinary',
    url: uploadResult.secure_url || '',
    publicId: uploadResult.public_id || '',
  }
}
