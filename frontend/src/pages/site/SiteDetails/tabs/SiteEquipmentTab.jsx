import React, {useEffect, useState} from "react";
import DataTable from "../../../../components/common/DataTable/DataTable.jsx";
import {useTranslation} from 'react-i18next';
import {useAuth} from "../../../../contexts/AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import { FaPlus } from 'react-icons/fa';
import Snackbar from "../../../../components/common/Snackbar/Snackbar";
import ConfirmationDialog from '../../../../components/common/ConfirmationDialog/ConfirmationDialog';
import { siteService } from "../../../../services/siteService";

const SiteEquipmentTab = ({siteId}) => {
    const {t} = useTranslation();
    const navigate = useNavigate();
    const [equipmentData, setEquipmentData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [availableEquipment, setAvailableEquipment] = useState([]);
    const {currentUser} = useAuth();
    const [snackbar, setSnackbar] = useState({
        show: false,
        message: '',
        type: 'success'
    });
    const [unassignConfirmation, setUnassignConfirmation] = useState({
        isVisible: false,
        equipmentId: null
    });

    const isSiteAdmin = currentUser?.role === "SITE_ADMIN" || currentUser?.role === "ADMIN";

    // Define columns for DataTable
    const columns = [
        {
            header: 'ID',
            accessor: 'conventionalId',
            sortable: true
        },
        {
            header: 'Equipment Type',
            accessor: 'equipmentType',
            sortable: true
        },
        {
            header: 'Status',
            accessor: 'status',
            sortable: true
        },
        {
            header: 'Driver Name',
            accessor: 'driverName',
            sortable: true
        },
        {
            header: 'Manufacture Date',
            accessor: 'manufactureDate',
            sortable: true
        },
        {
            header: 'Purchase Date',
            accessor: 'purchaseDate',
            sortable: true
        },
        {
            header: 'Actions',
            accessor: 'actions',
            sortable: false,
            render: (row) => (
                isSiteAdmin && (
                    <button
                        className="btn-danger"
                        onClick={(e) => {
                            e.stopPropagation(); // Prevent row click
                            handleUnassignEquipment(row.equipmentID);
                        }}
                    >
                        Unassign
                    </button>
                )
            )
        }
    ];

    useEffect(() => {
        fetchEquipment();
    }, [siteId]);

    useEffect(() => {
        if (showModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        // Cleanup function to ensure scroll is restored if component unmounts
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [showModal]);

    const fetchEquipment = async () => {
        try {
            const response = await siteService.getSiteEquipment(siteId);
            const data = response.data;

            if (Array.isArray(data)) {
                const transformedData = data.map((item, index) => ({
                    conventionalId: `EQ-${String(index + 1).padStart(3, '0')}`,
                    equipmentID: item.id,
                    equipmentType: item.type?.name || '',
                    status: item.status,
                    driverName: item.mainDriver ? `${item.mainDriver.firstName} ${item.mainDriver.lastName}` : "No Driver",
                    manufactureDate: item.manufactureYear,
                    purchaseDate: item.purchasedDate,
                }));

                setEquipmentData(transformedData);
            } else {
                setEquipmentData([]);
                setSnackbar({
                    show: true,
                    message: 'No equipment found for this site',
                    type: 'info'
                });
            }

            setLoading(false);
        } catch (err) {
            setError(err.message);
            setEquipmentData([]);
            setLoading(false);
            setSnackbar({
                show: true,
                message: err.message,
                type: 'error'
            });
        }
    };

    // Count equipment types
    const Equipcounts = equipmentData.reduce((acc, item) => {
        acc[item.equipmentType] = (acc[item.equipmentType] || 0) + 1;
        return acc;
    }, {});

    const handleOpenModal = () => {
        setShowModal(true);
        fetchAvailableEquipment();
    };

    const handleCloseModal = () => setShowModal(false);

    const fetchAvailableEquipment = async () => {
        try {
            const response = await siteService.getUnassignedEquipment();
            const data = response.data;
            setAvailableEquipment(data);

            if (data.length === 0) {
                setSnackbar({
                    show: true,
                    message: 'No available equipment found to assign',
                    type: 'info'
                });
            }
        } catch (err) {
            console.error("Error fetching available equipment:", err);
            setAvailableEquipment([]);
            setSnackbar({
                show: true,
                message: 'Failed to fetch available equipment',
                type: 'error'
            });
        }
    };

    const handleAssignEquipment = async (equipmentId) => {
        try {
            await siteService.assignEquipment(siteId, equipmentId);
            setShowModal(false);
            await fetchEquipment();
            setSnackbar({
                show: true,
                message: 'Equipment successfully assigned to site',
                type: 'success'
            });
        } catch (err) {
            console.error("Error assigning equipment:", err);
            setSnackbar({
                show: true,
                message: 'Failed to assign equipment',
                type: 'error'
            });
        }
    };

    const handleUnassignEquipment = async (equipmentId) => {
        setUnassignConfirmation({
            isVisible: true,
            equipmentId: equipmentId
        });
        // try {
        //     await siteService.removeEquipment(siteId, equipmentId);
        //     await fetchEquipment();
        //     setSnackbar({
        //         show: true,
        //         message: 'Equipment successfully unassigned from site',
        //         type: 'success'
        //     });
        // } catch (err) {
        //     console.error("Error unassigning equipment:", err);
        //     setSnackbar({
        //         show: true,
        //         message: 'Failed to unassign equipment',
        //         type: 'error'
        //     });
        // }
    };

    const confirmUnassignEquipment = async () => {
        try {
            await siteService.removeEquipment(siteId, unassignConfirmation.equipmentId);
            await fetchEquipment();
            setSnackbar({
                show: true,
                message: 'Equipment successfully unassigned from site',
                type: 'success'
            });
            // Close the confirmation dialog
            setUnassignConfirmation({ isVisible: false, equipmentId: null });
        } catch (err) {
            console.error("Error unassigning equipment:", err);
            setSnackbar({
                show: true,
                message: 'Failed to unassign equipment',
                type: 'error'
            });
            // Close the confirmation dialog
            setUnassignConfirmation({ isVisible: false, equipmentId: null });
        }
    };

    const handleRowClick = (row) => {
        navigate(`/equipment/${row.equipmentID}`);
        setSnackbar({
            show: true,
            message: `Navigating to equipment details: ${row.equipmentType}`,
            type: 'info'
        });
    };

    const handleCloseSnackbar = () => {
        setSnackbar(prev => ({ ...prev, show: false }));
    };

    // Define filterable columns
    const filterableColumns = [
        { accessor: 'equipmentType', header: 'Equipment Type', filterType: 'select' },
        { accessor: 'status', header: 'Status', filterType: 'select' },
        { accessor: 'driverName', header: 'Driver Name', filterType: 'text' }
    ];

    const handleOverlayClick = (e) => {
        // Only close if clicking on the overlay itself, not on the modal content
        if (e.target === e.currentTarget) {
            handleCloseModal();
        }
    };

    if (loading) return <div className="loading-container">{t('site.loadingEquipment')}</div>;

    return (
        <div className="site-equipment-tab">
            <Snackbar
                show={snackbar.show}
                message={snackbar.message}
                type={snackbar.type}
                onClose={handleCloseSnackbar}
                duration={3000}
            />

            {/* Assign Equipment Modal */}
            {showModal && (
                <div className="assign-equipment-modal-overlay" onClick={handleOverlayClick}>
                    <div className="assign-equipment-modal-content">
                        <div className="assign-equipment-modal-header">
                            <h2>{t('site.assignEquipment')}</h2>
                            <button
                                className="assign-equipment-modal-close-button"
                                onClick={handleCloseModal}
                            >
                                ×
                            </button>
                        </div>

                        <div className="assign-equipment-modal-body">
                            {availableEquipment.length === 0 ? (
                                <div className="assign-equipment-no-equipment">
                                    <p>{t('site.noEquipmentAvailable')}</p>
                                </div>
                            ) : (
                                <div className="assign-equipment-table-container">
                                    <table className="assign-equipment-table">
                                        <thead>
                                        <tr>
                                            <th>{t('common.type')}</th>
                                            <th>{t('common.type')}</th>
                                            <th>{t('common.status')}</th>
                                            <th>{t('common.action')}</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {availableEquipment.map((eq) => {
                                            const eqData = eq.equipment || {};
                                            const eqModel = eq.model || {};
                                            const equipmentId = eqData.id || eq.id;
                                            const equipmentType = eq.type?.name || eq.typeName || '';
                                            const status = eqData.status || eq.status;

                                            return (
                                                <tr key={equipmentId}>
                                                    <td
                                                        className="assign-equipment-type"
                                                        data-label={t('common.type')}
                                                    >
                                                        {equipmentType}
                                                    </td>
                                                    <td
                                                        className="assign-equipment-type"
                                                        data-label={t('common.type')}
                                                    >
                                                        {eqModel}
                                                    </td>
                                                    <td data-label={t('common.status')}>
                                                        <span
                                                            className={`assign-equipment-status status-${status?.toLowerCase().replace(/\s+/g, '-')}`}
                                                        >
                                                            {status}
                                                        </span>
                                                    </td>
                                                    <td data-label={t('common.action')}>
                                                        <button
                                                            className="assign-equipment-btn"
                                                            onClick={() => handleAssignEquipment(equipmentId)}
                                                        >
                                                            {t('site.assign')}
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            <ConfirmationDialog
                isVisible={unassignConfirmation.isVisible}
                type="warning"
                title="Unassign Equipment"
                message="Are you sure you want to unassign this equipment from the site?"
                confirmText="Unassign"
                cancelText="Cancel"
                onConfirm={confirmUnassignEquipment}
                onCancel={() => setUnassignConfirmation({ isVisible: false, equipmentId: null })}
            />

            {error ? (
                <div className="error-container">{error}</div>
            ) : (
                <div className="data-table-container">
                    <DataTable
                        data={equipmentData}
                        columns={columns}
                        loading={loading}
                        showSearch={true}
                        showFilters={true}
                        filterableColumns={filterableColumns}
                        itemsPerPageOptions={[10, 25, 50, 100]}
                        defaultItemsPerPage={10}
                        tableTitle=""
                        onRowClick={handleRowClick}
                        rowClassName="clickable-row"
                        // Add button configuration - only show for site admins
                        showAddButton={isSiteAdmin}
                        addButtonText={t('site.assignEquipment')}
                        addButtonIcon={<FaPlus />}
                        onAddClick={handleOpenModal}
                        addButtonProps={{
                            className: 'assign-button'
                        }}
                        // Optional: Add export functionality
                        showExportButton={false}
                        exportButtonText="Export Equipment"
                        exportFileName="site_equipment"
                        // Empty message
                        emptyMessage="No equipment found for this site"
                    />
                </div>
            )}
        </div>
    );
};

export default SiteEquipmentTab;