import React from 'react';

const Input = ({ id, name, type = 'text', value, onChange, placeholder, required = false, ...props }) => {
    return (
        <input
            id={id}
            name={name}
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            className={`appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-text-light text-text-main focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm transition-colors duration-300 ${props.className || ''}`}
            {...props}
        />
    );
};

export default Input;