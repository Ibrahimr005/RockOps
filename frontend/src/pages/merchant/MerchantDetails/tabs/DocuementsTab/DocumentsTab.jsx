import React, { useState, useEffect } from 'react';
import { FaFileAlt, FaDownload, FaUpload, FaEye, FaTrash, FaPlus, FaSync, FaCalendar, FaUser, FaFolder } from 'react-icons/fa';
import { documentService } from '../../../../../services/documentService';
import ConfirmationDialog from '../../../../../components/common/ConfirmationDialog/ConfirmationDialog';
import Snackbar from '../../../../../components/common/Snackbar/Snackbar';
import "./DocumentsTab.scss";

const DocumentsTab = ({ merchant }) => {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadForm, setUploadForm] = useState({
        name: '',
        type: '',
        file: null
    });

    // Confirmation Dialog State
    const [confirmDialog, setConfirmDialog] = useState({
        isVisible: false,
        type: 'warning',
        title: '',
        message: '',
        onConfirm: null,
        documentToDelete: null
    });

    // Snackbar State
    const [snackbar, setSnackbar] = useState({
        show: false,
        type: 'success',
        message: ''
    });

    useEffect(() => {
        if (merchant?.id) {
            fetchDocuments();
        }
    }, [merchant]);

    const fetchDocuments = async () => {
        try {
            setLoading(true);
            const response = await documentService.getByEntity('merchant', merchant.id);
            setDocuments(response.data || []);
        } catch (error) {
            console.error('Error fetching documents:', error);
            setDocuments([]);
            showSnackbar('error', 'Failed to load documents');
        } finally {
            setLoading(false);
        }
    };

    const showSnackbar = (type, message) => {
        setSnackbar({
            show: true,
            type,
            message
        });
    };

    const handleUpload = async (e) => {
        e.preventDefault();

        if (!uploadForm.file || !uploadForm.name || !uploadForm.type) {
            showSnackbar('warning', 'Please fill in all fields');
            return;
        }

        try {
            setUploading(true);
            await documentService.create('merchant', merchant.id, uploadForm);

            // Reset form and close modal
            setUploadForm({ name: '', type: '', file: null });
            setShowUploadModal(false);

            // Refresh documents list
            await fetchDocuments();

            showSnackbar('success', 'Document uploaded successfully!');
        } catch (error) {
            console.error('Error uploading document:', error);
            showSnackbar('error', 'Failed to upload document. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteClick = (document) => {
        setConfirmDialog({
            isVisible: true,
            type: 'danger',
            title: 'Delete Document',
            message: `Are you sure you want to delete "${document.name}"? This action cannot be undone.`,
            onConfirm: () => confirmDelete(document.id),
            documentToDelete: document
        });
    };

    const confirmDelete = async (documentId) => {
        try {
            await documentService.delete(documentId);
            await fetchDocuments();
            showSnackbar('success', 'Document deleted successfully!');
        } catch (error) {
            console.error('Error deleting document:', error);
            showSnackbar('error', 'Failed to delete document. Please try again.');
        } finally {
            setConfirmDialog({ ...confirmDialog, isVisible: false });
        }
    };

    const handleView = (document) => {
        if (document.url) {
            window.open(document.url, '_blank');
        } else {
            showSnackbar('warning', 'Document URL not available');
        }
    };

    const handleDownload = async (document) => {
        if (document.url) {
            try {
                // Fetch the file as a blob
                const response = await fetch(document.url);
                const blob = await response.blob();

                // Create a blob URL and trigger download
                const blobUrl = window.URL.createObjectURL(blob);
                const link = window.document.createElement('a');
                link.href = blobUrl;
                link.download = document.name || 'document';
                window.document.body.appendChild(link);
                link.click();
                window.document.body.removeChild(link);

                // Clean up the blob URL
                window.URL.revokeObjectURL(blobUrl);

                showSnackbar('success', 'Document downloaded successfully');
            } catch (error) {
                console.error('Download error:', error);
                // Fallback to opening in new tab if download fails
                window.open(document.url, '_blank');
                showSnackbar('info', 'Document opened in new tab');
            }
        } else {
            showSnackbar('warning', 'Document URL not available');
        }
    };

    const formatFileSize = (size) => {
        if (!size) return 'Unknown size';
        return size;
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getTotalSize = () => {
        const totalBytes = documents.reduce((total, doc) => total + (doc.fileSize || 0), 0);
        if (totalBytes > 1024 * 1024) {
            return `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`;
        } else if (totalBytes > 1024) {
            return `${(totalBytes / 1024).toFixed(2)} KB`;
        }
        return `${totalBytes} B`;
    };

    const getDocumentTypeCount = () => {
        return [...new Set(documents.map(doc => doc.type))].length;
    };

    if (loading) {
        return (
            <div className="documents-tab">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <h4>Loading Documents</h4>
                    <p>Please wait while we fetch your documents...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="documents-tab">
            {/* Section Header */}
            <div className="section-header-documents">
                <h3>
                    <FaFileAlt />
                    Documents & Certifications
                </h3>
                <div className="header-actions">

                    <button className="btn-primary" onClick={() => setShowUploadModal(true)}>
                        <FaPlus />
                        Upload Document
                    </button>
                </div>
            </div>

            {/* Document Summary Cards */}
            <div className="documents-summary-grid">
                <div className="summary-card">
                    <div className="summary-icon">
                        <FaFileAlt />
                    </div>
                    <div className="summary-content">
                        <div className="summary-label">Total Documents</div>
                        <div className="summary-value">{documents.length}</div>
                    </div>
                </div>

                <div className="summary-card">
                    <div className="summary-icon">
                        <FaCalendar />
                    </div>
                    <div className="summary-content">
                        <div className="summary-label">Last Upload</div>
                        <div className="summary-value">
                            {documents.length > 0 ? formatDate(documents[0].dateUploaded) : 'N/A'}
                        </div>
                    </div>
                </div>

                <div className="summary-card">
                    <div className="summary-icon">
                        <FaFolder />
                    </div>
                    <div className="summary-content">
                        <div className="summary-label">Total Size</div>
                        <div className="summary-value">{getTotalSize()}</div>
                    </div>
                </div>

                <div className="summary-card">
                    <div className="summary-icon">
                        <FaFolder />
                    </div>
                    <div className="summary-content">
                        <div className="summary-label">Document Types</div>
                        <div className="summary-value">{getDocumentTypeCount()}</div>
                    </div>
                </div>
            </div>

            {/* Documents Grid or Empty State */}
            {/* Separator (only shown if there are documents) */}
            {documents.length > 0 && (
                <div className="documents-separator"></div>
            )}

            {/* Documents Grid or Empty State */}
            {documents.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">
                        <FaFileAlt />
                    </div>
                    <div className="empty-content">
                        <h4 className="empty-title">No Documents Yet</h4>
                        <p className="empty-description">
                            Upload documents to keep track of merchant certifications, agreements, and other important files.
                        </p>

                    </div>
                </div>
            ) : (
                <div className="documents-grid">
                    {documents.map((document) => (
                        <div key={document.id} className="document-card">
                            <div className="document-header">
                                <div className="document-icon-wrapper">
                                    <FaFileAlt />
                                </div>
                            </div>

                            <div className="document-title-section">
                                <h4>{document.name}</h4>
                                <div className="document-type">{document.type}</div>
                            </div>

                            <div className="document-meta">
                                <div className="meta-row">
                                    <span className="meta-label">Size</span>
                                    <span className="meta-value">{formatFileSize(document.size)}</span>
                                </div>
                                <div className="meta-row">
                                    <span className="meta-label">Uploaded At</span>
                                    <span className="meta-value">{formatDate(document.dateUploaded)}</span>
                                </div>
                                {document.uploadedBy && (
                                    <div className="meta-row">
                                        <span className="meta-label">Uploaded By</span>
                                        <span className="meta-value">{document.uploadedBy}</span>
                                    </div>
                                )}
                            </div>

                            <div className="document-actions">
                                <button
                                    className="btn-view"
                                    onClick={() => handleView(document)}
                                    title="View Document"
                                >
                                    <FaEye />
                                </button>
                                <button
                                    className="btn-download"
                                    onClick={() => handleDownload(document)}
                                    title="Download Document"
                                >
                                    <FaDownload />
                                </button>
                                <button
                                    className="btn-delete"
                                    onClick={() => handleDeleteClick(document)}
                                    title="Delete Document"
                                >
                                    <FaTrash />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="modal-backdrop" onClick={() => !uploading && setShowUploadModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Upload Document</h3>
                            <button onClick={() => !uploading && setShowUploadModal(false)} disabled={uploading}>
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleUpload}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>
                                        Document Name <span className="required">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={uploadForm.name}
                                        onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                                        placeholder="e.g., Business License 2024"
                                        required
                                        disabled={uploading}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>
                                        Document Type <span className="required">*</span>
                                    </label>
                                    <select
                                        value={uploadForm.type}
                                        onChange={(e) => setUploadForm({ ...uploadForm, type: e.target.value })}
                                        required
                                        disabled={uploading}
                                    >
                                        <option value="">Select type...</option>
                                        <option value="Business License">Business License</option>
                                        <option value="Tax Certificate">Tax Certificate</option>
                                        <option value="Insurance Certificate">Insurance Certificate</option>
                                        <option value="Bank Details">Bank Details</option>
                                        <option value="Quality Certification">Quality Certification</option>
                                        <option value="Service Agreement">Service Agreement</option>
                                        <option value="Contract">Contract</option>
                                        <option value="Invoice">Invoice</option>
                                        <option value="Receipt">Receipt</option>
                                        <option value="Compliance Document">Compliance Document</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label>
                                        File <span className="required">*</span>
                                    </label>
                                    <input
                                        type="file"
                                        onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files[0] })}
                                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                        required
                                        disabled={uploading}
                                    />
                                    <span className="form-hint">
                                        Accepted formats: PDF, JPG, PNG, DOC, DOCX (Max 10MB)
                                    </span>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn-cancel"
                                    onClick={() => setShowUploadModal(false)}
                                    disabled={uploading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-submit"
                                    disabled={uploading}
                                >
                                    {uploading ? 'Uploading...' : 'Upload'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirmation Dialog */}
            <ConfirmationDialog
                isVisible={confirmDialog.isVisible}
                type={confirmDialog.type}
                title={confirmDialog.title}
                message={confirmDialog.message}
                confirmText="Delete"
                cancelText="Cancel"
                onConfirm={confirmDialog.onConfirm}
                onCancel={() => setConfirmDialog({ ...confirmDialog, isVisible: false })}
                showIcon={true}
            />

            {/* Snackbar */}
            <Snackbar
                show={snackbar.show}
                type={snackbar.type}
                message={snackbar.message}
                onClose={() => setSnackbar({ ...snackbar, show: false })}
                duration={3000}
            />
        </div>
    );
};

export default DocumentsTab;