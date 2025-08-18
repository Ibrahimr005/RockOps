
// ==================== PAYSLIP EDIT COMPONENT ====================
// frontend/src/pages/payroll/PayslipManagement/PayslipEdit.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaSave, FaTimes, FaArrowLeft, FaEdit, FaPlus, FaTrash } from 'react-icons/fa';
import { payslipService } from '../../../services/payroll/payslipService';
import { deductionService } from '../../../services/payroll/deductionService';
import { useSnackbar } from '../../../contexts/SnackbarContext';
import './PayslipEdit.scss';

const PayslipEdit = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showSuccess, showError } = useSnackbar();

    const [payslip, setPayslip] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deductionTypes, setDeductionTypes] = useState([]);
    const [editedData, setEditedData] = useState({
        earnings: [],
        deductions: [],
        customAdjustments: []
    });

    useEffect(() => {
        loadPayslip();
        loadDeductionTypes();
    }, [id]);

    const loadPayslip = async () => {
        try {
            setLoading(true);
            const response = await payslipService.getPayslipById(id);
            setPayslip(response.data);
            setEditedData({
                earnings: response.data.earnings || [],
                deductions: response.data.deductions || [],
                customAdjustments: response.data.customAdjustments || []
            });
        } catch (error) {
            console.error('Error loading payslip:', error);
            showError('Failed to load payslip');
            navigate('/payroll/payslips');
        } finally {
            setLoading(false);
        }
    };

    const loadDeductionTypes = async () => {
        try {
            const response = await deductionService.getActiveDeductionTypes();
            setDeductionTypes(response.data);
        } catch (error) {
            console.error('Error loading deduction types:', error);
        }
    };

    const handleEarningChange = (index, field, value) => {
        setEditedData(prev => ({
            ...prev,
            earnings: prev.earnings.map((earning, i) =>
                i === index ? { ...earning, [field]: value } : earning
            )
        }));
    };

    const handleDeductionChange = (index, field, value) => {
        setEditedData(prev => ({
            ...prev,
            deductions: prev.deductions.map((deduction, i) =>
                i === index ? { ...deduction, [field]: value } : deduction
            )
        }));
    };

    const addCustomAdjustment = () => {
        setEditedData(prev => ({
            ...prev,
            customAdjustments: [
                ...prev.customAdjustments,
                {
                    description: '',
                    amount: 0,
                    type: 'EARNING' // or 'DEDUCTION'
                }
            ]
        }));
    };

    const removeCustomAdjustment = (index) => {
        setEditedData(prev => ({
            ...prev,
            customAdjustments: prev.customAdjustments.filter((_, i) => i !== index)
        }));
    };

    const handleCustomAdjustmentChange = (index, field, value) => {
        setEditedData(prev => ({
            ...prev,
            customAdjustments: prev.customAdjustments.map((adjustment, i) =>
                i === index ? { ...adjustment, [field]: value } : adjustment
            )
        }));
    };

    const calculateTotals = () => {
        const totalEarnings = editedData.earnings.reduce((sum, earning) => sum + (parseFloat(earning.amount) || 0), 0);
        const totalDeductions = editedData.deductions.reduce((sum, deduction) => sum + (parseFloat(deduction.amount) || 0), 0);
        const customEarnings = editedData.customAdjustments
            .filter(adj => adj.type === 'EARNING')
            .reduce((sum, adj) => sum + (parseFloat(adj.amount) || 0), 0);
        const customDeductions = editedData.customAdjustments
            .filter(adj => adj.type === 'DEDUCTION')
            .reduce((sum, adj) => sum + (parseFloat(adj.amount) || 0), 0);

        const grossPay = totalEarnings + customEarnings;
        const totalDeductionsAmount = totalDeductions + customDeductions;
        const netPay = grossPay - totalDeductionsAmount;

        return { grossPay, totalDeductions: totalDeductionsAmount, netPay };
    };

    const handleSave = async () => {
        try {
            setSaving(true);

            const updatedPayslip = {
                ...payslip,
                ...editedData,
                ...calculateTotals()
            };

            await payslipService.updatePayslip(id, updatedPayslip);
            showSuccess('Payslip updated successfully');
            navigate(`/payroll/payslips/${id}`);
        } catch (error) {
            console.error('Error saving payslip:', error);
            showError('Failed to save payslip');
        } finally {
            setSaving(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    };

    if (loading) {
        return <div className="loading-container">Loading payslip...</div>;
    }

    if (!payslip) {
        return <div className="error-container">Payslip not found</div>;
    }

    const totals = calculateTotals();

    return (
        <div className="payslip-edit">
            {/* Header */}
            <div className="page-header">
                <div className="header-content">
                    <div className="header-left">
                        <button
                            className="btn btn-outline-secondary back-button"
                            onClick={() => navigate(`/payroll/payslips/${id}`)}
                        >
                            <FaArrowLeft /> Back to Details
                        </button>
                        <div className="header-info">
                            <h1 className="page-title">
                                <FaEdit className="page-icon" />
                                Edit Payslip - {payslip.employeeName}
                            </h1>
                            <p className="page-description">
                                Pay Period: {new Date(payslip.payPeriodStart).toLocaleDateString()} - {new Date(payslip.payPeriodEnd).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                    <div className="header-actions">
                        <button
                            className="btn btn-secondary"
                            onClick={() => navigate(`/payroll/payslips/${id}`)}
                            disabled={saving}
                        >
                            <FaTimes /> Cancel
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            <FaSave /> {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Edit Form */}
            <div className="edit-form">
                {/* Earnings Section */}
                <div className="edit-section">
                    <h3>Earnings</h3>
                    <div className="earnings-list">
                        {editedData.earnings.map((earning, index) => (
                            <div key={index} className="earning-item">
                                <div className="earning-info">
                                    <label>{earning.description}</label>
                                    <span className="earning-type">{earning.type}</span>
                                </div>
                                <div className="earning-controls">
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="form-control amount-input"
                                        value={earning.amount}
                                        onChange={(e) => handleEarningChange(index, 'amount', e.target.value)}
                                    />
                                    <label className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={earning.isTaxable}
                                            onChange={(e) => handleEarningChange(index, 'isTaxable', e.target.checked)}
                                        />
                                        Taxable
                                    </label>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Deductions Section */}
                <div className="edit-section">
                    <h3>Deductions</h3>
                    <div className="deductions-list">
                        {editedData.deductions.map((deduction, index) => (
                            <div key={index} className="deduction-item">
                                <div className="deduction-info">
                                    <label>{deduction.description}</label>
                                    <span className="deduction-type">{deduction.type}</span>
                                </div>
                                <div className="deduction-controls">
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="form-control amount-input"
                                        value={deduction.amount}
                                        onChange={(e) => handleDeductionChange(index, 'amount', e.target.value)}
                                    />
                                    <label className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={deduction.isPreTax}
                                            onChange={(e) => handleDeductionChange(index, 'isPreTax', e.target.checked)}
                                        />
                                        Pre-Tax
                                    </label>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Custom Adjustments Section */}
                <div className="edit-section">
                    <div className="section-header">
                        <h3>Custom Adjustments</h3>
                        <button
                            className="btn btn-outline-primary btn-sm"
                            onClick={addCustomAdjustment}
                        >
                            <FaPlus /> Add Adjustment
                        </button>
                    </div>
                    <div className="adjustments-list">
                        {editedData.customAdjustments.map((adjustment, index) => (
                            <div key={index} className="adjustment-item">
                                <div className="adjustment-controls">
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Description"
                                        value={adjustment.description}
                                        onChange={(e) => handleCustomAdjustmentChange(index, 'description', e.target.value)}
                                    />
                                    <select
                                        className="form-control"
                                        value={adjustment.type}
                                        onChange={(e) => handleCustomAdjustmentChange(index, 'type', e.target.value)}
                                    >
                                        <option value="EARNING">Earning</option>
                                        <option value="DEDUCTION">Deduction</option>
                                    </select>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="form-control amount-input"
                                        placeholder="Amount"
                                        value={adjustment.amount}
                                        onChange={(e) => handleCustomAdjustmentChange(index, 'amount', e.target.value)}
                                    />
                                    <button
                                        className="btn btn-outline-danger btn-sm"
                                        onClick={() => removeCustomAdjustment(index)}
                                    >
                                        <FaTrash />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Totals Summary */}
                <div className="edit-section totals-section">
                    <h3>Summary</h3>
                    <div className="totals-grid">
                        <div className="total-item">
                            <label>Gross Pay:</label>
                            <span className="total-amount total-positive">
                                {formatCurrency(totals.grossPay)}
                            </span>
                        </div>
                        <div className="total-item">
                            <label>Total Deductions:</label>
                            <span className="total-amount total-negative">
                                {formatCurrency(totals.totalDeductions)}
                            </span>
                        </div>
                        <div className="total-item total-final">
                            <label>Net Pay:</label>
                            <span className="total-amount total-net">
                                {formatCurrency(totals.netPay)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PayslipEdit;