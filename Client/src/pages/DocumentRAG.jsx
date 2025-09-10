import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DocumentRAG = () => {
  const [file, setFile] = useState(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);

  const api = axios.create({
    baseURL: `${import.meta.env.VITE_SERVER_URI}/api`,
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const response = await api.get('/documents/documents');
      setDocuments(response.data.documents);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append('document', file);
    
    try {
      await api.post('/documents/upload', formData);
      setFile(null);
      loadDocuments();
      alert('Document uploaded successfully!');
    } catch (error) {
      alert('Upload failed');
    }
    setLoading(false);
  };

  const handleQuery = async () => {
    if (!question.trim()) return;
    setLoading(true);
    try {
      const response = await api.post('/documents/query', { question });
      setAnswer(response.data.answer);
    } catch (error) {
      setAnswer('Query failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Document RAG System</h1>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Upload Document</h2>
            <input
              type="file"
              accept=".pdf,.docx"
              onChange={(e) => setFile(e.target.files[0])}
              className="mb-4 w-full"
            />
            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className="w-full bg-blue-500 text-white py-2 rounded disabled:opacity-50"
            >
              {loading ? 'Uploading...' : 'Upload'}
            </button>
            
            <div className="mt-6">
              <h3 className="font-semibold mb-2">Your Documents ({documents.length})</h3>
              {documents.map((doc) => (
                <div key={doc._id} className="p-2 bg-gray-100 rounded mb-2">
                  {doc.filename}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Ask Questions</h2>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask about your documents..."
              className="w-full p-3 border rounded mb-4 h-32"
            />
            <button
              onClick={handleQuery}
              disabled={!question.trim() || loading}
              className="w-full bg-green-500 text-white py-2 rounded disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Ask Question'}
            </button>
            
            {answer && (
              <div className="mt-6 p-4 bg-blue-50 rounded">
                <h3 className="font-semibold mb-2">Answer:</h3>
                <div 
                  className="whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{
                    __html: answer.replace(
                      /```(\w*)\n?([\s\S]*?)```/g,
                      (match, lang, code) => {
                        const cleanCode = code.replace(/^\s*\w+\s*\n?/, '').trim();
                        const languageLabel = lang || '';
                        const escapedCode = cleanCode
                          .replace(/&/g, "&amp;")
                          .replace(/</g, "&lt;")
                          .replace(/>/g, "&gt;");
                        
                        return `<div class="code-block"><span class="language-label">${languageLabel}</span><pre><code>${escapedCode}</code></pre></div>`;
                      }
                    )
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentRAG;