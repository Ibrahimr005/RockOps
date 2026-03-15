// frontend/src/services/payroll/payrollService.js
import apiClient from '../../utils/apiClient.js';

// Payroll API endpoints
const PAYROLL_ENDPOINTS = {
    BASE: '/api/v1/payroll',
    BY_ID: (id) => `/api/v1/payroll/${id}`,
    BY_PERIOD: (startDate, endDate) => `/api/v1/payroll/period?startDate=${startDate}&endDate=${endDate}`,
    DELETE: (id) => `/api/v1/payroll/${id}`,

    // Public holidays
    ADD_HOLIDAYS: (id) => `/api/v1/payroll/${id}/add-public-holidays`,
    GET_HOLIDAYS: (id) => `/api/v1/payroll/${id}/public-holidays`,

    // State transitions
    IMPORT_ATTENDANCE: (id) => `/api/v1/payroll/${id}/import-attendance`,
    LEAVE_REVIEW: (id) => `/api/v1/payroll/${id}/leave-review`,
    OVERTIME_REVIEW: (id) => `/api/v1/payroll/${id}/overtime-review`,
    DEDUCTION_REVIEW: (id) => `/api/v1/payroll/${id}/deduction-review`,
    CONFIRM_LOCK: (id) => `/api/v1/payroll/${id}/confirm-lock`,

    // ⭐ Attendance workflow endpoints
    ATTENDANCE_STATUS: (id) => `/api/v1/payroll/${id}/attendance-status`,
    FINALIZE_ATTENDANCE: (id) => `/api/v1/payroll/${id}/finalize-attendance`,
    NOTIFY_HR: (id) => `/api/v1/payroll/${id}/notify-hr`,
    RESET_ATTENDANCE: (id) => `/api/v1/payroll/${id}/reset-attendance`,

    // ⭐ Leave Review workflow endpoints
    LEAVE_STATUS: (id) => `/api/v1/payroll/${id}/leave-status`,
    PROCESS_LEAVE_REVIEW: (id) => `/api/v1/payroll/${id}/process-leave-review`,
    FINALIZE_LEAVE: (id) => `/api/v1/payroll/${id}/finalize-leave`,
    NOTIFY_HR_LEAVE: (id) => `/api/v1/payroll/${id}/notify-hr-leave`,
    LEAVE_REQUESTS_FOR_PAYROLL: (id) => `/api/v1/payroll/${id}/leave-requests`,

    // ⭐ Bonus Review workflow endpoints
    BONUS_STATUS: (id) => `/api/v1/payroll/${id}/bonus-status`,
    PROCESS_BONUS_REVIEW: (id) => `/api/v1/payroll/${id}/process-bonus-review`,
    FINALIZE_BONUS: (id) => `/api/v1/payroll/${id}/finalize-bonus`,
    BONUS_SUMMARIES: (id) => `/api/v1/payroll/${id}/bonus-summaries`,

    // ⭐ Deduction Review workflow endpoints
    DEDUCTION_STATUS: (id) => `/api/v1/payroll/${id}/deduction-status`,
    PROCESS_DEDUCTION_REVIEW: (id) => `/api/v1/payroll/${id}/process-deduction-review`,
    FINALIZE_DEDUCTION: (id) => `/api/v1/payroll/${id}/finalize-deduction`,
    NOTIFY_HR_DEDUCTION: (id) => `/api/v1/payroll/${id}/notify-hr-deduction`,
    DEDUCTION_SUMMARIES: (id) => `/api/v1/payroll/${id}/deduction-summaries`,

    // Employee payrolls
    EMPLOYEE_PAYROLLS: (id) => `/api/v1/payroll/${id}/employees`,
    EMPLOYEE_PAYROLL: (payrollId, employeeId) => `/api/v1/payroll/${payrollId}/employee/${employeeId}`,
    EMPLOYEE_PAYROLL_HISTORY: (employeeId) => `/api/v1/payroll/employee/${employeeId}/history`,
};

