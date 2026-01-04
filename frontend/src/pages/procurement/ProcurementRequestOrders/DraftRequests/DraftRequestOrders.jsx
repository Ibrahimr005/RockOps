// DraftRequestOrders.jsx
import React, { useState, useMemo } from 'react';
import { FaEdit, FaTrash, FaClock, FaPlus } from 'react-icons/fa';
import DataTable from '../../../../components/common/DataTable/DataTable.jsx';
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog.jsx';
import RequestOrderModal from '../../../../components/procurement/RequestOrderModal/RequestOrderModal.jsx';
import Snackbar from '../../../../components/common/Snackbar/Snackbar.jsx';
import { requestOrderService } from '../../../../services/procurement/requestOrderService.js';
import './DraftRequestOrders.scss';

const DraftRequestOrders = ({ requestOrders, loading, onDataChange }) => {
    const [selectedDraft, setSelectedDraft] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [draftToDelete, setDraftToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Snackbar state
    const [showSnackbar, setShowSnackbar] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarType, setSnackbarType] = useState('success');

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    const calculateCompletion = (draft) => {
        let completedSteps = 0;
        const totalSteps = 3;

        // Step 1: Basic Information (title, description, deadline)
        if (draft.title && draft.description && draft.deadline) {
            completedSteps++;
        }

        // Step 2: Request Items
        if (draft.requestItems && draft.requestItems.length > 0) {
            completedSteps++;
        }

        // Step 3: Requester Information (requesterId)
        if (draft.requesterId) {
            completedSteps++;
        }

        const percentage = Math.round((completedSteps / totalSteps) * 100);
        return { completedSteps, totalSteps, percentage };
    };

    const handleEdit = (draft) => {
        setSelectedDraft(draft);
        setIsEditModalOpen(true);
    };

    const handleCreateNew = () => {
        setIsCreateModalOpen(true);
    };

    const handleDeleteClick = (draft) => {
        setDraftToDelete(draft);
        setShowDeleteDialog(true);
    };

    const handleConfirmDelete = async () => {
        if (!draftToDelete) return;

        setIsDeleting(true);

        try {
            await requestOrderService.delete(draftToDelete.id);
            setShowDeleteDialog(false);
            setDraftToDelete(null);
            setSnackbarMessage('Draft deleted successfully');
            setSnackbarType('success');
            setShowSnackbar(true);
            onDataChange?.();
        } catch (error) {
            console.error('Error deleting draft:', error);
            setSnackbarMessage('Failed to delete draft');
            setSnackbarType('error');
            setShowSnackbar(true);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleCancelDelete = () => {
        setShowDeleteDialog(false);
        setDraftToDelete(null);
    };

    const handleEditModalClose = () => {
        setIsEditModalOpen(false);
        setSelectedDraft(null);
    };

    const handleCreateModalClose = () => {
        setIsCreateModalOpen(false);
    };

    const handleSuccess = (message) => {
        setSnackbarMessage(message);
        setSnackbarType('success');
        setShowSnackbar(true);
        onDataChange?.();
        handleEditModalClose();
        handleCreateModalClose();
    };

    const handleError = (message) => {
        setSnackbarMessage(message);
        setSnackbarType('error');
        setShowSnackbar(true);
    };

    // Define columns for DataTable
    const columns = [
        {
            id: 'title',
            header: 'TITLE',
            accessor: 'title',
            sortable: true,
            filterable: true,
            minWidth: '200px',
            render: (row) => (
                <div className="draft-ro-title-cell">
                    <span className="draft-ro-title">{row.title}</span>
                </div>
            )
        },
        {
            id: 'items',
            header: 'ITEMS',
            accessor: 'requestItems',
            sortable: false,
            minWidth: '120px',
            render: (row) => (
                <div className="draft-ro-items-count">
                    {row.requestItems && row.requestItems.length > 0 ? (
                        <>
                            <span className="draft-ro-count-badge">
                                {row.requestItems.length}
                            </span>
                            <span className="draft-ro-count-label">
                                {row.requestItems.length === 1 ? 'item' : 'items'}
                            </span>
                        </>
                    ) : (
                        <span className="draft-ro-no-items">No items</span>
                    )}
                </div>
            )
        },
        {
            id: 'requesterName',
            header: 'REQUESTER',
            accessor: 'requesterName',
            sortable: true,
            filterable: true,
            minWidth: '180px',
            render: (row) => (
                <span className="draft-ro-requester">
                    {row.requesterName || <em className="draft-ro-not-set">Not set</em>}
                </span>
            )
        },
        {
            id: 'updatedAt',
            header: 'LAST MODIFIED',
            accessor: 'updatedAt',
            sortable: true,
            minWidth: '180px',
            render: (row) => (
                <span className="draft-ro-date">
                    {formatDate(row.updatedAt || row.createdAt)}
                </span>
            )
        },
        {
            id: 'createdBy',
            header: 'CREATED BY',
            accessor: 'createdBy',
            sortable: true,
            filterable: true,
            minWidth: '150px',
            render: (row) => (
                <span className="draft-ro-created-by">
                    {row.createdBy || 'Unknown'}
                </span>
            )
        },
        {
            id: 'completion',
            header: 'COMPLETION',
            accessor: 'completion',
            sortable: false,
            minWidth: '200px',
            render: (row) => {
                const completion = calculateCompletion(row);
                return (
                    <div className="draft-ro-completion">
                        <div className="draft-ro-progress-bar">
                            <div
                                className="draft-ro-progress-fill"
                                style={{ width: `${completion.percentage}%` }}
                            ></div>
                        </div>
                        <span className="draft-ro-completion-text">
                            {completion.percentage}% • Step {completion.completedSteps} of {completion.totalSteps}
                        </span>
                    </div>
                );
            }
        }
    ];

    const actions = [
        {
            label: 'Continue',
            icon: <FaEdit />,
            onClick: (row) => handleEdit(row),
            className: 'edit'
        },
        {
            label: 'Delete',
            icon: <FaTrash />,
            onClick: (row) => handleDeleteClick(row),
            className: 'delete'
        }
    ];

    const filterableColumns = [
        {
            header: 'Title',
            accessor: 'title',
            filterType: 'text'
        },
        {
            header: 'Requester',
            accessor: 'requesterName',
            filterType: 'text'
        },
        {
            header: 'Created By',
            accessor: 'createdBy',
            filterType: 'text'
        }
    ];

    const emptyState = {
        icon: <FaClock />,
        title: 'No Draft Requests',
        description: "You don't have any draft request orders at the moment.",
        hint: 'Start creating a new request and save it as a draft to continue later.'
    };

    return (
        <>
            <DataTable
                data={requestOrders || []}
                columns={columns}
                actions={actions}
                loading={loading}
                emptyState={emptyState}
                className="draft-ro-table"
                showSearch={true}
                showFilters={true}
                filterableColumns={filterableColumns}
                defaultItemsPerPage={10}
                itemsPerPageOptions={[5, 10, 15, 20]}
                showAddButton={true}
                addButtonText="Create Request Order"
                addButtonIcon={<FaPlus />}
                onAddClick={handleCreateNew}
                showExportButton={true}
                exportFileName="draft-request-orders"
                exportButtonText="Export Drafts"
                addButtonProps={{
                    title: "Create new request order"
                }}
            />

            {/* Create Modal */}
            <RequestOrderModal
                isOpen={isCreateModalOpen}
                onClose={handleCreateModalClose}
                onSuccess={handleSuccess}
                onError={handleError}
                isEditMode={false}
                userType="PROCUREMENT"
            />

            {/* Edit Modal */}
            {selectedDraft && (
                <RequestOrderModal
                    isOpen={isEditModalOpen}
                    onClose={handleEditModalClose}
                    onSuccess={handleSuccess}
                    onError={handleError}
                    isEditMode={true}
                    existingOrder={selectedDraft}
                    userType="PROCUREMENT"
                />
            )}

            {/* Delete Confirmation Dialog */}
            <ConfirmationDialog
                isVisible={showDeleteDialog}
                type="danger"
                title="Delete Draft?"
                message={`Are you sure you want to delete the draft "${draftToDelete?.title}"? This action cannot be undone.`}
                confirmText="Delete Draft"
                cancelText="Cancel"
                onConfirm={handleConfirmDelete}
                onCancel={handleCancelDelete}
                size="medium"
                isLoading={isDeleting}
            />

            {/* Snackbar */}
            <Snackbar
                type={snackbarType}
                message={snackbarMessage}
                show={showSnackbar}
                onClose={() => setShowSnackbar(false)}
                duration={3000}
            />
        </>
    );
};

export default DraftRequestOrders;