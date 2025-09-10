import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authService, documentService } from '../services/api';
import toast from 'react-hot-toast';
import Spinner from '../components/shared/Spinner';
import Button from '../components/shared/Button';
import axios from 'axios';

const Dashboard = () => {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const [file, setFile] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingStates, setLoadingStates] = useState({});
    const [selectedDocument, setSelectedDocument] = useState(null);
    const [messages, setMessages] = useState([]);
    const [currentMessage, setCurrentMessage] = useState('');
    const [showUpload, setShowUpload] = useState(true);
    const messagesEndRef = useRef(null);

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            toast.success('Copied to clipboard!');
        }).catch(() => {
            toast.error('Failed to copy');
        });
    };

    const formatMessage = (content) => {
        const codeBlockRegex = /```([\s\S]*?)```/g;
        let formattedContent = content.replace(codeBlockRegex, (match, code) => {
            const codeId = Math.random().toString(36).substr(2, 9);
            return `<div class="code-block">
                <button class="copy-button" onclick="copyCode('${codeId}')" title="Copy code">Copy</button>
                <pre id="${codeId}">${code.trim()}</pre>
            </div>`;
        });

        formattedContent = formattedContent.replace(/\`(.*?)\`/g, '<code class="bg-gray-200 px-1 rounded text-sm">$1</code>');
        
        formattedContent = formattedContent.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        formattedContent = formattedContent.replace(/\n/g, '<br>');
        
        return formattedContent;
    };


    useEffect(() => {
        window.copyCode = (codeId) => {
            const codeElement = document.getElementById(codeId);
            if (codeElement) {
                copyToClipboard(codeElement.textContent);
            }
        };
        return () => {
            delete window.copyCode;
        };
    }, []);


    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(scrollToBottom, 100);
        }
    }, [messages]);



    useEffect(() => {
        if (user) {
            loadDocuments();
        }
    }, [user]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const loadDocuments = async () => {
        try {
            const response = await documentService.getChatHistory();
            // Sort by most recent activity (updatedAt) then by creation date
            const sortedDocs = (response.data.documents || []).sort((a, b) => {
                const aDate = new Date(a.updatedAt || a.uploadDate);
                const bDate = new Date(b.updatedAt || b.uploadDate);
                return bDate - aDate;
            });
            setDocuments(sortedDocs);
        } catch (error) {
            console.error('Error loading documents:', error);
            // Fallback to regular document loading
            try {
                const response = await documentService.getDocuments();
                setDocuments((response.data.documents || []).reverse());
            } catch (fallbackError) {
                setDocuments([]);
            }
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setIsLoading(true);
        const formData = new FormData();
        formData.append('document', file);
        
        try {
            const response = await documentService.upload(formData);
            setFile(null);
            loadDocuments();
            const newDocId = response.data.documentId;
            setSelectedDocument(newDocId);
            setMessages([{ type: 'ai', content: 'Document uploaded successfully! Ask me anything about this document.' }]);
            setShowUpload(false);
            setTimeout(scrollToBottom, 100);
            toast.success('Document uploaded! You can now ask questions.');
        } catch (error) {
            toast.error('Upload failed');
        }
        setIsLoading(false);
    };

    const handleSendMessage = async () => {
        if (!currentMessage.trim() || !selectedDocument) return;
        
        const messageText = currentMessage.trim();
        setCurrentMessage('');
        
        const userMessage = { type: 'user', content: messageText };
        setMessages(prev => {
            const newMessages = [...prev, userMessage];
            setTimeout(scrollToBottom, 50);
            return newMessages;
        });
        
        setLoadingStates(prev => ({ ...prev, [selectedDocument]: true }));
        
        try {
            const response = await documentService.query(messageText, selectedDocument);
            const aiMessage = { type: 'ai', content: response.data.answer };
            setMessages(prev => {
                const newMessages = [...prev, aiMessage];
                setTimeout(scrollToBottom, 100);
                return newMessages;
            });
            
            // Move active document to top of list
            setDocuments(prev => {
                const activeDoc = prev.find(doc => doc._id === selectedDocument);
                const otherDocs = prev.filter(doc => doc._id !== selectedDocument);
                return activeDoc ? [activeDoc, ...otherDocs] : prev;
            });
        } catch (error) {
            const errorMessage = { type: 'ai', content: 'Sorry, I encountered an error processing your question.' };
            setMessages(prev => {
                const newMessages = [...prev, errorMessage];
                setTimeout(scrollToBottom, 100);
                return newMessages;
            });
        }
        setLoadingStates(prev => ({ ...prev, [selectedDocument]: false }));
    };

    const selectDocument = async (docId) => {
        // Clear current message when switching documents
        setCurrentMessage('');
        setSelectedDocument(docId);
        setShowUpload(false);
        try {
            const response = await documentService.getChatHistory(docId);
            setMessages(response.data.messages || []);
            setTimeout(scrollToBottom, 300);
        } catch (error) {
            console.error('Error loading chat history:', error);
            setMessages([]);
        }
    };

    const startNewChat = () => {
        setSelectedDocument(null);
        setMessages([]);
        setShowUpload(true);
    };

    const deleteDoc = async (docId, e) => {
        e.stopPropagation();
        if (window.confirm('Delete this document and all chat history?')) {
            try {
                await documentService.deleteDocument(docId);
                loadDocuments();
                if (selectedDocument === docId) {
                    startNewChat();
                }
                toast.success('Document deleted successfully');
            } catch (error) {
                toast.error('Failed to delete document');
            }
        }
    };

    const handleSendVerification = async () => {
        try {
            const { data } = await authService.sendVerifyOtp();
            if (data.success) {
                toast.success('Verification OTP sent to your email.');
                navigate('/verify-email');
            } else {
                toast.error(data.message || 'Failed to send OTP.');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'An error occurred.');
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-screen"><Spinner /></div>;
    }

    return (
        <>
            {!user.isAccountVerified && (
                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-3 text-center">
                    <span className="text-sm">Account not verified. </span>
                    <Button onClick={handleSendVerification} className="!w-auto !py-1 !px-2 text-xs ml-2">
                        Verify Email
                    </Button>
                </div>
            )}
            {user ? (
                        <div className="fixed inset-0 top-16 bg-gray-50">
                            {/* Fixed Sidebar */}
                            <div className="fixed left-0 w-64 bg-gray-900 text-white p-4 overflow-y-auto" style={{height: 'calc(100vh - 64px)', top: '64px'}}>
                                <Button
                                    onClick={startNewChat}
                                    className="w-full mb-4 !bg-gray-700 hover:!bg-gray-600"
                                >
                                    + New Chat
                                </Button>
                                
                                <div className="space-y-2">
                                    <h3 className="text-sm font-semibold text-gray-400 mb-2">Document History</h3>
                                    {documents.map((doc) => (
                                        <div
                                            key={doc._id}
                                            className={`group flex items-center justify-between p-2 rounded text-sm hover:bg-gray-700 ${
                                                selectedDocument === doc._id ? 'bg-gray-700' : ''
                                            }`}
                                        >
                                            <button
                                                onClick={() => selectDocument(doc._id)}
                                                className="flex-1 text-left truncate"
                                            >
                                                {doc.filename}
                                            </button>
                                            <button
                                                onClick={(e) => deleteDoc(doc._id, e)}
                                                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 ml-2"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="ml-64 h-full flex flex-col">
                                {showUpload ? (
                                    <div className="flex-1 flex items-center justify-center">
                                        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg text-center">
                                            <h2 className="text-2xl font-semibold mb-6">Upload Document</h2>
                                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 mb-4">
                                                <input
                                                    type="file"
                                                    accept=".pdf,.docx"
                                                    onChange={(e) => setFile(e.target.files[0])}
                                                    className="mb-4 w-full"
                                                />
                                                {file && (
                                                    <p className="text-sm text-gray-600 mb-4">Selected: {file.name}</p>
                                                )}
                                            </div>
                                            <Button
                                                onClick={handleUpload}
                                                disabled={!file || isLoading}
                                                className="w-full"
                                            >
                                                {isLoading ? 'Uploading...' : 'Upload & Start Chat'}
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative flex flex-col h-full">
                                        <div className="flex-1 overflow-y-auto p-4 pb-24">
                                            {!selectedDocument ? (
                                                <div className="text-center text-gray-500 mt-20">
                                                    <p>Select a document to start chatting</p>
                                                </div>
                                            ) : messages.length === 0 ? (
                                                <div className="text-center text-gray-500 mt-20">
                                                    <p>Ask me anything about this document!</p>
                                                </div>
                                            ) : (
                                                <div className="max-w-4xl mx-auto">
                                                    {messages.map((msg, idx) => (
                                                        <div key={idx} className={`mb-4 ${msg.type === 'user' ? 'text-right' : 'text-left'}`}>
                                                            <div className={`inline-block p-3 rounded-lg max-w-2xl ${
                                                                msg.type === 'user' 
                                                                    ? 'bg-blue-500 text-white' 
                                                                    : 'bg-gray-100 border'
                                                            }`}>
                                                                <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{
                                                                    __html: formatMessage(msg.content)
                                                                }} />
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {loadingStates[selectedDocument] && (
                                                        <div className="text-left mb-4">
                                                            <div className="inline-block p-3 rounded-lg bg-gray-100 border">
                                                                Thinking...
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div ref={messagesEndRef} />
                                                </div>
                                            )}

                                        </div>
                                        
                                        <div className="fixed bottom-0 left-64 right-0 bg-white border-t p-4 z-10">
                                            <div className="max-w-4xl mx-auto flex gap-2">
                                                <input
                                                    type="text"
                                                    value={currentMessage || ''}
                                                    onChange={(e) => setCurrentMessage(e.target.value)}
                                                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                                    placeholder="Ask about this document..."
                                                    className="flex-1 p-3 border rounded-lg"
                                                    disabled={loadingStates[selectedDocument] || !selectedDocument}
                                                />
                                                <Button
                                                    onClick={handleSendMessage}
                                                    disabled={!currentMessage.trim() || loadingStates[selectedDocument] || !selectedDocument}
                                                    className="!w-auto px-6"
                                                >
                                                    Send
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
            ) : (
                <div className="flex items-center justify-center h-full">
                    <p>Could not load user information.</p>
                </div>
            )}
        </>
    );
};

export default Dashboard;