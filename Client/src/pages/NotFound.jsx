import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
    return (
        <div className="auth-container text-center">
            <h1 className="text-6xl font-extrabold text-indigo-600">404</h1>
            <p className="text-2xl font-semibold text-gray-800 mt-4">Page Not Found</p>
            <p className="text-gray-600 mt-2">Sorry, the page you are looking for does not exist.</p>
            <Link to="/" className="mt-6 inline-block px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                Go to Homepage
            </Link>
        </div>
    );
};

export default NotFound;