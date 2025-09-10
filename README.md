# 📚 IntelliDoc - AI-Powered Document RAG System

<div align="center">

![IntelliDoc Logo](https://img.shields.io/badge/IntelliDoc-AI%20Document%20Assistant-blue?style=for-the-badge&logo=openai)

[![React](https://img.shields.io/badge/React-18.0+-61DAFB?style=flat&logo=react)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18.0+-339933?style=flat&logo=node.js)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Database-47A248?style=flat&logo=mongodb)](https://mongodb.com/)
[![Google AI](https://img.shields.io/badge/Google%20AI-Gemini-4285F4?style=flat&logo=google)](https://ai.google.dev/)

*Transform your documents into intelligent conversations*

</div>

## 🌟 Features

- **📄 Document Upload** - Support for PDF and DOCX files (up to 5MB)
- **🤖 AI-Powered Q&A** - Ask questions about your documents using Google Gemini AI
- **💬 Chat History** - Maintain conversation context for better responses
- **🔐 Dual Token Authentication** - JWT access/refresh tokens with OAuth support
- **📱 Responsive Design** - Works seamlessly on desktop and mobile
- **🎨 Beautiful UI** - Clean, modern interface with Tailwind CSS
- **📋 Code Highlighting** - Syntax highlighting for code blocks in responses

## 🚀 Quick Start

### Prerequisites

- Node.js 18.0 or higher
- MongoDB database
- Google AI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/intellidoc.git
   cd intellidoc
   ```

2. **Install server dependencies**
   ```bash
   cd Server
   npm install
   ```

3. **Install client dependencies**
   ```bash
   cd ../Client
   npm install
   ```

4. **Environment Setup**

   Create `.env` files in both Server and Client directories:

   **Server/.env**
   ```env
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET_KEY=your_jwt_secret_key
   JWT_REFRESH_SECRET_KEY=your_jwt_refresh_secret_key
   NODE_ENV=development
   SMTP_USER=your_smtp_user
   SMTP_PASSWORD=your_smtp_password
   SENDER_EMAIL=your_sender_email
   CLIENT=http://localhost:5173
   SERVER_URI=http://localhost:4000
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret
   GOOGLE_API_KEY=your_google_ai_api_key
   ```

   **Client/.env**
   ```env
   VITE_SERVER_URI=http://localhost:4000
   ```

5. **Start the application**

   **Terminal 1 - Server:**
   ```bash
   cd Server
   npm start
   ```

   **Terminal 2 - Client:**
   ```bash
   cd Client
   npm run dev
   ```

6. **Access the application**
   
   Open your browser and navigate to `http://localhost:5173`

## 🏗️ Project Structure

```
IntelliDoc/
├── Client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   ├── hooks/         # Custom hooks
│   │   └── context/       # React context
│   └── public/
├── Server/                # Node.js backend
│   ├── controllers/       # Route controllers
│   ├── models/           # MongoDB models
│   ├── routes/           # API routes
│   ├── middleware/       # Custom middleware
│   └── config/           # Configuration files
└── README.md
```

## 🔧 Tech Stack

### Frontend
- **React 18** - Modern UI library
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first CSS framework
- **Axios** - HTTP client
- **React Router** - Client-side routing
- **React Hot Toast** - Beautiful notifications

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB ODM
- **JWT** - Authentication
- **Multer** - File upload handling
- **Google Generative AI** - AI responses
- **Nodemailer** - Email service

## 📖 Usage

1. **Register/Login** - Create account with email/password or use Google/GitHub OAuth
2. **Email Verification** - Verify your account with OTP sent to email
3. **Upload Documents** - Upload PDF or DOCX files (max 5MB)
4. **Select Document** - Click on a document to select it
5. **Ask Questions** - Type your questions about the document
6. **Get AI Responses** - Receive intelligent, formatted answers with code highlighting

### Authentication Flow
- **Access Token** - Short-lived JWT for API requests (15 minutes)
- **Refresh Token** - Long-lived token for renewing access (7 days)
- **Automatic Renewal** - Seamless token refresh without re-login
- **Social Login** - One-click authentication with Google/GitHub

## 🔒 Security Features

- **Dual Token Authentication** - JWT access tokens with refresh token rotation
- **Email Verification** - Account verification via OTP
- **OAuth Integration** - Google and GitHub social login
- **File Size Validation** - 5MB upload limit enforcement
- **Input Sanitization** - XSS prevention in code blocks
- **Protected Routes** - Middleware-based route protection
- **Secure Headers** - CORS and security headers configuration

## 🎨 UI Features

- Responsive design for all devices
- Dark theme code blocks with syntax highlighting
- Non-selectable language labels in code blocks
- Smooth animations and transitions
- Loading states and error handling
- Toast notifications for user feedback

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Google AI for Gemini API
- React team for the amazing framework
- Tailwind CSS for the utility-first approach
- MongoDB for the flexible database solution

---
