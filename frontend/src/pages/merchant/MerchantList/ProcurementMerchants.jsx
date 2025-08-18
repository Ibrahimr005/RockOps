import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import "./ProcurementMerchants.scss"
import merchantsImage from "../../../assets/imgs/pro_icon.png";
import merchantsImagedark from "../../../assets/imgs/pro_icon_dark.png";
import DataTable from '../../../components/common/DataTable/DataTable.jsx';
import Snackbar from '../../../components/common/Snackbar/Snackbar.jsx'
import MerchantModal from './MerchantModal.jsx';
import IntroCard from '../../../components/common/IntroCard/IntroCard.jsx';
import ConfirmationDialog from '../../../components/common/ConfirmationDialog/ConfirmationDialog.jsx';
import EmployeeAvatar from '../../../components/common/EmployeeAvatar/EmployeeAvatar.jsx';
import { procurementService } from '../../../services/procurement/procurementService.js';
import { siteService } from '../../../services/siteService.js';

const ProcurementMerchants = () => {
    const [merchants, setMerchants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const [showAddModal, setShowAddModal] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null); // Added for file handling
    const [sites, setSites] = useState([]);
    const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
    const [currentMerchantId, setCurrentMerchantId] = useState(null);
    const [showSnackbar, setShowSnackbar] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");
    const [snackbarType, setSnackbarType] = useState("success");
    const [userRole, setUserRole] = useState('');

    // Add confirmation dialog states
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [merchantToDelete, setMerchantToDelete] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Form data for adding a new merchant
    const [formData, setFormData] = useState({
        name: '',
        merchantType: '',
        contactEmail: '',
        contactPhone: '',
        contactSecondPhone: '',
        contactPersonName: '',
        address: '',
        siteId: '',
        preferredPaymentMethod: '',
        taxIdentificationNumber: '',
        reliabilityScore: '',
        averageDeliveryTime: '',
        lastOrderDate: '',
        notes: ''
    });

    // Fetch merchants and sites on component mount
    useEffect(() => {
        const fetchInitialData = async () => {
            setLoading(true);
            try {
                // Fetch merchants using procurement service
                const response = await procurementService.getAllMerchants();
                const merchantsData = response.data || response;
                setMerchants(merchantsData);

                // Fetch sites using site service
                await fetchSites();

                setError(null);
            } catch (error) {
                console.error('Error fetching merchants:', error);
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, []);

    // Fetch sites using site service
    const fetchSites = async () => {
        try {
            const response = await siteService.getAll();
            const sitesData = response.data || response;
            setSites(sitesData);
        } catch (error) {
            console.error('Error fetching sites:', error);
            setSites([]);
        }
    };

    useEffect(() => {
        // Get user role from localStorage
        const userInfo = JSON.parse(localStorage.getItem('userInfo'));
        if (userInfo && userInfo.role) {
            setUserRole(userInfo.role);
        }
    }, []);

    // Handle row click to navigate to merchant details page
    const handleRowClick = (merchant) => {
        console.log("Navigating to merchant details:", merchant);
        navigate(`/merchants/${merchant.id}`);
    };

    const onEdit = (merchant) => {
        console.log("Editing merchant:", merchant);

        // Set form data with current merchant values
        setFormData({
            name: merchant.name,
            merchantType: merchant.merchantType,
            contactEmail: merchant.contactEmail || '',
            contactPhone: merchant.contactPhone || '',
            contactSecondPhone: merchant.contactSecondPhone || '',
            contactPersonName: merchant.contactPersonName || '',
            address: merchant.address || '',
            siteId: merchant.site ? merchant.site.id : '',
            preferredPaymentMethod: merchant.preferredPaymentMethod || '',
            taxIdentificationNumber: merchant.taxIdentificationNumber || '',
            reliabilityScore: merchant.reliabilityScore || '',
            averageDeliveryTime: merchant.averageDeliveryTime || '',
            lastOrderDate: merchant.lastOrderDate ? new Date(merchant.lastOrderDate).toISOString().split('T')[0] : '',
            notes: merchant.notes || ''
        });

        // Set existing photo if available
        if (merchant.photoUrl) {
            setPreviewImage(merchant.photoUrl);
        } else {
            setPreviewImage(null);
        }

        // Reset selected file since we're showing existing photo
        setSelectedFile(null);

        // Set modal mode to edit
        setModalMode('edit');
        setCurrentMerchantId(merchant.id);
        setShowAddModal(true);
    };

    // Updated onDelete function to show confirmation dialog
    const onDelete = (merchant) => {
        console.log("Attempting to delete merchant:", merchant);
        setMerchantToDelete(merchant);
        setShowDeleteDialog(true);
    };

    // Handle confirmed deletion using procurement service
    const handleConfirmDelete = async () => {
        if (!merchantToDelete) return;

        setDeleteLoading(true);
        try {
            await procurementService.deleteMerchant(merchantToDelete.id);

            // Remove merchant from the list
            setMerchants(merchants.filter(m => m.id !== merchantToDelete.id));

            // Show success message
            setSnackbarMessage(`Merchant "${merchantToDelete.name}" successfully deleted`);
            setSnackbarType("success");
            setShowSnackbar(true);

        } catch (error) {
            console.error('Error deleting merchant:', error);
            setSnackbarMessage("Failed to delete merchant. Please try again.");
            setSnackbarType("error");
            setShowSnackbar(true);
        } finally {
            setDeleteLoading(false);
            setShowDeleteDialog(false);
            setMerchantToDelete(null);
        }
    };

    // Handle cancel deletion
    const handleCancelDelete = () => {
        setShowDeleteDialog(false);
        setMerchantToDelete(null);
        setDeleteLoading(false);
    };

    const handleOpenModal = () => {
        setShowAddModal(true);
    };

    const handleCloseModals = () => {
        setShowAddModal(false);
        setModalMode('add');
        setCurrentMerchantId(null);
        setSelectedFile(null); // Reset file
        setPreviewImage(null);
        // Reset form data when closing modal
        setFormData({
            name: '',
            merchantType: '',
            contactEmail: '',
            contactPhone: '',
            contactSecondPhone: '',
            contactPersonName: '',
            address: '',
            siteId: '',
            preferredPaymentMethod: '',
            taxIdentificationNumber: '',
            reliabilityScore: '',
            averageDeliveryTime: '',
            lastOrderDate: '',
            notes: ''
        });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file); // Store the actual file
            const reader = new FileReader();
            reader.onload = (e) => {
                setPreviewImage(e.target.result);
            };
            reader.readAsDataURL(file);
        } else {
            setSelectedFile(null);
            setPreviewImage(null);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };

    const handleAddMerchant = async (e) => {
        e.preventDefault();

        // Validate merchant data using procurement service
        const validation = procurementService.validateMerchant(formData);
        if (!validation.isValid) {
            setSnackbarMessage(validation.errors.join(', '));
            setSnackbarType("error");
            setShowSnackbar(true);
            return;
        }

        try {
            // Create a merchant object from form data
            const merchantData = {
                name: formData.name,
                merchantType: formData.merchantType,
                contactEmail: formData.contactEmail || '',
                contactPhone: formData.contactPhone || '',
                contactSecondPhone: formData.contactSecondPhone || '',
                contactPersonName: formData.contactPersonName || '',
                address: formData.address || '',
                preferredPaymentMethod: formData.preferredPaymentMethod || '',
                taxIdentificationNumber: formData.taxIdentificationNumber || '',
                reliabilityScore: formData.reliabilityScore ? parseFloat(formData.reliabilityScore) : null,
                averageDeliveryTime: formData.averageDeliveryTime ? parseFloat(formData.averageDeliveryTime) : null,
                lastOrderDate: formData.lastOrderDate ? new Date(formData.lastOrderDate).getTime() : null,
                notes: formData.notes || ''
            };

            // Only include siteId if it has a value
            if (formData.siteId && formData.siteId.trim() !== '') {
                merchantData.siteId = formData.siteId;
            }

            const response = await procurementService.addMerchant(merchantData, selectedFile);
            const newMerchant = response.data || response;

            // Add the new merchant to the list
            setMerchants([...merchants, newMerchant]);
            handleCloseModals();
            setSnackbarMessage("Merchant successfully added");
            setSnackbarType("success");
            setShowSnackbar(true);

        } catch (error) {
            console.error('Error adding merchant:', error);
            setSnackbarMessage("Failed to add merchant. Please try again.");
            setSnackbarType("error");
            setShowSnackbar(true);
        }
    };

    const handleUpdateMerchant = async (e) => {
        e.preventDefault();

        // Validate merchant data using procurement service
        const validation = procurementService.validateMerchant(formData);
        if (!validation.isValid) {
            setSnackbarMessage(validation.errors.join(', '));
            setSnackbarType("error");
            setShowSnackbar(true);
            return;
        }

        try {
            // Create a merchant object from form data
            const merchantData = {
                name: formData.name,
                merchantType: formData.merchantType,
                contactEmail: formData.contactEmail || '',
                contactPhone: formData.contactPhone || '',
                contactSecondPhone: formData.contactSecondPhone || '',
                contactPersonName: formData.contactPersonName || '',
                address: formData.address || '',
                preferredPaymentMethod: formData.preferredPaymentMethod || '',
                taxIdentificationNumber: formData.taxIdentificationNumber || '',
                reliabilityScore: formData.reliabilityScore ? parseFloat(formData.reliabilityScore) : null,
                averageDeliveryTime: formData.averageDeliveryTime ? parseFloat(formData.averageDeliveryTime) : null,
                lastOrderDate: formData.lastOrderDate ? new Date(formData.lastOrderDate).getTime() : null,
                notes: formData.notes || ''
            };

            // Only include siteId if it has a value
            if (formData.siteId && formData.siteId.trim() !== '') {
                merchantData.siteId = formData.siteId;
            }

            const response = await procurementService.updateMerchant(currentMerchantId, merchantData, selectedFile);
            const updatedMerchant = response.data || response;

            // Update the merchant in the list
            const updatedMerchants = merchants.map(m =>
                m.id === updatedMerchant.id ? updatedMerchant : m
            );
            setMerchants(updatedMerchants);
            handleCloseModals();
            setSnackbarMessage("Merchant successfully updated");
            setSnackbarType("success");
            setShowSnackbar(true);

        } catch (error) {
            console.error('Error updating merchant:', error);
            setSnackbarMessage("Failed to update merchant. Please try again.");
            setSnackbarType("error");
            setShowSnackbar(true);
        }
    };

    // Define columns for DataTable - Updated with photo column and removed address
    const columns = [
        {
            id: 'photo',
            header: 'Photo',
            accessor: 'photoUrl',
            sortable: false,
            width: '80px',
            render: (merchant, photoUrl) => (
                <EmployeeAvatar
                    photoUrl={photoUrl}
                    firstName={merchant.name}
                    lastName=""
                    size="medium"
                />
            )
        },
        {
            id: 'name',
            header: 'MERCHANT',
            accessor: 'name',
            sortable: true,
            minWidth: '150px',
            flexWeight: 2
        },
        {
            id: 'type',
            header: 'TYPE',
            accessor: 'merchantType',
            sortable: true,
            minWidth: '120px'
        },
        {
            id: 'email',
            header: 'EMAIL',
            accessor: 'contactEmail',
            sortable: true,
            minWidth: '180px',
            render: (row, value) => value || '-'
        },
        {
            id: 'phone',
            header: 'PHONE',
            accessor: 'contactPhone',
            sortable: true,
            minWidth: '130px',
            render: (row, value) => value || '-'
        },
        {
            id: 'site',
            header: 'SITE',
            accessor: 'site.name',
            sortable: true,
            minWidth: '120px',
            render: (row, value) => value || 'None'
        }
    ];

    // Define filterable columns
    const filterableColumns = [
        {
            header: 'Merchant',
            accessor: 'name',
            filterType: 'text'
        },
        {
            header: 'Type',
            accessor: 'merchantType',
            filterType: 'select'
        },
        {
            header: 'Site',
            accessor: 'site.name',
            filterType: 'select'
        }
    ];

    // Define actions for each row - Removed the View action
    const actions = [
        {
            label: 'Edit',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
            ),
            onClick: onEdit,
            className: 'edit'
        },
        {
            label: 'Delete',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
            ),
            onClick: onDelete,
            className: 'delete'
        }
    ];

    const handleInfoClick = () => {
        // Add info click functionality here if needed
        console.log("Info button clicked");
    };

    // Get merchant stats for IntroCard
    const getMerchantStats = () => {
        return [
            { value: merchants.length.toString(), label: "Total Merchants" }
        ];
    };

    return (
        <div className="procurement-merchants-container">
            {/* Updated IntroCard */}
            <IntroCard
                title="Merchants"
                label="PROCUREMENT CENTER"
                lightModeImage={merchantsImage}
                darkModeImage={merchantsImagedark}
                stats={getMerchantStats()}
                onInfoClick={handleInfoClick}
            />

            {/* DataTable */}
            <div className="procurement-merchants-table-container">
                <DataTable
                    data={merchants}
                    columns={columns}
                    loading={loading}
                    showSearch={true}
                    showFilters={true}
                    filterableColumns={filterableColumns}
                    actions={actions}
                    itemsPerPageOptions={[10, 20, 50]}
                    defaultItemsPerPage={10}
                    defaultSortField="name"
                    defaultSortDirection="asc"
                    emptyMessage="No merchants found"
                    className="procurement-merchants-datatable"
                    // DataTable's built-in add button
                    showAddButton={userRole === 'PROCUREMENT' || userRole === 'ADMIN'}
                    addButtonText="Add Merchant"
                    addButtonIcon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14" />
                    </svg>}
                    onAddClick={handleOpenModal}
                    // Add row click handler to make rows clickable
                    onRowClick={handleRowClick}
                    clickableRows={true}
                />
            </div>

            {/* Multi-Step Merchant Modal Wizard */}
            <MerchantModal
                showAddModal={showAddModal}
                modalMode={modalMode}
                formData={formData}
                handleInputChange={handleInputChange}
                handleFileChange={handleFileChange}
                previewImage={previewImage}
                sites={sites}
                handleCloseModals={handleCloseModals}
                handleAddMerchant={handleAddMerchant}
                handleUpdateMerchant={handleUpdateMerchant}
            />

            {/* Confirmation Dialog for Delete */}
            <ConfirmationDialog
                isVisible={showDeleteDialog}
                type="delete"
                title="Delete Merchant"
                message={`Are you sure you want to delete "${merchantToDelete?.name}"? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                onConfirm={handleConfirmDelete}
                onCancel={handleCancelDelete}
                isLoading={deleteLoading}
                showIcon={true}
                size="large"
            />

            {/* Snackbar */}
            <Snackbar
                type={snackbarType}
                message={snackbarMessage}
                show={showSnackbar}
                onClose={() => setShowSnackbar(false)}
                duration={3000}
            />
        </div>
    );
};

export default ProcurementMerchants;