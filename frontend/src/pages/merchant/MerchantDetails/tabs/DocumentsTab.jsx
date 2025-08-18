import React from 'react';
import { FaFileAlt, FaDownload, FaUpload, FaEye, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import "../MerchantDetails.scss"

const DocumentsTab = ({ merchant }) => {
    // Document types based on merchant business requirements
    const documentTypes = [
        {
            type: 'Business License',
            key: 'businessLicense',
            required: true,
            mockStatus: 'uploaded',
            description: 'Valid business registration certificate'
        },
        {
            type: 'Tax Certificate',
            key: 'taxCertificate',
            required: true,
            mockStatus: merchant.taxIdentificationNumber ? 'uploaded' : 'missing',
            description: 'Tax identification and compliance certificate'
        },
        {
            type: 'Insurance Certificate',
            key: 'insuranceCertificate',
            required: merchant.reliabilityScore >= 4.0,
            mockStatus: merchant.reliabilityScore >= 4.0 ? 'uploaded' : 'not_required',
            description: 'General liability insurance documentation'
        },
        {
            type: 'Bank Details',
            key: 'bankCertificate',
            required: merchant.preferredPaymentMethod === 'Bank Transfer',
            mockStatus: merchant.preferredPaymentMethod === 'Bank Transfer' ? 'uploaded' : 'not_required',
            description: 'Banking information for payment processing'
        },
        {
            type: 'Quality Certification',
            key: 'qualityCertification',
            required: false,
            mockStatus: merchant.reliabilityScore >= 4.5 ? 'uploaded' : 'missing',
            description: 'ISO or other quality management certifications'
        },
        {
            type: 'Service Agreement',
            key: 'serviceAgreement',
            required: true,
            mockStatus: 'uploaded',
            description: 'Signed service terms and conditions'
        },
        {
            type: 'W-9 Form',
            key: 'w9Form',
            required: merchant.taxIdentificationNumber ? true : false,
            mockStatus: merchant.taxIdentificationNumber ? 'uploaded' : 'missing',
            description: 'US tax form for vendor payments'
        },
        {
            type: 'References',
            key: 'references',
            required: false,
            mockStatus: merchant.reliabilityScore >= 3.5 ? 'uploaded' : 'missing',
            description: 'Customer references and testimonials'
        }
    ];

    const handleViewDocument = (documentType) => {
        // Mock document viewing
        console.log(`Viewing document: ${documentType}`);
        alert(`Opening ${documentType} document...`);
    };

    const handleDownloadDocument = (documentType) => {
        // Mock document download
        console.log(`Downloading document: ${documentType}`);
        alert(`Downloading ${documentType} document...`);
    };

    const handleUploadDocument = (documentType) => {
        // Mock document upload
        console.log(`Upload document for: ${documentType}`);
        alert(`Opening file picker for ${documentType}...`);
    };

    const hasDocument = (docType) => {
        return docType.mockStatus === 'uploaded';
    };

    const isRequired = (docType) => {
        return docType.required;
    };

    const getStatusInfo = (docType) => {
        switch(docType.mockStatus) {
            case 'uploaded':
                return { text: 'Uploaded', color: 'var(--color-success)', icon: FaCheckCircle };
            case 'missing':
                return { text: docType.required ? 'Required - Missing' : 'Not uploaded', color: docType.required ? 'var(--color-danger)' : 'var(--color-text-tertiary)', icon: FaExclamationTriangle };
            case 'not_required':
                return { text: 'Not required', color: 'var(--color-text-tertiary)', icon: null };
            default:
                return { text: 'Unknown', color: 'var(--color-text-tertiary)', icon: null };
        }
    };

    const uploadedCount = documentTypes.filter(doc => hasDocument(doc)).length;
    const requiredCount = documentTypes.filter(doc => isRequired(doc)).length;
    const missingRequiredCount = documentTypes.filter(doc => isRequired(doc) && !hasDocument(doc)).length;

    return (
        <div className="merchant-details-tab-panel">
            <h3>Documents & Certifications</h3>

            {/* Document Summary Cards */}
            <div className="merchant-details-terms-grid" style={{ marginBottom: '2rem' }}>
                <div className="merchant-details-term-card">
                    <div className="merchant-details-term-title">Total Documents</div>
                    <div className="merchant-details-term-value">
                        {documentTypes.length}
                    </div>
                </div>

                <div className="merchant-details-term-card">
                    <div className="merchant-details-term-title">Uploaded</div>
                    <div className="merchant-details-term-value merchant-details-delivery-time">
                        {uploadedCount}
                    </div>
                </div>

                <div className="merchant-details-term-card">
                    <div className="merchant-details-term-title">Required</div>
                    <div className="merchant-details-term-value merchant-details-payment-method">
                        {requiredCount}
                    </div>
                </div>

                <div className="merchant-details-term-card">
                    <div className="merchant-details-term-title">Missing Required</div>
                    <div className="merchant-details-term-value" style={{ color: missingRequiredCount > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                        {missingRequiredCount}
                    </div>
                </div>
            </div>

            <div className="merchant-details-documents-grid">
                {documentTypes.map((docType, index) => {
                    const hasDoc = hasDocument(docType);
                    const statusInfo = getStatusInfo(docType);
                    const StatusIcon = statusInfo.icon;

                    return (
                        <div key={index} className="merchant-details-document-card">
                            <div className="merchant-details-document-thumbnail">
                                {hasDoc ? (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: 'linear-gradient(135deg, var(--color-success-light), var(--color-success))',
                                        color: 'white'
                                    }}>
                                        <FaCheckCircle style={{ fontSize: '3rem' }} />
                                    </div>
                                ) : (
                                    <div className="merchant-details-document-placeholder">
                                        <FaFileAlt className="merchant-details-document-icon" />
                                    </div>
                                )}
                            </div>

                            <div className="merchant-details-document-info">
                                <h4>
                                    {docType.type}
                                    {docType.required && <span style={{ color: 'var(--color-danger)', marginLeft: '0.5rem' }}>*</span>}
                                </h4>

                                <p style={{
                                    fontSize: '0.85rem',
                                    color: 'var(--color-text-secondary)',
                                    marginBottom: '1rem',
                                    fontStyle: 'italic'
                                }}>
                                    {docType.description}
                                </p>

                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    marginBottom: '1rem',
                                    gap: '0.5rem'
                                }}>
                                    {StatusIcon && <StatusIcon style={{ color: statusInfo.color }} />}
                                    <span style={{ color: statusInfo.color, fontWeight: '600' }}>
                                        {statusInfo.text}
                                    </span>
                                </div>

                                {hasDoc ? (
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <button
                                            className="merchant-details-view-document"
                                            onClick={() => handleViewDocument(docType.type)}
                                        >
                                            <FaEye /> View
                                        </button>
                                        <button
                                            className="merchant-details-view-document"
                                            onClick={() => handleDownloadDocument(docType.type)}
                                            style={{ backgroundColor: 'var(--color-success)' }}
                                        >
                                            <FaDownload /> Download
                                        </button>
                                    </div>
                                ) : docType.mockStatus !== 'not_required' ? (
                                    <button
                                        className="merchant-details-upload-document"
                                        onClick={() => handleUploadDocument(docType.type)}
                                    >
                                        <FaUpload /> Upload
                                    </button>
                                ) : (
                                    <div style={{ color: 'var(--color-text-tertiary)', fontSize: '0.9rem' }}>
                                        Not required for this merchant type
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="merchant-details-info-grid" style={{ marginTop: '3rem' }}>
                <div className="merchant-details-info-group">
                    <h4>Document Status Summary</h4>
                    <div className="merchant-details-info-item">
                        <label>Compliance Status</label>
                        <p className="merchant-details-status-indicator" style={{
                            color: missingRequiredCount === 0 ? 'var(--color-success)' : 'var(--color-danger)'
                        }}>
                            {missingRequiredCount === 0 ? 'Compliant' : 'Non-Compliant'}
                        </p>
                    </div>
                    <div className="merchant-details-info-item">
                        <label>Document Completion</label>
                        <p className="merchant-details-highlight-value">
                            {Math.round((uploadedCount / Math.max(requiredCount, 1)) * 100)}% Complete
                        </p>
                    </div>
                    <div className="merchant-details-info-item">
                        <label>Verification Status</label>
                        <p className="merchant-details-status-indicator">
                            {missingRequiredCount === 0 ? 'Verified' : 'Pending'}
                        </p>
                    </div>
                    <div className="merchant-details-info-item">
                        <label>Last Document Update</label>
                        <p className="merchant-details-date-value">
                            {new Date().toLocaleDateString()}
                        </p>
                    </div>
                </div>

                <div className="merchant-details-info-group">
                    <h4>Document Requirements</h4>
                    <div className="merchant-details-info-item">
                        <label>Merchant Type</label>
                        <p>
                            <span className="merchant-details-merchant-type">
                                {merchant.merchantType || 'Standard'}
                            </span>
                        </p>
                    </div>
                    <div className="merchant-details-info-item">
                        <label>Risk Level</label>
                        <p className="merchant-details-status-indicator">
                            {merchant.reliabilityScore >= 4.0 ? 'Low Risk' :
                                merchant.reliabilityScore >= 3.0 ? 'Medium Risk' : 'High Risk'}
                        </p>
                    </div>
                    <div className="merchant-details-info-item">
                        <label>Required Documents</label>
                        <p>{requiredCount} documents</p>
                    </div>
                    <div className="merchant-details-info-item">
                        <label>Optional Documents</label>
                        <p>{documentTypes.length - requiredCount} documents</p>
                    </div>
                </div>

                <div className="merchant-details-info-group">
                    <h4>Upload Guidelines</h4>
                    <div className="merchant-details-info-item">
                        <label>Accepted Formats</label>
                        <p>PDF, JPG, PNG, DOC, DOCX</p>
                    </div>
                    <div className="merchant-details-info-item">
                        <label>Maximum File Size</label>
                        <p>10 MB per document</p>
                    </div>
                    <div className="merchant-details-info-item">
                        <label>Document Validity</label>
                        <p>Documents must be current and unexpired</p>
                    </div>
                    <div className="merchant-details-info-item">
                        <label>Processing Time</label>
                        <p>2-3 business days for verification</p>
                    </div>
                </div>

                <div className="merchant-details-info-group">
                    <h4>Audit Information</h4>
                    <div className="merchant-details-info-item">
                        <label>Last Audit Date</label>
                        <p className="merchant-details-date-value">
                            {new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                        </p>
                    </div>
                    <div className="merchant-details-info-item">
                        <label>Next Review Date</label>
                        <p className="merchant-details-date-value">
                            {new Date(Date.now() + 335 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                        </p>
                    </div>
                    <div className="merchant-details-info-item">
                        <label>Document Retention</label>
                        <p>7 years as per company policy</p>
                    </div>
                    <div className="merchant-details-info-item">
                        <label>Renewal Notifications</label>
                        <p>90 days before expiry</p>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div style={{
                marginTop: '2rem',
                padding: '1.5rem',
                backgroundColor: 'var(--color-surface)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)'
            }}>
                <h4 style={{ marginTop: 0, marginBottom: '1rem' }}>Quick Actions</h4>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <button className="merchant-details-edit-merchant-btn">
                        Request Missing Documents
                    </button>
                    <button className="merchant-details-view-details-btn">
                        Download All Documents
                    </button>
                    <button className="merchant-details-create-order-btn">
                        Send Reminder Email
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DocumentsTab;