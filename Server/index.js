import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import mongoose from 'mongoose'
import 'dotenv/config'
import connectDB from './config/mongodb.js'
import AuthRouter from './routes/AuthRoutes.js'
import UserRouter from './routes/UserRoutes.js'
import DocumentRouter from './routes/DocumentRoutes.js'
import CollectionRouter from './routes/CollectionRoutes.js'
import ChatRouter from './routes/ChatRoutes.js'

const app = express()
const PORT = process.env.PORT || 4000

app.set('trust proxy', 1)

connectDB().catch((err) => {
    console.error('Fatal database connection error:', err.message)
    process.exit(1)
})

app.use(express.json())
app.use(cookieParser())
app.use(cors({
    origin: process.env.CLIENT,
    credentials: true,
}))


app.get('/', (req, res) => {
    res.send(`<h1> API's is Working... </h1>`)
})

app.get('/healthz', (req, res) => {
    res.status(200).json({ ok: true, uptime: process.uptime() })
})

app.get('/readyz', (req, res) => {
    const ready = mongoose.connection.readyState === 1
    res.status(ready ? 200 : 503).json({ ok: ready })
})

app.use('/api/auth', AuthRouter)
app.use('/api/user', UserRouter)
app.use('/api/documents', DocumentRouter)
app.use('/api/collections', CollectionRouter)
app.use('/api/chat', ChatRouter)

const server = app.listen(PORT, () => {
    console.log(`Server running on PORT : ${PORT}`)
})

const shutdown = (signal) => {
    console.log(`${signal} received, shutting down gracefully...`)
    server.close(async () => {
        try {
            await mongoose.connection.close()
        } finally {
            process.exit(0)
        }
    })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
