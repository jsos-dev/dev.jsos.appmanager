import express from 'express'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST_DIR = join(__dirname, 'dist')

const app = express()
app.use(express.static(DIST_DIR))

app.get('*', (req, res) => {
  res.sendFile(join(DIST_DIR, 'index.html'))
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Settings server running on port ${PORT}`)
})
