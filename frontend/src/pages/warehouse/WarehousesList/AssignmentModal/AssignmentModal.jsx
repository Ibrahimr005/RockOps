import React, { useState, useEffect } from 'react';
import { FaPlus, FaTimes } from 'react-icons/fa';
import { warehouseEmployeeService } from '../../../../services/warehouse/warehouseEmployeeService';
import { useAuth } from '../../../../contexts/AuthContext';
import './AssignmentModal.scss';

const AssignmentModal = ({
                             isOpen,
                             onClose,
                             selectedWarehouse,
                             warehouseEmployees,
                             onSuccess,
                             showSnackbar,
                             showConfirmDialog,
                             hideConfirmDialog
                         }) => {
    console.log('🟡 AssignmentModal rendered - isOpen:', isOpen, 'selectedWarehouse:', selectedWarehouse);

    const { currentUser } = useAuth();
    const [assignedEmployees, setAssignedEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState("");
    const [assignmentLoading, setAssignmentLoading] = useState(false);
    const [pendingAssignments, setPendingAssignments] = useState([]);
    const [pendingUnassignments, setPendingUnassignments] = useState([]);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    useEffect(() => {
        if (isOpen && selectedWarehouse) {
            fetchWarehouseAssignedEmployees(selectedWarehouse.id);
        }
    }, [isOpen, selectedWarehouse]);

    useEffect(() => {
        if (isOpen) {
            document.body.classList.add("modal-open");
        } else {
            document.body.classList.remove("modal-open");
        }

        return () => {
            document.body.classList.remove("modal-open");
        };
    }, [isOpen]);

    const fetchWarehouseAssignedEmployees = async (warehouseId) => {
        try {
            setAssignmentLoading(true);
            const data = await warehouseEmployeeService.getWarehouseAssignedUsers(warehouseId);

            if (!Array.isArray(data)) {
                setAssignedEmployees([]);
                return;
            }

            if (data.length === 0) {
                setAssignedEmployees([]);
                return;
            }

            const employees = data.map((dto) => ({
                id: dto.userId,
                firstName: dto.firstName,
                lastName: dto.lastName,
                username: dto.username,
                role: dto.role,
                assignedAt: dto.assignedAt,
                assignedBy: dto.assignedBy,
                assignmentId: dto.assignmentId
            }));

            setAssignedEmployees(employees);
        } catch (error) {
            console.error("Error fetching assigned employees:", error);
            setAssignedEmployees([]);
        } finally {
            setAssignmentLoading(false);
        }
    };

    const assignEmployeeToWarehouseAPI = async (employeeId, warehouseId) => {
        return await warehouseEmployeeService.assignToWarehouse(employeeId, { warehouseId });
    };

    const unassignEmployeeFromWarehouseAPI = async (employeeId, warehouseId) => {
        return await warehouseEmployeeService.unassignFromWarehouse(employeeId, { warehouseId });
    };

    const handleCloseModal = () => {
        if (hasUnsavedChanges) {
            showConfirmDialog(
                'warning',
                'Unsaved Changes',
                'You have unsaved changes. Are you sure you want to close without applying them?',
                () => {
                    resetModal();
                    onClose();
                    hideConfirmDialog();
                }
            );
            return;
        }

        resetModal();
        onClose();
    };

    const resetModal = () => {
        setSelectedEmployee("");
        setAssignedEmployees([]);
        setAssignmentLoading(false);
        setPendingAssignments([]);
        setPendingUnassignments([]);
        setHasUnsavedChanges(false);
    };

    const handleApplyChanges = async () => {
        if (!hasUnsavedChanges) {
            resetModal();
            onClose();
            return;
        }

        try {
            setAssignmentLoading(true);

            for (const employeeId of pendingAssignments) {
                await assignEmployeeToWarehouseAPI(employeeId, selectedWarehouse.id);
            }

            for (const employeeId of pendingUnassignments) {
                await unassignEmployeeFromWarehouseAPI(employeeId, selectedWarehouse.id);
            }

            const totalChanges = pendingAssignments.length + pendingUnassignments.length;
            showSnackbar('success', `Successfully applied ${totalChanges} change${totalChanges !== 1 ? 's' : ''} to ${selectedWarehouse.name}`);

            resetModal();
            onClose();
            if (onSuccess) onSuccess();

        } catch (error) {
            console.error("Error applying changes:", error);
            showSnackbar('error', `Failed to apply changes: ${error.message}`);
        } finally {
            setAssignmentLoading(false);
        }
    };

    const handleEmployeeSelect = (e) => {
        const employeeId = e.target.value;
        setSelectedEmployee(employeeId);
    };

    const handleAssignEmployee = () => {
        if (!selectedEmployee || !selectedWarehouse) {
            return;
        }

        const employeeToAssign = warehouseEmployees.find(emp => emp.id === selectedEmployee);
        if (!employeeToAssign) {
            return;
        }

        const tempAssignment = {
            id: employeeToAssign.id,
            firstName: employeeToAssign.firstName,
            lastName: employeeToAssign.lastName,
            username: employeeToAssign.username,
            role: employeeToAssign.role,
            assignedAt: new Date().toISOString(),
            assignedBy: currentUser?.username || 'Unknown',
            assignmentId: `temp-${Date.now()}`,
            isPending: true
        };

        setPendingAssignments(prev => [...prev, selectedEmployee]);
        setAssignedEmployees(prev => [...prev, tempAssignment]);
        setHasUnsavedChanges(true);
        setSelectedEmployee("");
    };

    const handleUnassignEmployee = (employeeId) => {
        if (!selectedWarehouse) {
            return;
        }

        if (pendingAssignments.includes(employeeId)) {
            setPendingAssignments(prev => prev.filter(id => id !== employeeId));
            setAssignedEmployees(prev => prev.filter(emp => emp.id !== employeeId));

            const stillHasAssignments = pendingAssignments.filter(id => id !== employeeId).length > 0;
            const stillHasUnassignments = pendingUnassignments.length > 0;
            setHasUnsavedChanges(stillHasAssignments || stillHasUnassignments);

            return;
        }

        setPendingUnassignments(prev => [...prev, employeeId]);
        setAssignedEmployees(prev => prev.filter(emp => emp.id !== employeeId));
        setHasUnsavedChanges(true);
    };

    const getAvailableEmployeesForAssignment = () => {
        if (!selectedWarehouse) return [];

        const assignedToCurrentWarehouseIds = assignedEmployees.map(emp => emp.id);

        const availableEmployees = warehouseEmployees.filter(emp =>
            !assignedToCurrentWarehouseIds.includes(emp.id)
        );

        return availableEmployees;
    };

    if (!isOpen) return null;

    return (
        <div className="warehouse-modal-overlay">
            <div className="warehouse-modal-content warehouse-modal-large">
                <div className="warehouse-modal-header">
                    <h2>Assign Employees to {selectedWarehouse?.name}</h2>
                    <button className="warehouse-modal-close-button" onClick={handleCloseModal}>×</button>
                </div>

                <div className="warehouse-modal-body">
                    {assignmentLoading ? (
                        <div className="warehouse-loading-state">Loading employees...</div>
                    ) : (
                        <div className="warehouse-assignment-container">
                            {/* Assignment Section */}
                            <div className="warehouse-assignment-section">
                                <h3>Add Employee</h3>
                                <div className="warehouse-assignment-controls">
                                    <select
                                        value={selectedEmployee}
                                        onChange={handleEmployeeSelect}
                                        className="warehouse-employee-select"
                                    >
                                        <option value="">Select an employee</option>
                                        {getAvailableEmployeesForAssignment().map(emp => (
                                            <option key={emp.id} value={emp.id}>
                                                {emp.firstName} {emp.lastName} ({emp.username})
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={handleAssignEmployee}
                                        disabled={!selectedEmployee}
                                        className="warehouse-assign-button"
                                    >
                                        <FaPlus /> Assign
                                    </button>
                                </div>
                            </div>

                            {/* Assigned Employees List */}
                            <div className="warehouse-assigned-section">
                                <h3>Assigned Employees ({assignedEmployees.length})</h3>
                                {assignedEmployees.length === 0 ? (
                                    <p className="warehouse-no-employees">No employees assigned yet</p>
                                ) : (
                                    <div className="warehouse-assigned-list">
                                        {assignedEmployees.map(emp => (
                                            <div key={emp.id} className={`warehouse-employee-item ${emp.isPending ? 'pending' : ''}`}>
                                                <div className="warehouse-employee-info">
                                                    <strong>{emp.firstName} {emp.lastName}</strong>
                                                    <span className="warehouse-employee-username">@{emp.username}</span>
                                                    {emp.isPending && <span className="warehouse-pending-badge">Pending</span>}
                                                </div>
                                                <button
                                                    onClick={() => handleUnassignEmployee(emp.id)}
                                                    className="warehouse-unassign-button"
                                                >
                                                    <FaTimes /> Remove
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="warehouse-modal-actions">
                                <button
                                    onClick={handleCloseModal}
                                    className="warehouse-cancel-button"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleApplyChanges}
                                    className="warehouse-submit-button"
                                    disabled={!hasUnsavedChanges}
                                >
                                    {hasUnsavedChanges ? 'Apply Changes' : 'Close'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AssignmentModal;