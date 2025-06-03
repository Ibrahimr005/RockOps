import React, { useState, useEffect } from 'react';
import { monetaryFieldDocumentService } from '../../services/monetaryFieldDocumentService';
import './MonetaryFieldDocuments.css';

const MonetaryFieldDocuments = ({ equipmentId, fieldType, fieldLabel }) => {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [showUploadForm, setShowUploadForm] = useState(false);
    const [uploadData, setUploadData] = useState({
        file: null,
        documentName: '',
        documentType: 'INVOICE'
    });

    const documentTypes = [
        { value: 'INVOICE', label: 'Invoice' },
        { value: 'RECEIPT', label: 'Receipt' },
        { value: 'BILL_OF_LADING', label: 'Bill of Lading' },
        { value: 'CUSTOMS_DECLARATION', label: 'Customs Declaration' },
        { value: 'TAX_CERTIFICATE', label: 'Tax Certificate' },
        { value: 'OTHER', label: 'Other' }
    ];

    useEffect(() => {
        loadDocuments();
    }, [equipmentId, fieldType]);

    const loadDocuments = async () => {
        setLoading(true);
        try {
            const response = await monetaryFieldDocumentService.getByEquipmentAndFieldType(equipmentId, fieldType);
            setDocuments(response.data);
        } catch (error) {
            console.error('Error loading documents:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setUploadData(prev => ({
            ...prev,
            file,
            documentName: file ? file.name.split('.')[0] : ''
        }));
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!uploadData.file || !uploadData.documentName) {
            alert('Please select a file and enter a document name');
            return;
        }

        setUploading(true);
        try {
            await monetaryFieldDocumentService.uploadDocument(equipmentId, fieldType, uploadData);
            setUploadData({ file: null, documentName: '', documentType: 'INVOICE' });
            setShowUploadForm(false);
            loadDocuments();
            alert('Document uploaded successfully!');
        } catch (error) {
            console.error('Error uploading document:', error);
            alert('Error uploading document. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (documentId) => {
        if (!window.confirm('Are you sure you want to delete this document?')) {
            return;
        }

        try {
            await monetaryFieldDocumentService.deleteDocument(documentId);
            loadDocuments();
            alert('Document deleted successfully!');
        } catch (error) {
            console.error('Error deleting document:', error);
            alert('Error deleting document. Please try again.');
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString();
    };

    return (
        <div className="monetary-field-documents">
            <div className="documents-header">
                <h4>{fieldLabel} Documents</h4>
                <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => setShowUploadForm(!showUploadForm)}
                >
                    {showUploadForm ? 'Cancel' : 'Add Document'}
                </button>
            </div>

            {showUploadForm && (
                <div className="upload-form">
                    <form onSubmit={handleUpload}>
                        <div className="form-group">
                            <label>Document Name:</label>
                            <input
                                type="text"
                                className="form-control"
                                value={uploadData.documentName}
                                onChange={(e) => setUploadData(prev => ({ ...prev, documentName: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Document Type:</label>
                            <select
                                className="form-control"
                                value={uploadData.documentType}
                                onChange={(e) => setUploadData(prev => ({ ...prev, documentType: e.target.value }))}
                            >
                                {documentTypes.map(type => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>File:</label>
                            <input
                                type="file"
                                className="form-control"
                                onChange={handleFileChange}
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls"
                                required
                            />
                        </div>
                        <div className="form-actions">
                            <button 
                                type="submit" 
                                className="btn btn-success"
                                disabled={uploading}
                            >
                                {uploading ? 'Uploading...' : 'Upload Document'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="documents-list">
                {loading ? (
                    <div className="loading">Loading documents...</div>
                ) : documents.length === 0 ? (
                    <div className="no-documents">No documents uploaded for {fieldLabel.toLowerCase()}</div>
                ) : (
                    <div className="documents-grid">
                        {documents.map(doc => (
                            <div key={doc.id} className="document-card">
                                <div className="document-info">
                                    <h6>{doc.documentName}</h6>
                                    <p className="document-type">{doc.documentType.replace('_', ' ')}</p>
                                    <p className="document-meta">
                                        {formatFileSize(doc.fileSize)} • {formatDate(doc.uploadDate)}
                                    </p>
                                    <p className="uploaded-by">
                                        Uploaded by: {doc.uploadedByName}
                                    </p>
                                </div>
                                <div className="document-actions">
                                    {doc.fileUrl && (
                                        <a 
                                            href={doc.fileUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="btn btn-outline-primary btn-sm"
                                        >
                                            View
                                        </a>
                                    )}
                                    <button 
                                        className="btn btn-outline-danger btn-sm"
                                        onClick={() => handleDelete(doc.id)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MonetaryFieldDocuments; 