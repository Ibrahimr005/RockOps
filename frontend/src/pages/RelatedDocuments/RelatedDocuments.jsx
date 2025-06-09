import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Plus,
    Edit,
    Trash2,
    Download,
    File,
    FileText,
    FileImage,
    Upload,
    Eye,
    Search,
    Filter,
    MoreVertical,
    Calendar,
    User,
    AlertCircle,
    CheckCircle,
    X,
    FolderOpen,
    Grid,
    List
} from 'lucide-react';
import { documentService } from '../../services/documentService';
import { useSnackbar } from '../../contexts/SnackbarContext';
import './RelatedDocuments.scss';

const RelatedDocuments = () => {
    const { entityType, entityId } = useParams();
    const navigate = useNavigate();
    const { showSnackbar } = useSnackbar();

    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [entityName, setEntityName] = useState('');
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedDocument, setSelectedDocument] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [viewMode, setViewMode] = useState('grid');
    const [sortBy, setSortBy] = useState('date');
    const [uploadData, setUploadData] = useState({
        name: '',
        type: '',
        file: null
    });

    // Get document types based on entity type
    const documentTypes = useMemo(() => {
        switch (entityType?.toLowerCase()) {
            case 'equipment':
                return [
                    { value: 'SHIPPING_INVOICE', label: 'Shipping Invoice', icon: FileText, color: '#4f46e5' },
                    { value: 'SHIPPING_RECEIPT', label: 'Shipping Receipt', icon: FileText, color: '#059669' },
                    { value: 'BILL_OF_LADING', label: 'Bill of Lading', icon: FileText, color: '#dc2626' },
                    { value: 'CUSTOMS_DECLARATION', label: 'Customs Declaration', icon: FileText, color: '#ea580c' },
                    { value: 'CUSTOMS_INVOICE', label: 'Customs Invoice', icon: FileText, color: '#7c2d12' },
                    { value: 'CUSTOMS_CLEARANCE', label: 'Customs Clearance', icon: CheckCircle, color: '#059669' },
                    { value: 'TAX_CERTIFICATE', label: 'Tax Certificate', icon: FileText, color: '#7c3aed' },
                    { value: 'TAX_INVOICE', label: 'Tax Invoice', icon: FileText, color: '#be123c' },
                    { value: 'TAX_RECEIPT', label: 'Tax Receipt', icon: FileText, color: '#0369a1' },
                    { value: 'PURCHASE_INVOICE', label: 'Purchase Invoice', icon: FileText, color: '#0891b2' },
                    { value: 'WARRANTY', label: 'Warranty Document', icon: FileText, color: '#16a34a' },
                    { value: 'MANUAL', label: 'User Manual', icon: File, color: '#9333ea' },
                    { value: 'MAINTENANCE_RECORD', label: 'Maintenance Record', icon: FileText, color: '#c2410c' },
                    { value: 'INSURANCE', label: 'Insurance Document', icon: FileText, color: '#0d9488' },
                    { value: 'OTHER', label: 'Other', icon: File, color: '#6b7280' }
                ];
            case 'site':
                return [
                    { value: 'LEASE_AGREEMENT', label: 'Lease Agreement', icon: FileText, color: '#4f46e5' },
                    { value: 'PROPERTY_DEED', label: 'Property Deed', icon: FileText, color: '#dc2626' },
                    { value: 'BUILDING_PERMIT', label: 'Building Permit', icon: FileText, color: '#059669' },
                    { value: 'SAFETY_CERTIFICATE', label: 'Safety Certificate', icon: FileText, color: '#ea580c' },
                    { value: 'INSURANCE', label: 'Insurance Document', icon: FileText, color: '#0d9488' },
                    { value: 'UTILITY_BILL', label: 'Utility Bill', icon: FileText, color: '#7c2d12' },
                    { value: 'TAX_ASSESSMENT', label: 'Tax Assessment', icon: FileText, color: '#7c3aed' },
                    { value: 'OTHER', label: 'Other', icon: File, color: '#6b7280' }
                ];
            case 'warehouse':
                return [
                    { value: 'LEASE_AGREEMENT', label: 'Lease Agreement', icon: FileText, color: '#4f46e5' },
                    { value: 'INVENTORY_REPORT', label: 'Inventory Report', icon: FileText, color: '#059669' },
                    { value: 'SAFETY_CERTIFICATE', label: 'Safety Certificate', icon: FileText, color: '#ea580c' },
                    { value: 'INSURANCE', label: 'Insurance Document', icon: FileText, color: '#0d9488' },
                    { value: 'FIRE_SAFETY', label: 'Fire Safety Certificate', icon: FileText, color: '#dc2626' },
                    { value: 'OTHER', label: 'Other', icon: File, color: '#6b7280' }
                ];
            case 'employee':
                return [
                    { value: 'CONTRACT', label: 'Employment Contract', icon: FileText, color: '#4f46e5' },
                    { value: 'ID_COPY', label: 'ID Copy', icon: FileImage, color: '#059669' },
                    { value: 'RESUME', label: 'Resume/CV', icon: FileText, color: '#dc2626' },
                    { value: 'CERTIFICATE', label: 'Certificate', icon: FileText, color: '#ea580c' },
                    { value: 'LICENSE', label: 'License', icon: FileText, color: '#0d9488' },
                    { value: 'MEDICAL_RECORD', label: 'Medical Record', icon: FileText, color: '#7c2d12' },
                    { value: 'PERFORMANCE_REVIEW', label: 'Performance Review', icon: FileText, color: '#7c3aed' },
                    { value: 'OTHER', label: 'Other', icon: File, color: '#6b7280' }
                ];
            default:
                return [
                    { value: 'DOCUMENT', label: 'Document', icon: File, color: '#4f46e5' },
                    { value: 'CONTRACT', label: 'Contract', icon: FileText, color: '#dc2626' },
                    { value: 'INVOICE', label: 'Invoice', icon: FileText, color: '#059669' },
                    { value: 'RECEIPT', label: 'Receipt', icon: FileText, color: '#ea580c' },
                    { value: 'CERTIFICATE', label: 'Certificate', icon: FileText, color: '#0d9488' },
                    { value: 'REPORT', label: 'Report', icon: FileText, color: '#7c2d12' },
                    { value: 'OTHER', label: 'Other', icon: File, color: '#6b7280' }
                ];
        }
    }, [entityType]);

    useEffect(() => {
        if (entityType && entityId) {
            loadDocuments();
        }
    }, [entityType, entityId]);

    const loadDocuments = async () => {
        setLoading(true);
        try {
            const response = await documentService.getByEntity(entityType, entityId);
            setDocuments(response.data);

            if (response.data.length > 0) {
                setEntityName(response.data[0].entityName);
            } else {
                setEntityName(`${entityType.charAt(0).toUpperCase() + entityType.slice(1)} Documents`);
            }
        } catch (error) {
            console.error('Error loading documents:', error);
            showSnackbar('Failed to load documents', 'error');
            setEntityName(`${entityType.charAt(0).toUpperCase() + entityType.slice(1)} Documents`);
        } finally {
            setLoading(false);
        }
    };

    const getFileIcon = (fileUrl, documentType) => {
        if (!fileUrl) return File;

        const url = fileUrl.toLowerCase();
        const docType = documentTypes.find(type => type.value === documentType);

        if (docType) return docType.icon;

        if (url.includes('.pdf')) return FileText;
        if (url.includes('.doc') || url.includes('.docx')) return FileText;
        if (url.includes('.xls') || url.includes('.xlsx') || url.includes('.csv')) return FileText;
        if (url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png') || url.includes('.gif')) return FileImage;

        return File;
    };

    const getDocumentTypeConfig = (documentType) => {
        return documentTypes.find(type => type.value === documentType) ||
            { value: documentType, label: documentType, icon: File, color: '#6b7280' };
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!uploadData.file || !uploadData.name || !uploadData.type) {
            showSnackbar('Please fill in all fields and select a file', 'warning');
            return;
        }

        setLoading(true);
        try {
            await documentService.create(entityType, entityId, uploadData);
            showSnackbar('Document uploaded successfully', 'success');
            setShowUploadModal(false);
            setUploadData({ name: '', type: '', file: null });
            loadDocuments();
        } catch (error) {
            console.error('Error uploading document:', error);
            showSnackbar('Failed to upload document', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = async (e) => {
        e.preventDefault();
        if (!selectedDocument || !selectedDocument.name || !selectedDocument.type) {
            showSnackbar('Please fill in all fields', 'warning');
            return;
        }

        setLoading(true);
        try {
            showSnackbar('Edit functionality will be implemented soon', 'info');
            setShowEditModal(false);
            setSelectedDocument(null);
        } catch (error) {
            console.error('Error updating document:', error);
            showSnackbar('Failed to update document', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (documentId) => {
        if (!window.confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
            return;
        }

        setLoading(true);
        try {
            await documentService.delete(documentId);
            showSnackbar('Document deleted successfully', 'success');
            loadDocuments();
        } catch (error) {
            console.error('Error deleting document:', error);
            showSnackbar('Failed to delete document', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setUploadData(prev => ({
                ...prev,
                file,
                name: prev.name || file.name.split('.')[0]
            }));
        }
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return 'Unknown';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Unknown';
        return new Date(dateString).toLocaleDateString();
    };

    const handleDownload = (document) => {
        if (document.url) {
            window.open(document.url, '_blank');
        } else {
            showSnackbar('Document URL not available', 'warning');
        }
    };

    // Filter and sort documents
    const filteredAndSortedDocuments = useMemo(() => {
        let filtered = documents.filter(doc => {
            const matchesSearch = !searchTerm ||
                doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                doc.type.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesType = filterType === 'all' || doc.type === filterType;

            return matchesSearch && matchesType;
        });

        // Sort documents
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'type':
                    return a.type.localeCompare(b.type);
                case 'size':
                    return (b.size || 0) - (a.size || 0);
                case 'date':
                default:
                    return new Date(b.dateUploaded) - new Date(a.dateUploaded);
            }
        });

        return filtered;
    }, [documents, searchTerm, filterType, sortBy]);

    const getUniqueDocumentTypes = () => {
        const types = documents.map(doc => doc.type);
        return [...new Set(types)];
    };

    return (
        <div className="rockops-documents-page">
            {/* Header */}
            <div className="rockops-documents-header">
                <div className="rockops-documents-header-left">

                    <div className="rockops-documents-header-info">
                        <h1 className="rockops-documents-title">
                            <FolderOpen size={24} />
                            Related Documents
                        </h1>
                        <p className="rockops-documents-subtitle">
                            {entityName} • {documents.length} document{documents.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
                <div className="rockops-documents-header-actions">
                    <button
                        className="rockops-btn rockops-btn--primary"
                        onClick={() => setShowUploadModal(true)}
                        disabled={loading}
                    >
                        <Plus size={16} />
                        Upload Document
                    </button>
                </div>
            </div>

            {/* Filters and Controls */}
            <div className="rockops-documents-controls">
                <div className="rockops-documents-filters">
                    <div className="rockops-documents-search">
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder="Search documents..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="rockops-documents-filter-group">
                        <Filter size={16} />
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                        >
                            <option value="all">All Types</option>
                            {getUniqueDocumentTypes().map(type => {
                                const config = getDocumentTypeConfig(type);
                                return (
                                    <option key={type} value={type}>
                                        {config.label}
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    <div className="rockops-documents-sort-group">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                        >
                            <option value="date">Sort by Date</option>
                            <option value="name">Sort by Name</option>
                            <option value="type">Sort by Type</option>
                            <option value="size">Sort by Size</option>
                        </select>
                    </div>
                </div>

                <div className="rockops-documents-view-controls">
                    <button
                        className={`rockops-documents-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                        onClick={() => setViewMode('grid')}
                        title="Grid view"
                    >
                        <Grid size={16} />
                    </button>
                    <button
                        className={`rockops-documents-view-btn ${viewMode === 'list' ? 'active' : ''}`}
                        onClick={() => setViewMode('list')}
                        title="List view"
                    >
                        <List size={16} />
                    </button>
                </div>
            </div>

            {/* Documents Container */}
            <div className="rockops-documents-container">
                {loading && documents.length === 0 ? (
                    <div className="rockops-documents-loading">
                        <div className="rockops-documents-loading-spinner"></div>
                        <p>Loading documents...</p>
                    </div>
                ) : filteredAndSortedDocuments.length === 0 ? (
                    <div className="rockops-documents-empty">
                        {documents.length === 0 ? (
                            <>
                                <FolderOpen size={64} className="rockops-documents-empty-icon" />
                                <h3>No documents found</h3>
                                <p>Upload your first document to get started</p>
                                <button
                                    className="rockops-btn rockops-btn--primary"
                                    onClick={() => setShowUploadModal(true)}
                                >
                                    <Upload size={16} />
                                    Upload Document
                                </button>
                            </>
                        ) : (
                            <>
                                <Search size={64} className="rockops-documents-empty-icon" />
                                <h3>No matching documents</h3>
                                <p>Try adjusting your search criteria</p>
                                <button
                                    className="rockops-btn rockops-btn--outline"
                                    onClick={() => {
                                        setSearchTerm('');
                                        setFilterType('all');
                                    }}
                                >
                                    Clear Filters
                                </button>
                            </>
                        )}
                    </div>
                ) : (
                    <div className={`rockops-documents-grid ${viewMode === 'list' ? 'list-view' : 'grid-view'}`}>
                        {filteredAndSortedDocuments.map(document => {
                            const typeConfig = getDocumentTypeConfig(document.type);
                            const IconComponent = getFileIcon(document.url, document.type);

                            return (
                                <div key={document.id} className="rockops-documents-card">
                                    <div className="rockops-documents-card-icon" style={{ color: typeConfig.color }}>
                                        <IconComponent size={viewMode === 'list' ? 24 : 32} />
                                    </div>

                                    <div className="rockops-documents-card-content">
                                        <div className="rockops-documents-card-header">
                                            <h3 className="rockops-documents-card-title">{document.name}</h3>
                                            <div className="rockops-documents-card-actions">
                                                <button
                                                    className="rockops-documents-action-btn view"
                                                    onClick={() => handleDownload(document)}
                                                    title="View/Download"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <button
                                                    className="rockops-documents-action-btn edit"
                                                    onClick={() => {
                                                        setSelectedDocument(document);
                                                        setShowEditModal(true);
                                                    }}
                                                    title="Edit"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    className="rockops-documents-action-btn delete"
                                                    onClick={() => handleDelete(document.id)}
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="rockops-documents-card-meta">
                                            <span className="rockops-documents-card-type" style={{ color: typeConfig.color }}>
                                                {typeConfig.label}
                                            </span>
                                            <div className="rockops-documents-card-info">
                                                <span className="rockops-documents-card-size">
                                                    {formatFileSize(document.size)}
                                                </span>
                                                <span className="rockops-documents-card-date">
                                                    <Calendar size={12} />
                                                    {formatDate(document.dateUploaded)}
                                                </span>
                                                {document.uploadedBy && (
                                                    <span className="rockops-documents-card-user">
                                                        <User size={12} />
                                                        {document.uploadedBy}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="rockops-documents-modal-overlay">
                    <div className="rockops-documents-modal">
                        <div className="rockops-documents-modal-header">
                            <h2>
                                <Upload size={20} />
                                Upload New Document
                            </h2>
                            <button
                                className="rockops-documents-modal-close"
                                onClick={() => {
                                    setShowUploadModal(false);
                                    setUploadData({ name: '', type: '', file: null });
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleUpload} className="rockops-documents-modal-form">
                            <div className="rockops-documents-form-group">
                                <label htmlFor="documentName">Document Name *</label>
                                <input
                                    type="text"
                                    id="documentName"
                                    value={uploadData.name}
                                    onChange={(e) => setUploadData(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Enter document name"
                                    required
                                />
                            </div>

                            <div className="rockops-documents-form-group">
                                <label htmlFor="documentType">Document Type *</label>
                                <select
                                    id="documentType"
                                    value={uploadData.type}
                                    onChange={(e) => setUploadData(prev => ({ ...prev, type: e.target.value }))}
                                    required
                                >
                                    <option value="">Select document type</option>
                                    {documentTypes.map(type => (
                                        <option key={type.value} value={type.value}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="rockops-documents-form-group">
                                <label htmlFor="documentFile">Select File *</label>
                                <div className="rockops-documents-file-input">
                                    <input
                                        type="file"
                                        id="documentFile"
                                        onChange={handleFileChange}
                                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls,.csv"
                                        required
                                    />
                                    <div className="rockops-documents-file-input-label">
                                        <Upload size={20} />
                                        <span>Choose file or drag and drop</span>
                                    </div>
                                </div>
                                {uploadData.file && (
                                    <div className="rockops-documents-file-preview">
                                        <File size={16} />
                                        <span className="file-name">{uploadData.file.name}</span>
                                        <span className="file-size">
                                            ({formatFileSize(uploadData.file.size)})
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="rockops-documents-modal-actions">
                                <button
                                    type="button"
                                    className="rockops-btn rockops-btn--outline"
                                    onClick={() => {
                                        setShowUploadModal(false);
                                        setUploadData({ name: '', type: '', file: null });
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="rockops-btn rockops-btn--primary"
                                    disabled={loading}
                                >
                                    {loading ? 'Uploading...' : 'Upload Document'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && selectedDocument && (
                <div className="rockops-documents-modal-overlay">
                    <div className="rockops-documents-modal">
                        <div className="rockops-documents-modal-header">
                            <h2>
                                <Edit size={20} />
                                Edit Document
                            </h2>
                            <button
                                className="rockops-documents-modal-close"
                                onClick={() => {
                                    setShowEditModal(false);
                                    setSelectedDocument(null);
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleEdit} className="rockops-documents-modal-form">
                            <div className="rockops-documents-form-group">
                                <label htmlFor="editDocumentName">Document Name *</label>
                                <input
                                    type="text"
                                    id="editDocumentName"
                                    value={selectedDocument.name}
                                    onChange={(e) => setSelectedDocument(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Enter document name"
                                    required
                                />
                            </div>

                            <div className="rockops-documents-form-group">
                                <label htmlFor="editDocumentType">Document Type *</label>
                                <select
                                    id="editDocumentType"
                                    value={selectedDocument.type}
                                    onChange={(e) => setSelectedDocument(prev => ({ ...prev, type: e.target.value }))}
                                    required
                                >
                                    {documentTypes.map(type => (
                                        <option key={type.value} value={type.value}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="rockops-documents-modal-actions">
                                <button
                                    type="button"
                                    className="rockops-btn rockops-btn--outline"
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setSelectedDocument(null);
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="rockops-btn rockops-btn--primary"
                                    disabled={loading}
                                >
                                    {loading ? 'Updating...' : 'Update Document'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RelatedDocuments;