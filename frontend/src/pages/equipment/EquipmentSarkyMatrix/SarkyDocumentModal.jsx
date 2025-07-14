import React, { useState, useEffect, useCallback } from 'react';
import { documentService } from '../../../services/documentService';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useEquipmentPermissions } from '../../../utils/rbac';
import {
    SARKY_DOCUMENT_TYPES,
    generateSarkyDocumentName,
    getMonthLabel,
    getDocumentTypeLabel,
    getDocumentTypeColor
} from '../../../constants/documentTypes';
import './SarkyDocumentModal.scss';

const SarkyDocumentModal = ({
                                isOpen,
                                onClose,
                                equipmentId,
                                equipmentName,
                                selectedMonth,
                                selectedYear,
                                onDocumentsChange
                            }) => {
    const { showSuccess, showError } = useSnackbar();
    const auth = useAuth();
    const permissions = useEquipmentPermissions(auth);

    // State management
    const [monthlyDocuments, setMonthlyDocuments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [showUploadForm, setShowUploadForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');

    // Upload form state
    const [selectedFile, setSelectedFile] = useState(null);
    const [documentType, setDocumentType] = useState('DAILY_REPORT');
    const [customName, setCustomName] = useState('');
    const [useAutoNaming, setUseAutoNaming] = useState(true);
    const [dragActive, setDragActive] = useState(false);

    // Document viewer state removed - no longer needed

    // Load monthly documents when modal opens or month/year changes
    useEffect(() => {
        if (isOpen && equipmentId) {
            loadMonthlyDocuments();
        }
    }, [isOpen, equipmentId, selectedMonth, selectedYear]);

    // Load documents for current month
    const loadMonthlyDocuments = async () => {
        setLoading(true);
        try {
            const response = await documentService.getBySarkyMonth('equipment', equipmentId, selectedMonth, selectedYear);
            setMonthlyDocuments(response.data || []);
        } catch (error) {
            console.error('Error loading monthly documents:', error);
            showError('Failed to load monthly documents');
        } finally {
            setLoading(false);
        }
    };

    // Generate auto name when file or type changes
    useEffect(() => {
        if (selectedFile && useAutoNaming && equipmentName) {
            const autoName = generateSarkyDocumentName(
                equipmentName,
                selectedMonth,
                selectedYear,
                selectedFile.name,
                documentType
            );
            setCustomName(autoName);
        }
    }, [selectedFile, documentType, useAutoNaming, equipmentName, selectedMonth, selectedYear]);

    // Filter documents
    const filteredDocuments = monthlyDocuments.filter(doc => {
        const matchesSearch = !searchTerm ||
            doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            getDocumentTypeLabel(doc.type, true).toLowerCase().includes(searchTerm.toLowerCase());

        const matchesType = filterType === 'all' || doc.type === filterType;

        return matchesSearch && matchesType;
    });

    // Handle file selection
    const handleFileSelect = (file) => {
        setSelectedFile(file);
        if (!useAutoNaming && !customName) {
            setCustomName(file.name);
        }
    };

    // Handle drag and drop
    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    }, []);

    // Handle file upload
    const handleUpload = async () => {
        if (!selectedFile || !permissions.canEdit) {
            return;
        }

        setUploading(true);
        try {
            const documentData = {
                name: customName || selectedFile.name,
                type: documentType,
                file: selectedFile
            };

            await documentService.createSarkyDocument('equipment', equipmentId, documentData, selectedMonth, selectedYear);

            showSuccess('Document uploaded successfully');
            setSelectedFile(null);
            setCustomName('');
            setShowUploadForm(false);
            await loadMonthlyDocuments();
            onDocumentsChange?.();
        } catch (error) {
            console.error('Error uploading document:', error);
            showError('Failed to upload document: ' + (error.response?.data?.message || error.message));
        } finally {
            setUploading(false);
        }
    };

    // Handle document viewing
    const handleViewDocument = async (doc) => {
        console.log('Viewing document:', doc);
        try {
            if (doc.url) {
                // Open document in new tab for viewing
                window.open(doc.url, '_blank');
            } else {
                // Fetch document details to get URL
                const response = await documentService.view(doc.id);
                const docData = response.data;
                if (docData.url) {
                    window.open(docData.url, '_blank');
                } else {
                    showError('Document URL not available');
                }
            }
        } catch (error) {
            console.error('Error viewing document:', error);
            showError('Failed to view document');
        }
    };

    // Handle document deletion
    const handleDeleteDocument = async (documentId) => {
        console.log('Deleting document:', documentId);
        if (!permissions.canEdit) {
            showError('You do not have permission to delete documents');
            return;
        }

        if (!window.confirm('Are you sure you want to delete this document?')) {
            return;
        }

        try {
            await documentService.delete(documentId);
            showSuccess('Document deleted successfully');
            await loadMonthlyDocuments();
            onDocumentsChange?.();
        } catch (error) {
            console.error('Error deleting document:', error);
            showError('Failed to delete document');
        }
    };

    // Handle remove sarky assignment
    const handleRemoveSarkyAssignment = async (documentId) => {
        console.log('Removing sarky assignment:', documentId);
        if (!permissions.canEdit) {
            showError('You do not have permission to modify documents');
            return;
        }

        if (!window.confirm('Are you sure you want to remove this document from the monthly assignment?')) {
            return;
        }

        try {
            await documentService.removeSarkyAssignment(documentId);
            showSuccess('Document removed from monthly assignment');
            await loadMonthlyDocuments();
            onDocumentsChange?.();
        } catch (error) {
            console.error('Error removing sarky assignment:', error);
            showError('Failed to remove monthly assignment');
        }
    };



    // Format file size
    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Format date for display
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Invalid Date';
            // Format as dd/mm/yyyy as per user preference
            return date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'Invalid Date';
        }
    };

    // Get file icon
    const getFileIcon = (filename) => {
        if (!filename) return '📄';
        const ext = filename.toLowerCase().split('.').pop();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return '🖼️';
        if (['pdf'].includes(ext)) return '📋';
        if (['doc', 'docx'].includes(ext)) return '📝';
        if (['xls', 'xlsx'].includes(ext)) return '📊';
        return '📄';
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="sarky-document-modal-overlay" onClick={onClose}>
                <div className="sarky-document-modal" onClick={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <div className="sarky-modal-header">
                        <h2>Documents for {equipmentName} - {getMonthLabel(selectedMonth)} {selectedYear}</h2>
                        <button className="btn-close" onClick={onClose} aria-label="Close"></button>
                    </div>

                    {/* Controls */}
                    <div className="sarky-modal-controls">
                        <div className="sarky-modal-search-filter">
                            <input
                                className="sarky-modal-search-input"
                                type="text"
                                placeholder="Search documents..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <select 
                                className="sarky-modal-filter-select" 
                                value={filterType} 
                                onChange={(e) => setFilterType(e.target.value)}
                            >
                                <option value="all">All Types</option>
                                {SARKY_DOCUMENT_TYPES.map(type => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {permissions.canEdit && (
                            <button
                                className="btn-primary--outline"
                                onClick={() => setShowUploadForm(!showUploadForm)}
                            >
                                <span>📤</span>
                                {showUploadForm ? 'Cancel Upload' : 'Add Document'}
                            </button>
                        )}
                    </div>

                    {/* Upload Form */}
                    {showUploadForm && permissions.canEdit && (
                        <div className="sarky-modal-upload-section">
                            <div
                                className={`sarky-modal-file-drop-zone ${dragActive ? 'drag-active' : ''}`}
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                                onClick={() => document.getElementById('file-input').click()}
                            >
                                <input
                                    id="file-input"
                                    type="file"
                                    hidden
                                    onChange={(e) => e.target.files[0] && handleFileSelect(e.target.files[0])}
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
                                />

                                {selectedFile ? (
                                    <div>
                                        <span className="sarky-modal-drop-icon">📁</span>
                                        <h3>{selectedFile.name}</h3>
                                        <p>{formatFileSize(selectedFile.size)}</p>
                                    </div>
                                ) : (
                                    <div>
                                        <span className="sarky-modal-drop-icon">📁</span>
                                        <h3>Drop files here or click to browse</h3>
                                        <p>Support for PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, GIF</p>
                                    </div>
                                )}
                            </div>

                            {selectedFile && (
                                <div className="sarky-modal-upload-form">
                                    <div className="sarky-modal-form-group">
                                        <label>Document Type</label>
                                        <select
                                            value={documentType}
                                            onChange={(e) => setDocumentType(e.target.value)}
                                        >
                                            {SARKY_DOCUMENT_TYPES.map(type => (
                                                <option key={type.value} value={type.value}>
                                                    {type.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="sarky-modal-form-group">
                                        <div className="sarky-modal-checkbox-group">
                                            <input
                                                type="checkbox"
                                                checked={useAutoNaming}
                                                onChange={(e) => setUseAutoNaming(e.target.checked)}
                                            />
                                            <label>Auto-generate name</label>
                                        </div>
                                    </div>

                                    <div className="sarky-modal-form-group">
                                        <label>Document Name</label>
                                        <input
                                            type="text"
                                            value={customName}
                                            onChange={(e) => setCustomName(e.target.value)}
                                            placeholder="Enter document name"
                                            disabled={useAutoNaming}
                                        />
                                    </div>

                                    <button
                                        className="btn-primary"
                                        onClick={handleUpload}
                                        disabled={uploading || !customName.trim()}
                                    >
                                        {uploading ? 'Uploading...' : 'Upload Document'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Documents Grid */}
                    <div className="sarky-modal-documents-container">
                        {loading ? (
                            <div className="sarky-modal-loading-state">
                                <div className="sarky-modal-loader"></div>
                                <p>Loading documents...</p>
                            </div>
                        ) : filteredDocuments.length === 0 ? (
                            <div className="sarky-modal-empty-state">
                                <span className="sarky-modal-empty-icon">📄</span>
                                <h3>No documents found</h3>
                                <p>
                                    {monthlyDocuments.length === 0
                                        ? `No documents for ${getMonthLabel(selectedMonth)} ${selectedYear}`
                                        : 'No documents match your search criteria'
                                    }
                                </p>
                            </div>
                        ) : (
                            <div className="sarky-modal-documents-grid">
                                {filteredDocuments.map(doc => (
                                    <div key={doc.id} className="sarky-modal-document-card">
                                        <div className="sarky-modal-document-icon" style={{ color: getDocumentTypeColor(doc.type, true) }}>
                                            {getFileIcon(doc.name)}
                                        </div>

                                        <div className="sarky-modal-document-content">
                                            <div className="sarky-modal-document-header">
                                                <h4 className="sarky-modal-document-title" title={doc.name}>
                                                    {doc.name}
                                                </h4>
                                                <div className="sarky-modal-document-actions">
                                                    <button
                                                        className="sarky-modal-action-btn sarky-modal-view-btn"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handleViewDocument(doc);
                                                        }}
                                                        title="View document"
                                                    >
                                                        👁️
                                                    </button>

                                                    {permissions.canEdit && (
                                                        <>
                                                            <button
                                                                className="sarky-modal-action-btn sarky-modal-unassign-btn"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    handleRemoveSarkyAssignment(doc.id);
                                                                }}
                                                                title="Remove from month"
                                                            >
                                                                📌
                                                            </button>
                                                            <button
                                                                className="sarky-modal-action-btn sarky-modal-delete-btn"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    handleDeleteDocument(doc.id);
                                                                }}
                                                                title="Delete document"
                                                            >
                                                                🗑️
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="sarky-modal-document-meta">
                                                <span
                                                    className="sarky-modal-document-type-badge"
                                                    style={{
                                                        backgroundColor: `${getDocumentTypeColor(doc.type, true)}20`,
                                                        color: getDocumentTypeColor(doc.type, true),
                                                        borderColor: `${getDocumentTypeColor(doc.type, true)}40`
                                                    }}
                                                >
                                                    {getDocumentTypeLabel(doc.type, true)}
                                                </span>

                                                <div className="sarky-modal-document-details">
                                                    <span className="sarky-modal-detail-item">
                                                        <span className="sarky-modal-detail-icon">📅</span>
                                                        {formatDate(doc.dateUploaded)}
                                                    </span>
                                                    {doc.fileSize && (
                                                        <span className="sarky-modal-detail-item">
                                                            <span className="sarky-modal-detail-icon">📊</span>
                                                            {formatFileSize(doc.fileSize)}
                                                        </span>
                                                    )}
                                                    {doc.uploadedBy && (
                                                        <span className="sarky-modal-detail-item">
                                                            <span className="sarky-modal-detail-icon">👤</span>
                                                            {doc.uploadedBy}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="sarky-modal-footer">
                        <div className="sarky-modal-footer-info">
                            {filteredDocuments.length} of {monthlyDocuments.length} documents
                        </div>
                        <button className="btn-primary" onClick={onClose}>
                            Close
                        </button>
                    </div>
                </div>
            </div>


        </>
    );
};

export default SarkyDocumentModal;