export const payrollService = {
    // ========================================
    // CORE PAYROLL METHODS
    // ========================================
    getLatestPayroll: async () => {
        try {
            const response = await apiClient.get(`${PAYROLL_ENDPOINTS.BASE}/latest`);
            return response.data; // Might be empty if no content
        } catch (error) {
            console.error('Error fetching latest payroll:', error);
            throw error;
        }
    },
    getAllPayrolls: async () => {
        try {
            const response = await apiClient.get(PAYROLL_ENDPOINTS.BASE);
            return response.data;
        } catch (error) {
            console.error('Error fetching payroll cycles:', error);
            throw error;
        }
    },

    getPayrollById: async (id) => {
        try {
            const response = await apiClient.get(PAYROLL_ENDPOINTS.BY_ID(id));
            return response.data;
        } catch (error) {
            console.error('Error fetching payroll by ID:', error);

            if (error.response?.status === 404) {
                throw new Error('Payroll cycle not found');
            } else if (error.response?.status === 403) {
                throw new Error('You do not have permission to view this payroll');
            } else if (error.response?.status === 401) {
                throw new Error('Please log in to view this payroll');
            }

            throw error;
        }
    },

    getPayrollByPeriod: async (startDate, endDate) => {
        try {
            const response = await apiClient.get(PAYROLL_ENDPOINTS.BY_PERIOD(startDate, endDate));
            return response.data;
        } catch (error) {
            console.error('Error fetching payroll by period:', error);

            if (error.response?.status === 404) {
                throw new Error(`No payroll found for period ${startDate} to ${endDate}`);
            }

            throw error;
        }
    },

    createPayroll: async (payrollData) => {
        try {

            const username = localStorage.getItem('username') || 'admin';
            const requestData = {
                ...payrollData,
                createdBy: username,
            };

            const response = await apiClient.post(PAYROLL_ENDPOINTS.BASE, requestData);
            return response.data;
        } catch (error) {
            console.error('Error creating payroll:', error);

            if (error.response?.status === 409) {
                throw new Error(error.response.data.message || 'Payroll already exists for this period');
            } else if (error.response?.status === 400) {
                throw new Error(error.response.data.message || 'Invalid payroll data');
            }

            throw error;
        }
    },

    deletePayroll: async (id) => {
        try {
            const username = localStorage.getItem('username') || 'admin';
            const response = await apiClient.delete(
                `${PAYROLL_ENDPOINTS.DELETE(id)}?username=${username}`
            );
            return response.data;
        } catch (error) {
            console.error('Error deleting payroll:', error);

            if (error.response?.status === 400) {
                throw new Error(error.response.data.message || 'Cannot delete locked payroll');
            } else if (error.response?.status === 404) {
                throw new Error('Payroll not found');
            }

            throw error;
        }
    },

    // ========================================
    // PUBLIC HOLIDAYS METHODS
    // ========================================

    getPublicHolidays: async (payrollId) => {
        try {
            const response = await apiClient.get(PAYROLL_ENDPOINTS.GET_HOLIDAYS(payrollId));
            return response.data;
        } catch (error) {
            console.error('Error fetching public holidays:', error);

            if (error.response?.status === 404) {
                return [];
            }

            throw error;
        }
    },

    addPublicHolidays: async (payrollId, holidays) => {
        try {
            const response = await apiClient.post(
                PAYROLL_ENDPOINTS.ADD_HOLIDAYS(payrollId),
                holidays
            );
            return response.data;
        } catch (error) {
            console.error('Error adding public holidays:', error);

            if (error.response?.status === 400) {
                throw new Error(error.response.data.message || 'Invalid holiday data');
            }

            throw error;
        }
    },

    // ========================================
    // ⭐ ATTENDANCE WORKFLOW METHODS
    // ========================================

    importAttendance: async (payrollId) => {
        try {
            const response = await apiClient.post(PAYROLL_ENDPOINTS.IMPORT_ATTENDANCE(payrollId));


            return response.data;

        } catch (error) {
            console.error('❌ Error importing attendance:', error);

            if (error.response?.status === 409) {
                throw new Error(error.response.data.message || 'Attendance is finalized and locked. Cannot import.');
            } else if (error.response?.status === 400) {
                throw new Error(error.response.data.message || 'Failed to import attendance');
            }

            throw error;
        }
    },

    getAttendanceStatus: async (payrollId) => {
        try {
            const response = await apiClient.get(PAYROLL_ENDPOINTS.ATTENDANCE_STATUS(payrollId));
            return response.data;
        } catch (error) {
            console.error('Error fetching attendance status:', error);

            if (error.response?.status === 404) {
                throw new Error('Payroll not found');
            }

            throw error;
        }
    },

    finalizeAttendance: async (payrollId) => {
        try {
            const response = await apiClient.post(PAYROLL_ENDPOINTS.FINALIZE_ATTENDANCE(payrollId));
            return response.data;
        } catch (error) {
            console.error('Error finalizing attendance:', error);

            if (error.response?.status === 409) {
                throw new Error('Cannot finalize attendance in current state');
            } else if (error.response?.status === 400) {
                throw new Error(error.response.data.message || 'Failed to finalize attendance');
            }

            throw error;
        }
    },

    notifyHR: async (payrollId) => {
        try {
            const response = await apiClient.post(PAYROLL_ENDPOINTS.NOTIFY_HR(payrollId));
            return response.data;
        } catch (error) {
            console.error('Error notifying HR:', error);

            if (error.response?.status === 409) {
                throw new Error('Attendance is already finalized. Cannot send notification.');
            } else if (error.response?.status === 400) {
                throw new Error(error.response.data.message || 'Failed to send notification');
            }

            throw error;
        }
    },

    resetAttendanceImport: async (payrollId) => {
        try {
            const response = await apiClient.delete(PAYROLL_ENDPOINTS.RESET_ATTENDANCE(payrollId));
            return response.data;
        } catch (error) {
            console.error('Error resetting attendance:', error);

            if (error.response?.status === 409) {
                throw new Error('Cannot reset finalized attendance');
            } else if (error.response?.status === 403) {
                throw new Error('Admin access required to reset attendance');
            } else if (error.response?.status === 400) {
                throw new Error(error.response.data.message || 'Failed to reset attendance');
            }

            throw error;
        }
    },

    // ========================================
    // ⭐ LEAVE REVIEW WORKFLOW METHODS
    // ========================================

    getLeaveStatus: async (payrollId) => {
        try {
            const response = await apiClient.get(PAYROLL_ENDPOINTS.LEAVE_STATUS(payrollId));
            return response.data;
        } catch (error) {
            console.error('Error fetching leave status:', error);

            if (error.response?.status === 404) {
                throw new Error('Payroll not found');
            }

            throw error;
        }
    },

    processLeaveReview: async (payrollId) => {
        try {
            const response = await apiClient.post(PAYROLL_ENDPOINTS.PROCESS_LEAVE_REVIEW(payrollId));
            return response.data;
        } catch (error) {
            console.error('❌ Error processing leave review:', error);

            if (error.response?.status === 409) {
                throw new Error(error.response.data.message || 'Leave is finalized and locked. Cannot process.');
            } else if (error.response?.status === 400) {
                throw new Error(error.response.data.message || 'Failed to process leave review');
            }

            throw error;
        }
    },

    finalizeLeave: async (payrollId) => {
        try {
            const response = await apiClient.post(PAYROLL_ENDPOINTS.FINALIZE_LEAVE(payrollId));
            return response.data;
        } catch (error) {
            console.error('Error finalizing leave review:', error);

            if (error.response?.status === 409) {
                throw new Error('Cannot finalize leave review in current state');
            } else if (error.response?.status === 400) {
                throw new Error(error.response.data.message || 'Failed to finalize leave review');
            }

            throw error;
        }
    },

    notifyHRForLeave: async (payrollId) => {
        try {
            const response = await apiClient.post(PAYROLL_ENDPOINTS.NOTIFY_HR_LEAVE(payrollId));
            return response.data;
        } catch (error) {
            console.error('Error notifying HR for leave:', error);

            if (error.response?.status === 409) {
                throw new Error('Leave is already finalized. Cannot send notification.');
            } else if (error.response?.status === 400) {
                throw new Error(error.response.data.message || 'Failed to send notification');
            }

            throw error;
        }
    },

    getLeaveRequestsForPayroll: async (payrollId) => {
        try {
            const response = await apiClient.get(PAYROLL_ENDPOINTS.LEAVE_REQUESTS_FOR_PAYROLL(payrollId));
            return response.data;
        } catch (error) {
            console.error('Error fetching leave requests for payroll:', error);
            throw error;
        }
    },

    // ========================================
    // EMPLOYEE PAYROLL METHODS
    // ========================================

    getEmployeePayrolls: async (payrollId) => {
        try {
            const response = await apiClient.get(PAYROLL_ENDPOINTS.EMPLOYEE_PAYROLLS(payrollId));
            return response.data;
        } catch (error) {
            console.error('Error fetching employee payrolls:', error);
            throw error;
        }
    },

    getEmployeePayroll: async (payrollId, employeeId) => {
        try {
            const response = await apiClient.get(
                PAYROLL_ENDPOINTS.EMPLOYEE_PAYROLL(payrollId, employeeId)
            );
            return response.data;
        } catch (error) {
            console.error('Error fetching employee payroll:', error);

            if (error.response?.status === 404) {
                throw new Error('Employee payroll not found');
            }

            throw error;
        }
    },

    /**
     * Get payroll history for a specific employee across all payroll cycles
     */
    getEmployeePayrollHistory: async (employeeId) => {
        const response = await apiClient.get(PAYROLL_ENDPOINTS.EMPLOYEE_PAYROLL_HISTORY(employeeId));
        return response.data;
    },

    // ========================================
    // STATE TRANSITION METHODS
    // ========================================

    moveToLeaveReview: async (payrollId) => {
        try {
            const username = localStorage.getItem('username') || 'admin';
            const response = await apiClient.post(
                `${PAYROLL_ENDPOINTS.LEAVE_REVIEW(payrollId)}?username=${username}`
            );
            return response.data;
        } catch (error) {
            console.error('Error moving to leave review:', error);
            throw error;
        }
    },

    moveToOvertimeReview: async (payrollId) => {
        try {
            const username = localStorage.getItem('username') || 'admin';
            const response = await apiClient.post(
                `${PAYROLL_ENDPOINTS.OVERTIME_REVIEW(payrollId)}?username=${username}`
            );
            return response.data;
        } catch (error) {
            console.error('Error moving to overtime review:', error);
            throw error;
        }
    },

    confirmAndLock: async (payrollId) => {
        try {
            const username = localStorage.getItem('username') || 'admin';
            const response = await apiClient.post(
                `${PAYROLL_ENDPOINTS.CONFIRM_LOCK(payrollId)}?username=${username}`
            );
            return response.data;
        } catch (error) {
            console.error('Error confirming and locking payroll:', error);

            if (error.response?.status === 400) {
                throw new Error(error.response.data.message || 'Failed to lock payroll');
            }

            throw error;
        }
    },

    transitionState: async (payrollId, endpoint, actionName) => {
        try {
            const username = localStorage.getItem('username') || 'admin';
            const response = await apiClient.post(`${endpoint}?username=${username}`);
            return response.data;
        } catch (error) {
            console.error(`Error during ${actionName}:`, error);

            if (error.response?.status === 400) {
                throw new Error(error.response.data.message || `Failed to ${actionName.toLowerCase()}`);
            }

            throw error;
        }
    },

    // ========================================
// ADD THESE METHODS TO payrollService.js
// Add after the Leave Review methods section
// ========================================

    // ========================================
    // ⭐ OVERTIME REVIEW WORKFLOW METHODS
    // ========================================

    getOvertimeStatus: async (payrollId) => {
        try {
            const response = await apiClient.get(`/api/v1/payroll/${payrollId}/overtime-status`);
            return response.data;
        } catch (error) {
            console.error('Error fetching overtime status:', error);

            if (error.response?.status === 404) {
                throw new Error('Payroll not found');
            }

            throw error;
        }
    },

    processOvertimeReview: async (payrollId) => {
        try {
            const response = await apiClient.post(`/api/v1/payroll/${payrollId}/process-overtime-review`);
            return response.data;
        } catch (error) {
            console.error('❌ Error processing overtime review:', error);

            if (error.response?.status === 409) {
                throw new Error(error.response.data.message || 'Overtime is finalized and locked. Cannot process.');
            } else if (error.response?.status === 400) {
                throw new Error(error.response.data.message || 'Failed to process overtime review');
            }

            throw error;
        }
    },

    finalizeOvertime: async (payrollId) => {
        try {
            const response = await apiClient.post(`/api/v1/payroll/${payrollId}/finalize-overtime`);
            return response.data;
        } catch (error) {
            console.error('Error finalizing overtime review:', error);

            if (error.response?.status === 409) {
                throw new Error('Cannot finalize overtime review in current state');
            } else if (error.response?.status === 400) {
                throw new Error(error.response.data.message || 'Failed to finalize overtime review');
            }

            throw error;
        }
    },

    notifyHRForOvertime: async (payrollId) => {
        try {
            const response = await apiClient.post(`/api/v1/payroll/${payrollId}/notify-hr-overtime`);
            return response.data;
        } catch (error) {
            console.error('Error notifying HR for overtime:', error);

            if (error.response?.status === 409) {
                throw new Error('Overtime is already finalized. Cannot send notification.');
            } else if (error.response?.status === 400) {
                throw new Error(error.response.data.message || 'Failed to send notification');
            }

            throw error;
        }
    },

    getOvertimeRecordsForPayroll: async (payrollId) => {
        try {
            const response = await apiClient.get(`/api/v1/payroll/${payrollId}/overtime-records`);
            return response.data;
        } catch (error) {
            console.error('Error fetching overtime records for payroll:', error);
            throw error;
        }
    },

    // ========================================
    // ⭐ BONUS REVIEW WORKFLOW METHODS
    // ========================================

    getBonusStatus: async (payrollId) => {
        try {
            const response = await apiClient.get(PAYROLL_ENDPOINTS.BONUS_STATUS(payrollId));
            return response.data;
        } catch (error) {
            console.error('Error fetching bonus status:', error);

            if (error.response?.status === 404) {
                throw new Error('Payroll not found');
            }

            throw error;
        }
    },

    processBonusReview: async (payrollId) => {
        try {
            const response = await apiClient.post(PAYROLL_ENDPOINTS.PROCESS_BONUS_REVIEW(payrollId));
            return response.data;
        } catch (error) {
            console.error('Error processing bonus review:', error);

            if (error.response?.status === 409) {
                throw new Error(error.response.data.message || 'Bonuses are finalized and locked. Cannot process.');
            } else if (error.response?.status === 400) {
                throw new Error(error.response.data.message || 'Failed to process bonus review');
            }

            throw error;
        }
    },

    finalizeBonus: async (payrollId) => {
        try {
            const response = await apiClient.post(PAYROLL_ENDPOINTS.FINALIZE_BONUS(payrollId));
            return response.data;
        } catch (error) {
            console.error('Error finalizing bonus review:', error);

            if (error.response?.status === 409) {
                throw new Error('Cannot finalize bonus review in current state');
            } else if (error.response?.status === 400) {
                throw new Error(error.response.data.message || 'Failed to finalize bonus review');
            }

            throw error;
        }
    },

    getBonusSummaries: async (payrollId) => {
        try {
            const response = await apiClient.get(PAYROLL_ENDPOINTS.BONUS_SUMMARIES(payrollId));
            return response.data;
        } catch (error) {
            console.error('Error fetching bonus summaries for payroll:', error);
            throw error;
        }
    },

    // ========================================
    // ⭐ DEDUCTION REVIEW WORKFLOW METHODS
    // ========================================

    getDeductionStatus: async (payrollId) => {
        try {
            const response = await apiClient.get(PAYROLL_ENDPOINTS.DEDUCTION_STATUS(payrollId));
            return response.data;
        } catch (error) {
            console.error('Error fetching deduction status:', error);

            if (error.response?.status === 404) {
                throw new Error('Payroll not found');
            }

            throw error;
        }
    },

    processDeductionReview: async (payrollId) => {
        try {
            const response = await apiClient.post(PAYROLL_ENDPOINTS.PROCESS_DEDUCTION_REVIEW(payrollId));
            return response.data;
        } catch (error) {
            console.error('❌ Error processing deduction review:', error);

            if (error.response?.status === 409) {
                throw new Error(error.response.data.message || 'Deduction is finalized and locked. Cannot process.');
            } else if (error.response?.status === 400) {
                throw new Error(error.response.data.message || 'Failed to process deduction review');
            }

            throw error;
        }
    },

    finalizeDeduction: async (payrollId) => {
        try {
            const response = await apiClient.post(PAYROLL_ENDPOINTS.FINALIZE_DEDUCTION(payrollId));
            return response.data;
        } catch (error) {
            console.error('Error finalizing deduction review:', error);

            if (error.response?.status === 409) {
                throw new Error('Cannot finalize deduction review in current state');
            } else if (error.response?.status === 400) {
                throw new Error(error.response.data.message || 'Failed to finalize deduction review');
            }

            throw error;
        }
    },

    notifyHRForDeduction: async (payrollId) => {
        try {
            const response = await apiClient.post(PAYROLL_ENDPOINTS.NOTIFY_HR_DEDUCTION(payrollId));
            return response.data;
        } catch (error) {
            console.error('Error notifying HR for deduction:', error);

            if (error.response?.status === 409) {
                throw new Error('Deduction is already finalized. Cannot send notification.');
            } else if (error.response?.status === 400) {
                throw new Error(error.response.data.message || 'Failed to send notification');
            }

            throw error;
        }
    },

    getDeductionSummaries: async (payrollId) => {
        try {
            const response = await apiClient.get(PAYROLL_ENDPOINTS.DEDUCTION_SUMMARIES(payrollId));
            return response.data;
        } catch (error) {
            console.error('Error fetching deduction summaries for payroll:', error);
            throw error;
        }
    },

    moveToDeductionReview: async (payrollId) => {
        try {
            const username = localStorage.getItem('username') || 'admin';
            const response = await apiClient.post(
                `${PAYROLL_ENDPOINTS.DEDUCTION_REVIEW(payrollId)}?username=${username}`
            );
            return response.data;
        } catch (error) {
            console.error('Error moving to deduction review:', error);
            throw error;
        }
    },

    // ========================================
    // FINANCE & PAYMENT METHODS
    // ========================================

    markAsPaid: async (payrollId) => {
        try {
            const username = localStorage.getItem('username') || 'admin';
            const response = await apiClient.post(`/api/v1/payroll/${payrollId}/mark-paid?username=${username}`);
            return response.data;
        } catch (error) {
            console.error('❌ Error marking payroll as paid:', error);

            if (error.response?.status === 409) {
                throw new Error(error.response.data.message || 'Payroll must be in PENDING_FINANCE_REVIEW status');
            } else if (error.response?.status === 400) {
                throw new Error(error.response.data.message || 'Failed to mark payroll as paid');
            }

            throw error;
        }
    },

    sendToFinance: async (payrollId, paymentSource) => {
        try {
            const response = await apiClient.post(`/api/v1/payroll/${payrollId}/send-to-finance`, {
                paymentSourceType: paymentSource.type,
                paymentSourceId: paymentSource.id,
                paymentSourceName: paymentSource.name
            });
            return response.data;
        } catch (error) {
            console.error('❌ Error sending payroll to finance:', error);

            if (error.response?.status === 409) {
                throw new Error(error.response.data.message || 'Payroll must be in CONFIRMED_AND_LOCKED status');
            } else if (error.response?.status === 400) {
                throw new Error(error.response.data.message || 'Invalid payment source');
            }

            throw error;
        }
    },

    // ========================================
    // BATCH WORKFLOW METHODS
    // ========================================

    /**
     * Create batches for a payroll by grouping employees by payment type
     */
    createBatches: async (payrollId) => {
        try {
            const response = await apiClient.post(`/api/v1/payroll/${payrollId}/create-batches`);
            return response.data;
        } catch (error) {
            console.error('❌ Error creating batches:', error);

            if (error.response?.status === 400) {
                throw new Error(error.response.data.message || 'Failed to create batches');
            } else if (error.response?.status === 409) {
                throw new Error(error.response.data.message || 'Payroll must be in CONFIRMED_AND_LOCKED status');
            }

            throw error;
        }
    },

    /**
     * Get batches for a payroll
     */
    getBatches: async (payrollId) => {
        try {
            const response = await apiClient.get(`/api/v1/payroll/${payrollId}/batches`);
            return response.data;
        } catch (error) {
            console.error('Error fetching batches:', error);
            throw error;
        }
    },

    /**
     * Send batches to finance (creates payment requests)
     */
    sendBatchesToFinance: async (payrollId) => {
        try {
            const response = await apiClient.post(`/api/v1/payroll/${payrollId}/send-batches-to-finance`);
            return response.data;
        } catch (error) {
            console.error('❌ Error sending batches to finance:', error);

            if (error.response?.status === 400) {
                throw new Error(error.response.data.message || 'Failed to send batches to finance');
            } else if (error.response?.status === 409) {
                throw new Error(error.response.data.message || 'Batches must be created first');
            }

            throw error;
        }
    },

    /**
     * Get employees without payment type assigned
     */
    getEmployeesWithoutPaymentType: async (payrollId) => {
        try {
            const response = await apiClient.get(`/api/v1/payroll/${payrollId}/employees-without-payment-type`);
            return response.data;
        } catch (error) {
            console.error('Error fetching employees without payment type:', error);
            throw error;
        }
    },

    // ========================================
    // PAYMENT TYPE METHODS
    // ========================================

    /**
     * Get all payment types
     */
    getAllPaymentTypes: async () => {
        try {
            const response = await apiClient.get('/api/v1/payment-types/all');
            return response.data;
        } catch (error) {
            console.error('Error fetching payment types:', error);
            throw error;
        }
    },

    /**
     * Get active payment types only
     */
    getActivePaymentTypes: async () => {
        try {
            const response = await apiClient.get('/api/v1/payment-types');
            return response.data;
        } catch (error) {
            console.error('Error fetching active payment types:', error);
            throw error;
        }
    },

    /**
     * Create a new payment type
     */
    createPaymentType: async (paymentTypeData) => {
        try {
            const response = await apiClient.post('/api/v1/payment-types', paymentTypeData);
            return response.data;
        } catch (error) {
            console.error('Error creating payment type:', error);
            if (error.response?.status === 409) {
                throw new Error('Payment type with this code already exists');
            } else if (error.response?.status === 400) {
                throw new Error(error.response.data.message || 'Invalid payment type data');
            }
            throw error;
        }
    },

    /**
     * Update an existing payment type
     */
    updatePaymentType: async (paymentTypeId, paymentTypeData) => {
        try {
            const response = await apiClient.put(`/api/v1/payment-types/${paymentTypeId}`, paymentTypeData);
            return response.data;
        } catch (error) {
            console.error('Error updating payment type:', error);
            if (error.response?.status === 404) {
                throw new Error('Payment type not found');
            } else if (error.response?.status === 400) {
                throw new Error(error.response.data.message || 'Invalid payment type data');
            }
            throw error;
        }
    },

    /**
     * Deactivate a payment type (soft delete)
     */
    deactivatePaymentType: async (paymentTypeId) => {
        try {
            const response = await apiClient.post(`/api/v1/payment-types/${paymentTypeId}/deactivate`);
            return response.data;
        } catch (error) {
            console.error('Error deactivating payment type:', error);
            if (error.response?.status === 404) {
                throw new Error('Payment type not found');
            }
            throw error;
        }
    },

    /**
     * Activate a payment type
     */
    activatePaymentType: async (paymentTypeId) => {
        try {
            const response = await apiClient.post(`/api/v1/payment-types/${paymentTypeId}/activate`);
            return response.data;
        } catch (error) {
            console.error('Error activating payment type:', error);
            if (error.response?.status === 404) {
                throw new Error('Payment type not found');
            }
            throw error;
        }
    },

    /**
     * Update employee payment type
     */
    updateEmployeePaymentType: async (employeeId, paymentTypeId, bankDetails = {}) => {
        try {
            const response = await apiClient.put(`/api/v1/employees/${employeeId}/payment-type`, {
                paymentTypeId,
                ...bankDetails
            });
            return response.data;
        } catch (error) {
            console.error('Error updating employee payment type:', error);
            throw error;
        }
    },
};

export default payrollService;