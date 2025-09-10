import React from 'react';

const Button = ({ children, type = 'button', onClick, disabled = false, className = '', ...props }) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex justify-center py-2 px-4 border border-transparent bg-black rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer transition-colors duration-300 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
