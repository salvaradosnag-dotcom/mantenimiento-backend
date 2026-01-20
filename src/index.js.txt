
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

import authRoutes from './routes/auth.js'
import uploadRoutes from './routes/upload.js'

dotenv.config()

const app = express()

app.use(cors())
app.use(express.json())

app.use('/auth', authRoutes)
app.use('/upload', uploadRoutes)

app.get('/', (req, res) => {
  res.send('API OK')
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log('Backend corriendo en puerto ' + PORT)
})
