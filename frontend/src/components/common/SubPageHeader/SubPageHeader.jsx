import React from 'react';
import PropTypes from 'prop-types';
import './SubPageHeader.scss';

const SubPageHeader = ({
                           title,
                           subtitle,
                           children,
                           className = ''
                       }) => {
    return (
        <div className={`sub-page-header ${className}`}>
            <div className="sub-page-header-text">
                <h2>{title}</h2>
                {subtitle && (
                    <p className="sub-page-header-subtitle">{subtitle}</p>
                )}
            </div>
            {children && (
                <div className="sub-page-header-actions">
                    {children}
                </div>
            )}
        </div>
    );
};

SubPageHeader.propTypes = {
    title: PropTypes.string.isRequired,
    subtitle: PropTypes.string,
    children: PropTypes.node,
    className: PropTypes.string
};

export default SubPageHeader;