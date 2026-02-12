import React, { useState, useEffect, useRef } from 'react';
import { FaUpload, FaTrash, FaDownload, FaEye, FaPlus, FaFileUpload, FaEdit } from 'react-icons/fa';
import { employeeDocumentService, DOCUMENT_TYPES, formatFileSize, getFileIcon, getDocumentTypeName } from '../../../../services/hr/employeeDocumentService.js';
import { useSnackbar } from '../../../../contexts/SnackbarContext.jsx';
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog.jsx';
import './DocumentsTab.scss';

const DocumentsTab = ({ employee, onRefresh }) => {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploadingIdFront, setUploadingIdFront] = useState(false);
    const [uploadingIdBack, setUploadingIdBack] = useState(false);
    const [uploadingDocument, setUploadingDocument] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState({ show: false, documentId: null });

    const { showSuccess, showError } = useSnackbar();
    const idFrontInputRef = useRef(null);
    const idBackInputRef = useRef(null);
    const documentInputRef = useRef(null);

    useEffect(() => {
        if (employee?.id) {
            fetchDocuments();
        }
    }, [employee?.id]);

    const fetchDocuments = async () => {
        try {
            setLoading(true);
            const response = await employeeDocumentService.getDocuments(employee.id);
            setDocuments(response.documents || []);
        } catch (error) {
            console.error('Error fetching documents:', error);
            showError('Failed to load documents');
        } finally {
            setLoading(false);
        }
    };

    const handleIdCardUpload = async (file, isFront) => {
        if (!file) return;

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
            showError('Please upload only JPG, PNG, or PDF files');
            return;
        }

        // Validate file size (5MB max)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            showError('File size must not exceed 5MB');
            return;
        }

        try {
            isFront ? setUploadingIdFront(true) : setUploadingIdBack(true);

            await employeeDocumentService.updateIdCard(
                employee.id,
                file,
                isFront,
                'Admin' // You can pass actual user info here
            );

            showSuccess(`ID Card ${isFront ? 'Front' : 'Back'} updated successfully`);
            await fetchDocuments();

            // Refresh employee details if callback provided
            if (onRefresh) {
                await onRefresh();
            }
        } catch (error) {
            console.error('Error uploading ID card:', error);
            showError(`Failed to upload ID card ${isFront ? 'front' : 'back'}`);
        } finally {
            isFront ? setUploadingIdFront(false) : setUploadingIdBack(false);
        }
    };

    const handleDocumentUpload = async (files, documentType, description) => {
        if (!files || files.length === 0) return;

        // Validate file types
        const allowedTypes = [
            'image/jpeg', 'image/png', 'image/jpg',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];

        for (const file of files) {
            if (!allowedTypes.includes(file.type)) {
                showError(`${file.name}: Invalid file type. Please upload PDF, DOC, DOCX, JPG, or PNG files.`);
                return;
            }

            // Validate file size (10MB max)
            const maxSize = 10 * 1024 * 1024;
            if (file.size > maxSize) {
                showError(`${file.name}: File size must not exceed 10MB`);
                return;
            }
        }

        try {
            setUploadingDocument(true);

            if (files.length === 1) {
                await employeeDocumentService.uploadDocument(
                    employee.id,
                    files[0],
                    documentType,
                    description,
                    'Admin'
                );
            } else {
                await employeeDocumentService.uploadMultipleDocuments(
                    employee.id,
                    Array.from(files),
                    documentType,
                    description,
                    'Admin'
                );
            }

            showSuccess(`${files.length} document(s) uploaded successfully`);
            await fetchDocuments();
            setShowUploadModal(false);
        } catch (error) {
            console.error('Error uploading document:', error);
            showError('Failed to upload document(s)');
        } finally {
            setUploadingDocument(false);
        }
    };

    const handleDeleteDocument = async (documentId) => {
        try {
            await employeeDocumentService.deleteDocument(employee.id, documentId);
            showSuccess('Document deleted successfully');
            await fetchDocuments();
            setDeleteConfirmation({ show: false, documentId: null });
        } catch (error) {
            console.error('Error deleting document:', error);
            showError('Failed to delete document');
        }
    };

    const handleDownloadDocument = (fileUrl, fileName) => {
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = fileName || 'document';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleViewDocument = (fileUrl) => {
        window.open(fileUrl, '_blank');
    };

    // Get related documents (excluding ID cards)
    const relatedDocuments = documents.filter(
        doc => doc.documentType !== 'ID_CARD_FRONT' && doc.documentType !== 'ID_CARD_BACK'
    );

    return (
        <div className="documents-tab">
            {/* ID Cards Section */}
            <div className="documents-section">
                <h3 className="section-title">ID Card Images</h3>
                <div className="id-cards-grid">
                    {/* ID Card Front */}
                    <div className="id-card-container">
                        <div className="id-card-header">
                            <h4>ID Card - Front</h4>
                            <button
                                className="btn btn-sm btn-primary"
                                onClick={() => idFrontInputRef.current?.click()}
                                disabled={uploadingIdFront}
                            >
                                {uploadingIdFront ? (
                                    <>Uploading...</>
                                ) : (
                                    <>
                                        <FaUpload /> {employee.idFrontImage ? 'Update' : 'Upload'}
                                    </>
                                )}
                            </button>
                            <input
                                ref={idFrontInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/jpg,application/pdf"
                                onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (file) handleIdCardUpload(file, true);
                                    e.target.value = '';
                                }}
                                style={{ display: 'none' }}
                            />
                        </div>
                        <div className="id-card-preview">
                            {employee.idFrontImage ? (
                                <>
                                    <img
                                        src={employee.idFrontImage}
                                        alt="ID Card Front"
                                        onClick={() => handleViewDocument(employee.idFrontImage)}
                                        className="clickable"
                                    />
                                    <div className="preview-overlay">
                                        <button
                                            className="btn-icon"
                                            onClick={() => handleViewDocument(employee.idFrontImage)}
                                            title="View Full Size"
                                        >
                                            <FaEye />
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="no-image-placeholder">
                                    <FaFileUpload />
                                    <span>No image uploaded</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ID Card Back */}
                    <div className="id-card-container">
                        <div className="id-card-header">
                            <h4>ID Card - Back</h4>
                            <button
                                className="btn btn-sm btn-primary"
                                onClick={() => idBackInputRef.current?.click()}
                                disabled={uploadingIdBack}
                            >
                                {uploadingIdBack ? (
                                    <>Uploading...</>
                                ) : (
                                    <>
                                        <FaUpload /> {employee.idBackImage ? 'Update' : 'Upload'}
                                    </>
                                )}
                            </button>
                            <input
                                ref={idBackInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/jpg,application/pdf"
                                onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (file) handleIdCardUpload(file, false);
                                    e.target.value = '';
                                }}
                                style={{ display: 'none' }}
                            />
                        </div>
                        <div className="id-card-preview">
                            {employee.idBackImage ? (
                                <>
                                    <img
                                        src={employee.idBackImage}
                                        alt="ID Card Back"
                                        onClick={() => handleViewDocument(employee.idBackImage)}
                                        className="clickable"
                                    />
                                    <div className="preview-overlay">
                                        <button
                                            className="btn-icon"
                                            onClick={() => handleViewDocument(employee.idBackImage)}
                                            title="View Full Size"
                                        >
                                            <FaEye />
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="no-image-placeholder">
                                    <FaFileUpload />
                                    <span>No image uploaded</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Related Documents Section */}
            <div className="documents-section">
                <div className="section-header">
                    <h3 className="section-title">Related Documents</h3>
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowUploadModal(true)}
                    >
                        <FaPlus /> Add Document
                    </button>
                </div>

                {loading ? (
                    <div className="loading-state">Loading documents...</div>
                ) : relatedDocuments.length === 0 ? (
                    <div className="emp-documents-empty-state">
                        <FaFileUpload className="empty-icon" />
                        <p>No documents uploaded yet</p>
                        <button
                            className="btn btn-primary"
                            onClick={() => setShowUploadModal(true)}
                        >
                            Upload Document
                        </button>
                    </div>
                ) : (
                    <div className="documents-list">
                        {relatedDocuments.map((doc) => (
                            <div key={doc.id} className="document-item">
                                <div className="document-icon">
                                    {getFileIcon(doc.mimeType)}
                                </div>
                                <div className="document-info">
                                    <div className="document-name">{doc.fileName}</div>
                                    <div className="document-meta">
                                        <span className="document-type">{getDocumentTypeName(doc.documentType)}</span>
                                        <span className="document-size">{formatFileSize(doc.fileSize)}</span>
                                        <span className="document-date">
                                            {new Date(doc.uploadedAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    {doc.description && (
                                        <div className="document-description">{doc.description}</div>
                                    )}
                                </div>
                                <div className="document-actions">
                                    <button
                                        className="btn-icon"
                                        onClick={() => handleViewDocument(doc.fileUrl)}
                                        title="View"
                                    >
                                        <FaEye />
                                    </button>
                                    <button
                                        className="btn-icon"
                                        onClick={() => handleDownloadDocument(doc.fileUrl, doc.fileName)}
                                        title="Download"
                                    >
                                        <FaDownload />
                                    </button>
                                    <button
                                        className="btn-icon danger"
                                        onClick={() => setDeleteConfirmation({ show: true, documentId: doc.id })}
                                        title="Delete"
                                    >
                                        <FaTrash />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Upload Document Modal */}
            {showUploadModal && (
                <DocumentUploadModal
                    onClose={() => setShowUploadModal(false)}
                    onUpload={handleDocumentUpload}
                    uploading={uploadingDocument}
                />
            )}

            {/* Delete Confirmation Dialog */}
            <ConfirmationDialog
                isOpen={deleteConfirmation.show}
                title="Delete Document"
                message="Are you sure you want to delete this document? This action cannot be undone."
                type="danger"
                confirmText="Delete"
                cancelText="Cancel"
                onConfirm={() => handleDeleteDocument(deleteConfirmation.documentId)}
                onCancel={() => setDeleteConfirmation({ show: false, documentId: null })}
            />
        </div>
    );
};

// Document Upload Modal Component
const DocumentUploadModal = ({ onClose, onUpload, uploading }) => {
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [documentType, setDocumentType] = useState('OTHER');
    const [description, setDescription] = useState('');
    const fileInputRef = useRef(null);

    // Lock body scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        setSelectedFiles(files);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (selectedFiles.length > 0) {
            onUpload(selectedFiles, documentType, description);
        }
    };

    const removeFile = (index) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Upload Document</h3>
                    <button className="btn-close" onClick={onClose}>×</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label>Document Type *</label>
                            <select
                                value={documentType}
                                onChange={(e) => setDocumentType(e.target.value)}
                                required
                            >
                                {Object.entries(DOCUMENT_TYPES)
                                    .filter(([key]) => !key.includes('ID_CARD'))
                                    .map(([key, value]) => (
                                        <option key={key} value={value}>
                                            {getDocumentTypeName(value)}
                                        </option>
                                    ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Optional description..."
                                rows="3"
                            />
                        </div>

                        <div className="form-group">
                            <label>Select Files *</label>
                            <div className="file-upload-area" onClick={() => fileInputRef.current?.click()}>
                                <FaUpload />
                                <p>Click to select files or drag and drop</p>
                                <span className="file-hint">PDF, DOC, DOCX, JPG, PNG (max 10MB each)</span>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                onChange={handleFileSelect}
                                style={{ display: 'none' }}
                            />
                        </div>

                        {selectedFiles.length > 0 && (
                            <div className="selected-files">
                                <h4>Selected Files ({selectedFiles.length})</h4>
                                {selectedFiles.map((file, index) => (
                                    <div key={index} className="selected-file">
                                        <span>{file.name} ({formatFileSize(file.size)})</span>
                                        <button
                                            type="button"
                                            className="btn-remove"
                                            onClick={() => removeFile(index)}
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>


                </form>
                <div className="modal-footer">
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={onClose}
                        disabled={uploading}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        onClick={handleSubmit}
                        disabled={selectedFiles.length === 0 || uploading}
                    >
                        {uploading ? 'Uploading...' : 'Upload'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DocumentsTab;