import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { authService, documentService, collectionService, chatService } from '../services/api';
import toast from 'react-hot-toast';
import Spinner from '../components/shared/Spinner';
import Button from '../components/shared/Button';
import { formatMarkdown } from '../utils/markdown';

const Dashboard = () => {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const [file, setFile] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [collections, setCollections] = useState([]);
    const [selectedCollection, setSelectedCollection] = useState('');
    const [queryScope, setQueryScope] = useState('document'); // 'collection' | 'document'
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
        return formatMarkdown(content);
    };

    // Delegated click handler for code copy buttons, compatible with DOMPurify sanitization
    useEffect(() => {
        const handleCopyClick = (e) => {
            const copyBtn = e.target.closest('button[data-action="copy"]');
            if (copyBtn) {
                const codeBlock = copyBtn.closest('.code-block');
                const codeElement = codeBlock ? codeBlock.querySelector('pre code') : null;
                if (codeElement) {
                    copyToClipboard(codeElement.textContent);
                }
            }
        };

        document.addEventListener('click', handleCopyClick);
        return () => {
            document.removeEventListener('click', handleCopyClick);
        };
    }, []);

    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(scrollToBottom, 100);
        }
    }, [messages]);

    useEffect(() => {
        if (user) {
            loadCollections();
            loadDocuments();
        }
    }, [user]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const loadCollections = async () => {
        try {
            const response = await collectionService.list();
            const cols = response.data.collections || [];
            setCollections(cols);
            if (!selectedCollection && cols.length > 0) {
                setSelectedCollection(cols[0]._id);
            }
        } catch (error) {
            console.error('Error loading collections:', error);
            setCollections([]);
        }
    };

    const loadDocuments = async () => {
        try {
            const response = await documentService.getDocuments();
            setDocuments(response.data.documents || []);
        } catch (error) {
            console.error('Error loading documents:', error);
            setDocuments([]);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setIsLoading(true);
        const formData = new FormData();
        formData.append('document', file);
        
        try {
            const response = await documentService.upload(formData);
            const { documentId, status, skippedChunks, chunksCount } = response.data;
            setFile(null);
            await loadDocuments();
            setSelectedDocument(documentId);
            
            if (status === 'partial') {
                toast.success(`Uploaded with ${chunksCount} chunks indexed (${skippedChunks} skipped).`);
            } else {
                toast.success('Document uploaded and indexed successfully!');
            }

            setMessages([{ type: 'ai', content: 'Document indexed successfully! Ask me anything about this document.' }]);
            setShowUpload(false);
            setTimeout(scrollToBottom, 100);
        } catch (error) {
            console.error('Upload error:', error);
            const errMsg = error.response?.data?.message || 'Upload failed';
            toast.error(errMsg);
            loadDocuments();
        }
        setIsLoading(false);
    };

    const handleSendMessage = async () => {
        const isCollectionScope = queryScope === 'collection';
        if (!currentMessage.trim()) return;
        if (isCollectionScope && !selectedCollection) return;
        if (!isCollectionScope && !selectedDocument) return;

        if (!isCollectionScope) {
            const currentDoc = documents.find(d => d._id === selectedDocument);
            if (currentDoc && currentDoc.status === 'failed') {
                toast.error('This document failed extraction and cannot be queried.');
                return;
            }
        }

        const messageText = currentMessage.trim();
        setCurrentMessage('');
        
        const userMessage = { type: 'user', content: messageText };
        setMessages(prev => {
            const newMessages = [...prev, userMessage];
            setTimeout(scrollToBottom, 50);
            return newMessages;
        });

        const loadingKey = isCollectionScope ? `col:${selectedCollection}` : selectedDocument;
        setLoadingStates(prev => ({ ...prev, [loadingKey]: true }));
        
        try {
            const response = isCollectionScope
                ? await chatService.query({ collectionId: selectedCollection, question: messageText })
                : await documentService.query(messageText, selectedDocument);
            const aiMessage = {
                type: 'ai',
                content: response.data.answer,
                sources: response.data.sources || []
            };
            setMessages(prev => {
                const newMessages = [...prev, aiMessage];
                setTimeout(scrollToBottom, 100);
                return newMessages;
            });
            
            if (!isCollectionScope) {
                // Move active document to top of list
                setDocuments(prev => {
                    const activeDoc = prev.find(doc => doc._id === selectedDocument);
                    const otherDocs = prev.filter(doc => doc._id !== selectedDocument);
                    return activeDoc ? [activeDoc, ...otherDocs] : prev;
                });
            }
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Sorry, I encountered an error processing your question.';
            const errorMessage = { type: 'ai', content: errorMsg };
            setMessages(prev => {
                const newMessages = [...prev, errorMessage];
                setTimeout(scrollToBottom, 100);
                return newMessages;
            });
        }
        setLoadingStates(prev => ({ ...prev, [loadingKey]: false }));
    };

    const selectDocument = async (docId) => {
        setCurrentMessage('');
        setSelectedDocument(docId);
        setQueryScope('document');
        setShowUpload(false);

        const currentDoc = documents.find(d => d._id === docId);
        if (currentDoc && currentDoc.status === 'failed') {
            setMessages([{ type: 'ai', content: '⚠️ This document failed text extraction during upload and cannot be queried. Please delete it and upload a valid PDF or DOCX.' }]);
            return;
        }

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
                await loadDocuments();
                if (selectedDocument === docId) {
                    startNewChat();
                }
                toast.success('Document deleted successfully');
            } catch (error) {
                toast.error(error.response?.data?.message || 'Failed to delete document');
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
            {!user?.isAccountVerified && (
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
                        <div className="mb-3">
                            <label className="block text-xs font-semibold text-gray-400 mb-1">Collection</label>
                            <select
                                value={selectedCollection}
                                onChange={async (e) => {
                                    const colId = e.target.value;
                                    setSelectedCollection(colId);
                                    if (queryScope === 'collection') {
                                        setShowUpload(false);
                                        try {
                                            const res = await chatService.getHistory(colId);
                                            setMessages(res.data.messages || []);
                                        } catch {
                                            setMessages([]);
                                        }
                                    }
                                }}
                                className="w-full bg-gray-800 text-white text-sm rounded px-2 py-1.5 border border-gray-700"
                            >
                                {collections.map((col) => (
                                    <option key={col._id} value={col._id}>{col.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="mb-3 flex rounded overflow-hidden border border-gray-700 text-xs">
                            <button
                                type="button"
                                onClick={async () => {
                                    setQueryScope('collection');
                                    setShowUpload(false);
                                    if (selectedCollection) {
                                        try {
                                            const res = await chatService.getHistory(selectedCollection);
                                            setMessages(res.data.messages || []);
                                        } catch {
                                            setMessages([]);
                                        }
                                    }
                                }}
                                className={`flex-1 py-1.5 ${queryScope === 'collection' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300'}`}
                            >
                                Collection
                            </button>
                            <button
                                type="button"
                                onClick={() => setQueryScope('document')}
                                className={`flex-1 py-1.5 ${queryScope === 'document' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300'}`}
                            >
                                Document
                            </button>
                        </div>

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
                                        className="flex-1 text-left truncate flex items-center gap-1.5"
                                        title={doc.filename}
                                    >
                                        <span className="truncate">{doc.filename}</span>
                                        {doc.status === 'failed' && (
                                            <span className="text-[10px] bg-red-800 text-red-200 px-1 py-0.5 rounded font-mono">Failed</span>
                                        )}
                                        {doc.status === 'partial' && (
                                            <span className="text-[10px] bg-amber-700 text-amber-200 px-1 py-0.5 rounded font-mono">Partial</span>
                                        )}
                                    </button>
                                    <button
                                        onClick={(e) => deleteDoc(doc._id, e)}
                                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 ml-2"
                                        title="Delete document"
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
                                        {isLoading ? 'Uploading & Indexing...' : 'Upload & Start Chat'}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="relative flex flex-col h-full">
                                <div className="flex-1 overflow-y-auto p-4 pb-24">
                                    {queryScope === 'document' && !selectedDocument ? (
                                        <div className="text-center text-gray-500 mt-20">
                                            <p>Select a document to start chatting</p>
                                        </div>
                                    ) : messages.length === 0 ? (
                                        <div className="text-center text-gray-500 mt-20">
                                            <p>{queryScope === 'collection' ? 'Ask me anything about this collection!' : 'Ask me anything about this document!'}</p>
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
                                                        <div className="markdown-body" dangerouslySetInnerHTML={{
                                                            __html: formatMessage(msg.content)
                                                        }} />
                                                        {msg.type === 'ai' && Array.isArray(msg.sources) && msg.sources.length > 0 && (
                                                            <div className="mt-3 pt-2 border-t border-gray-300 text-xs text-gray-700 space-y-1.5">
                                                                <div className="font-semibold text-gray-500 uppercase tracking-wide text-[10px]">Sources</div>
                                                                {msg.sources.map((src) => (
                                                                    <div key={src.id} className="bg-white p-2 rounded border border-gray-200">
                                                                        <div className="font-medium text-gray-800">
                                                                            [{src.id}] {src.sourcePath || src.filename}
                                                                            {src.sectionPath?.length > 0 && ` > ${src.sectionPath.join(' > ')}`}
                                                                            {src.pageStart != null && ` (p. ${src.pageStart}${src.pageEnd && src.pageEnd !== src.pageStart ? `-${src.pageEnd}` : ''})`}
                                                                        </div>
                                                                        {src.snippet && (
                                                                            <p className="text-gray-600 mt-0.5 line-clamp-2">{src.snippet}</p>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            {(loadingStates[queryScope === 'collection' ? `col:${selectedCollection}` : selectedDocument]) && (
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
                                            maxLength={2000}
                                            value={currentMessage || ''}
                                            onChange={(e) => setCurrentMessage(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                            placeholder={queryScope === 'collection' ? 'Ask about this collection (max 2000 chars)...' : 'Ask about this document (max 2000 chars)...'}
                                            className="flex-1 p-3 border rounded-lg"
                                            disabled={loadingStates[queryScope === 'collection' ? `col:${selectedCollection}` : selectedDocument] || (queryScope === 'collection' ? !selectedCollection : !selectedDocument)}
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
