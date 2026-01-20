
import { Router } from 'express'
import upload from '../middlewares/upload.js'
import cloudinary from '../config/cloudinary.js'
import { auth } from '../middlewares/auth.js'

const router = Router()

router.post(
  '/',
  auth(['ADMIN', 'TECNICO']),
  upload.single('foto'),
  async (req, res) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'mantenimientos' },
      (err, result) => {
        if (err) return res.sendStatus(500)
        res.json({ url: result.secure_url })
      }
    )
    stream.end(req.file.buffer)
  }
)

export default router
