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
- **🔐 User Authentication** - Secure login with email verification
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
   PORT=4000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   GOOGLE_API_KEY=your_google_ai_api_key
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password
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

1. **Register/Login** - Create an account or sign in
2. **Upload Documents** - Upload PDF or DOCX files (max 5MB)
3. **Select Document** - Click on a document to select it
4. **Ask Questions** - Type your questions about the document
5. **Get AI Responses** - Receive intelligent, formatted answers

## 🔒 Security Features

- JWT-based authentication
- Email verification
- File size validation (5MB limit)
- Input sanitization
- Protected routes
- XSS prevention in code blocks

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

<div align="center">

**Made with ❤️ by [Your Name]**

[⭐ Star this repo](https://github.com/yourusername/intellidoc) | [🐛 Report Bug](https://github.com/yourusername/intellidoc/issues) | [💡 Request Feature](https://github.com/yourusername/intellidoc/issues)

</div>