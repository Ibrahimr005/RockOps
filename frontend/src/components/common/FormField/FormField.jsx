import React from 'react';
import PropTypes from 'prop-types';
import './FormField.scss';

/**
 * FormField - A reusable form field wrapper component
 *
 * Provides consistent styling for:
 * - Label with optional required indicator
 * - Input/select/textarea elements
 * - Error message display
 * - Help text
 * - Disabled state styling
 */
const FormField = ({
    label,
    htmlFor,
    required = false,
    error,
    helpText,
    children,
    className = '',
    inline = false,
    disabled = false
}) => {
    const fieldClasses = [
        'form-field',
        inline ? 'form-field--inline' : '',
        error ? 'form-field--error' : '',
        disabled ? 'form-field--disabled' : '',
        className
    ].filter(Boolean).join(' ');

    return (
        <div className={fieldClasses}>
            {label && (
                <label
                    className="form-field-label"
                    htmlFor={htmlFor}
                >
                    {label}
                    {required && <span className="form-field-required">*</span>}
                </label>
            )}
            <div className="form-field-input-wrapper">
                {children}
            </div>
            {error && (
                <span className="form-field-error" role="alert">
                    {error}
                </span>
            )}
            {helpText && !error && (
                <span className="form-field-help">
                    {helpText}
                </span>
            )}
        </div>
    );
};

FormField.propTypes = {
    label: PropTypes.string,
    htmlFor: PropTypes.string,
    required: PropTypes.bool,
    error: PropTypes.string,
    helpText: PropTypes.string,
    children: PropTypes.node.isRequired,
    className: PropTypes.string,
    inline: PropTypes.bool,
    disabled: PropTypes.bool
};

export default FormField;
