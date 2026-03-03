import React, { useEffect } from 'react';
import { FiDownload } from 'react-icons/fi';
import { CloseButton } from '../../../../../components/common/Button';
import './LanguageSelectionModal.scss';

const LanguageSelectionModal = ({ isVisible, onClose, onSelectLanguage, title }) => {
    useEffect(() => {
        if (isVisible) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isVisible]);

    if (!isVisible) return null;

    const handleLanguageSelect = (language) => {
        onSelectLanguage(language);
        onClose();
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content modal-sm language-selection-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">
                        <FiDownload /> {title || 'Select Language'}
                    </h3>
                    <CloseButton onClick={onClose} />
                </div>

                <div className="modal-body">
                    <p className="language-description">
                        Choose the language for the receiving document:
                    </p>

                    <div className="language-options">
                        <button
                            className="language-option-btn english"
                            onClick={() => handleLanguageSelect('en')}
                        >
                            <div className="language-flag">🇬🇧</div>
                            <div className="language-info">
                                <h4>English</h4>
                                <p>Left-to-right format</p>
                            </div>
                        </button>

                        <button
                            className="language-option-btn arabic"
                            onClick={() => handleLanguageSelect('ar')}
                        >
                            <div className="language-flag">🇸🇦</div>
                            <div className="language-info">
                                <h4>العربية</h4>
                                <p>تنسيق من اليمين إلى اليسار</p>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LanguageSelectionModal;