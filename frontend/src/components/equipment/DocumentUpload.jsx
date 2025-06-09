import React, { useState, useEffect, useMemo } from 'react';
import { FaUpload, FaFile, FaFilePdf, FaFileWord, FaFileExcel, FaFileImage, FaTrash } from 'react-icons/fa';
import './DocumentUpload.css';

const DocumentUpload = ({ fieldType, fieldLabel, onDocumentsChange, initialDocuments = [] }) => {
    const [selectedDocuments, setSelectedDocuments] = useState([]);

    // Document types based on field type
    const documentTypes = useMemo(() => {
        if (fieldType === 'SHIPPING') {
            return [
                { value: 'SHIPPING_INVOICE', label: 'Shipping Invoice' },
                { value: 'BILL_OF_LADING', label: 'Bill of Lading' },
                { value: 'SHIPPING_RECEIPT', label: 'Shipping Receipt' },
                { value: 'SHIPPING_OTHER', label: 'Other Shipping Document' }
            ];
        } else if (fieldType === 'CUSTOMS') {
            return [
                { value: 'CUSTOMS_DECLARATION', label: 'Customs Declaration' },
                { value: 'CUSTOMS_INVOICE', label: 'Customs Invoice' },
                { value: 'CUSTOMS_CLEARANCE', label: 'Customs Clearance' },
                { value: 'CUSTOMS_OTHER', label: 'Other Customs Document' }
            ];
        } else if (fieldType === 'TAXES') {
            return [
                { value: 'TAX_CERTIFICATE', label: 'Tax Certificate' },
                { value: 'TAX_INVOICE', label: 'Tax Invoice' },
                { value: 'TAX_RECEIPT', label: 'Tax Receipt' },
                { value: 'TAX_OTHER', label: 'Other Tax Document' }
            ];
        }
        return [
            { value: 'DOCUMENT', label: 'Document' },
            { value: 'OTHER', label: 'Other' }
        ];
    }, [fieldType]);

    useEffect(() => {
        if (initialDocuments && initialDocuments.length > 0) {
            setSelectedDocuments(initialDocuments);
        }
    }, [initialDocuments]);

    const getFileIcon = (fileType) => {
        if (!fileType) return <FaFile />;
        const type = fileType.toLowerCase();
        if (type.includes('pdf')) return <FaFilePdf />;
        if (type.includes('word') || type.includes('doc')) return <FaFileWord />;
        if (type.includes('excel') || type.includes('sheet') || type.includes('csv')) return <FaFileExcel />;
        if (type.includes('image') || type.includes('jpeg') || type.includes('jpg') || type.includes('png')) return <FaFileImage />;
        return <FaFile />;
    };

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        
        files.forEach(file => {
            const newDocument = {
                id: Date.now() + Math.random(), // Temporary ID for new documents
                file: file,
                documentName: file.name.split('.')[0], // Default name without extension
                documentType: documentTypes[0].value, // Default to first type
                fieldType: fieldType,
                fileType: file.type,
                fileSize: file.size,
                isNew: true // Mark as new document
            };
            
            const updatedDocuments = [...selectedDocuments, newDocument];
            setSelectedDocuments(updatedDocuments);
            onDocumentsChange(fieldType, updatedDocuments);
        });
        // Reset the input
        e.target.value = '';
    };

    const handleDocumentNameChange = (documentId, newName) => {
        const updatedDocuments = selectedDocuments.map(doc =>
            doc.id === documentId ? { ...doc, documentName: newName } : doc
        );
        setSelectedDocuments(updatedDocuments);
        onDocumentsChange(fieldType, updatedDocuments);
    };

    const handleDocumentTypeChange = (documentId, newType) => {
        const updatedDocuments = selectedDocuments.map(doc =>
            doc.id === documentId ? { ...doc, documentType: newType } : doc
        );
        setSelectedDocuments(updatedDocuments);
        onDocumentsChange(fieldType, updatedDocuments);
    };

    const handleRemoveDocument = (documentId) => {
        const updatedDocuments = selectedDocuments.filter(doc => doc.id !== documentId);
        setSelectedDocuments(updatedDocuments);
        onDocumentsChange(fieldType, updatedDocuments);
    };

    return (
        <div className="document-upload">
            <div className="field-header">
                <h4>{fieldLabel}</h4>
                <div className="upload-actions">
                    <input
                        type="file"
                        id={`document-upload-${fieldType}`}
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls,.csv"
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                        multiple
                    />
                    <label 
                        htmlFor={`document-upload-${fieldType}`} 
                        className="upload-button"
                    >
                        <FaUpload />
                        <span>Add Document</span>
                    </label>
                </div>
            </div>

            {selectedDocuments.length > 0 && (
                <div className="documents-list">
                    {selectedDocuments.map(doc => (
                        <div key={doc.id} className="document-item">
                            <div className="document-preview">
                                <div className="file-icon">
                                    {getFileIcon(doc.fileType)}
                                </div>
                            </div>
                            <div className="document-details">
                                <div className="form-group">
                                    <label>Document Name:</label>
                                    <input
                                        type="text"
                                        className="form-control small"
                                        value={doc.documentName}
                                        onChange={(e) => handleDocumentNameChange(doc.id, e.target.value)}
                                        placeholder="Enter document name"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Document Type:</label>
                                    <select
                                        className="form-control small"
                                        value={doc.documentType}
                                        onChange={(e) => handleDocumentTypeChange(doc.id, e.target.value)}
                                    >
                                        {documentTypes.map(type => (
                                            <option key={type.value} value={type.value}>
                                                {type.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <button 
                                type="button"
                                className="remove-button"
                                onClick={() => handleRemoveDocument(doc.id)}
                                title="Remove document"
                            >
                                <FaTrash />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {selectedDocuments.length === 0 && (
                <div className="no-documents">
                    No documents selected. Click "Add Document" to upload files.
                </div>
            )}
        </div>
    );
};

export default DocumentUpload; 