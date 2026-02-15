import React, { useState, useEffect } from "react";
import DataTable from "../../../components/common/DataTable/DataTable.jsx";
import PageHeader from "../../../components/common/PageHeader/PageHeader.jsx";
import Snackbar from "../../../components/common/Snackbar2/Snackbar2.jsx";
import ConfirmationDialog from "../../../components/common/ConfirmationDialog/ConfirmationDialog.jsx";
import MeasuringUnitModal from "./MeasuringUnitModal/MeasuringUnitModal.jsx";
import "./MeasuringUnits.scss";
import { measuringUnitService } from '../../../services/warehouse/measuringUnitService';
import { FaPlus } from 'react-icons/fa';

const MeasuringUnitsPage = () => {
    const [tableData, setTableData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUnit, setSelectedUnit] = useState(null);

    // Snackbar notification states
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success');

    // Confirmation dialog states
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [unitToDelete, setUnitToDelete] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const [userRole, setUserRole] = useState("");

    const openUnitModal = (unit = null) => {
        setSelectedUnit(unit);
        setIsModalOpen(true);
    };

    useEffect(() => {
        fetchMeasuringUnits();
    }, []);

    useEffect(() => {
        try {
            const userInfoString = localStorage.getItem("userInfo");
            if (userInfoString) {
                const userInfo = JSON.parse(userInfoString);
                setUserRole(userInfo.role);
            }
        } catch (error) {
            console.error("Error parsing user info:", error);
        }
    }, []);

    const fetchMeasuringUnits = async () => {
        setLoading(true);
        try {
            const data = await measuringUnitService.getAll();
            setTableData(data);
        } catch (error) {
            console.error("Error fetching measuring units:", error);
            showSnackbar("Failed to load measuring units", "error");
        }
        setLoading(false);
    };

    const showSnackbar = (message, type = 'success') => {
        setNotificationMessage(message);
        setNotificationType(type);
        setShowNotification(true);
    };

    const handleDeleteRequest = (id) => {
        const unit = tableData.find(unit => unit.id === id);
        setUnitToDelete({ id, name: unit?.name || 'Unknown Unit' });
        setShowConfirmDialog(true);
    };

    const confirmDeleteUnit = async () => {
        if (!unitToDelete) return;

        try {
            setDeleteLoading(true);
            await measuringUnitService.delete(unitToDelete.id);
            await fetchMeasuringUnits(); // Refresh the list
            showSnackbar(`Measuring unit "${unitToDelete.name}" successfully deactivated!`, "success");
        } catch (error) {
            console.error("Error deleting measuring unit:", error);
            showSnackbar(error.message || "Failed to delete measuring unit", "error");
        } finally {
            setDeleteLoading(false);
            setShowConfirmDialog(false);
            setUnitToDelete(null);
        }
    };

    const cancelDeleteUnit = () => {
        setShowConfirmDialog(false);
        setUnitToDelete(null);
        setDeleteLoading(false);
    };

    const handleModalSubmit = async (payload, selectedUnit) => {
        try {
            let result;
            if (selectedUnit) {
                result = await measuringUnitService.update(selectedUnit.id, payload);
                showSnackbar("Measuring unit successfully updated!", "success");
            } else {
                result = await measuringUnitService.create(payload);
                showSnackbar("Measuring unit successfully added!", "success");
            }

            await fetchMeasuringUnits(); // Refresh the list
            setIsModalOpen(false);
            setSelectedUnit(null);
        } catch (error) {
            console.error(`Error ${selectedUnit ? 'updating' : 'adding'} measuring unit:`, error);
            showSnackbar(error.message || "Operation failed", "error");
        }
    };

    const columns = [
        {
            header: 'NAME',
            accessor: 'name',
            sortable: true,
            width: '200px',
            render: (row) => (
                <span className="unit-name-tag">
                    {row.name}
                </span>
            )
        },
        {
            header: 'DISPLAY NAME',
            accessor: 'displayName',
            sortable: true,
            width: '200px'
        },
        {
            header: 'ABBREVIATION',
            accessor: 'abbreviation',
            sortable: true,
            width: '150px'
        },
        {
            header: 'STATUS',
            accessor: 'isActive',
            sortable: true,
            width: '120px',
            render: (row) => (
                <span className={`status-badge ${row.isActive ? 'active' : 'inactive'}`}>
                    {row.isActive ? 'Active' : 'Inactive'}
                </span>
            )
        }
    ];

    const filterableColumns = [
        { header: 'NAME', accessor: 'name', filterType: 'text' },
        { header: 'DISPLAY NAME', accessor: 'displayName', filterType: 'text' },
        { header: 'ABBREVIATION', accessor: 'abbreviation', filterType: 'text' },
        { header: 'STATUS', accessor: 'isActive', filterType: 'select' }
    ];

    const actions = [
        {
            label: 'Edit',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
            ),
            className: 'edit',
            onClick: (row) => openUnitModal(row)
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
            className: 'delete',
            onClick: (row) => handleDeleteRequest(row.id)
        }
    ];

    return (
        <>
            <PageHeader
                title="Measuring Units"
                subtitle="Manage standardized units of measurement for inventory items"
            />

            <DataTable
                data={tableData}
                columns={columns}
                loading={loading}
                emptyMessage="No measuring units found. Add a new measuring unit to get started"
                actions={actions}
                showAddButton={userRole === "WAREHOUSE_MANAGER" || userRole === "ADMIN"}
                addButtonText="Add Measuring Unit"
                addButtonIcon={<FaPlus />}
                onAddClick={() => openUnitModal()}
                showExportButton={true}
                exportFileName="measuring-units"
                className="measuring-units-table"
                showSearch={true}
                showFilters={true}
                filterableColumns={filterableColumns}
                itemsPerPageOptions={[5, 10, 15, 20]}
                defaultItemsPerPage={10}
            />

            <MeasuringUnitModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedUnit(null);
                }}
                selectedUnit={selectedUnit}
                onSubmit={handleModalSubmit}
            />

            <ConfirmationDialog
                isVisible={showConfirmDialog}
                type="delete"
                title="Deactivate Measuring Unit"
                message={
                    unitToDelete
                        ? `Are you sure you want to deactivate the measuring unit "${unitToDelete.name}"? This will not delete it, but mark it as inactive.`
                        : "Are you sure you want to deactivate this measuring unit?"
                }
                confirmText="Deactivate"
                cancelText="Cancel"
                onConfirm={confirmDeleteUnit}
                onCancel={cancelDeleteUnit}
                isLoading={deleteLoading}
            />

            <Snackbar
                type={notificationType}
                text={notificationMessage}
                isVisible={showNotification}
                onClose={() => setShowNotification(false)}
                duration={notificationType === 'error' ? 5000 : 3000}
            />
        </>
    );
};

export default MeasuringUnitsPage;