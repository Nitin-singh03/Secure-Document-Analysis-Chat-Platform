import React from 'react';
import { Link } from 'react-router-dom';
import { FaFileUpload, FaRobot, FaSearch, FaShieldAlt, FaReact, FaNodeJs } from 'react-icons/fa';
import { SiMongodb, SiExpress } from 'react-icons/si';

const Home = () => {

    const features = [
        {
            icon: <FaFileUpload />,
            title: 'Document Upload',
            description: 'Upload PDF and DOCX documents with automatic text extraction and secure storage in MongoDB.'
        },
        {
            icon: <FaRobot />,
            title: 'AI-Powered RAG',
            description: 'Advanced Retrieval-Augmented Generation using Google Gemini AI for intelligent document querying.'
        },
        {
            icon: <FaSearch />,
            title: 'Smart Search',
            description: 'Context-aware document search with semantic understanding for accurate information retrieval.'
        },
        {
            icon: <FaShieldAlt />,
            title: 'Secure Authentication',
            description: 'JWT-based authentication system with protected routes and user-specific document access.'
        },
        {
            icon: <FaReact />,
            title: 'Real-time Interface',
            description: 'Interactive React frontend with real-time document processing and query responses.'
        },
        {
            icon: <FaNodeJs />,
            title: 'Scalable Backend',
            description: 'Node.js Express server with MongoDB integration for efficient document management.'
        },
    ];

    const techStack = [
        { icon: <SiMongodb size={40} />, name: 'MongoDB' },
        { icon: <SiExpress size={40} />, name: 'Express.js' },
        { icon: <FaReact size={40} />, name: 'React' },
        { icon: <FaNodeJs size={40} />, name: 'Node.js' },
    ];

    return (
        <div className="bg-secondary text-text-main">
            {/* Hero Section */}
            <section className="text-center py-20 px-4">
                <div className="container mx-auto">
                    <h1 className="text-4xl md:text-6xl font-extrabold text-text-main">
                        IntelliDoc RAG - AI Document{' '}
                        <span className="text-primary">Intelligence</span> System
                    </h1>
                    <p className="mt-4 text-lg md:text-xl text-text-light max-w-3xl mx-auto">
                        Upload documents, ask questions, and get intelligent answers powered by Google Gemini AI. Built with the MERN stack for seamless document management and AI-driven insights.
                    </p>
                    <div className="mt-8 flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                        <Link to="/register" className="w-full sm:w-auto px-8 py-3 bg-primary bg-black text-white rounded-md text-lg font-semibold shadow-md hover:bg-primary-hover transition-all duration-300 hover:shadow-lg hover:scale-105">
                            Get Started
                        </Link>
                        <a href="https://github.com/Nitin-singh03/Secure-Document-Analysis-Chat-Platform.git" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto px-8 py-3 bg-text-main text-white rounded-md text-lg font-semibold shadow-md hover:bg-slate-700 bg-black transition-all duration-300 hover:shadow-lg hover:scale-105">
                            View on GitHub
                        </a>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-20 px-4">
                <div className="container mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold">Intelligent Document Processing</h2>
                        <p className="mt-2 text-text-light">AI-powered document analysis with secure user authentication.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {features.map((feature, index) => (
                            <div key={index} className="bg-white p-6 rounded-lg shadow-lg transform hover:-translate-y-2 transition-transform duration-300">
                                <div className="text-primary text-3xl mb-4">{feature.icon}</div>
                                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                                <p className="text-text-light">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Tech Stack Section */}
            <section className="bg-white py-20 px-4">
                <div className="container mx-auto text-center">
                    <h2 className="text-3xl md:text-4xl font-bold">Built with MERN Stack &amp; AI</h2>
                    <p className="mt-2 text-text-light mb-8">Combining modern web technologies with artificial intelligence.</p>
                    <div className="flex justify-center items-center space-x-8 md:space-x-12 text-text-light">
                        {techStack.map((tech) => (
                            <div key={tech.name} className="flex flex-col items-center space-y-2">
                                {tech.icon}
                                <span className="text-sm font-semibold">{tech.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;