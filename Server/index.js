import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import 'dotenv/config'
import connectDB from './config/mongodb.js'
import AuthRouter from './routes/AuthRoutes.js'
import UserRouter from './routes/UserRoutes.js'
import DocumentRouter from './routes/DocumentRoutes.js'

const app = express()
const PORT = process.env.PORT || 4000
connectDB()

app.use(express.json())
app.use(cookieParser())
app.use(cors({
    origin: process.env.CLIENT,
    credentials: true,
}))


app.get('/', (req, res) => {
    res.send(`<h1> API's is Working... </h1>`)
})

app.use('/api/auth', AuthRouter)
app.use('/api/user', UserRouter)
app.use('/api/documents', DocumentRouter)

app.listen(PORT, () => {
    console.log(`Server running on PORT : ${PORT}`)
})