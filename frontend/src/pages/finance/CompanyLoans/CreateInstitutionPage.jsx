import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiHome, FiSave, FiX } from 'react-icons/fi';
import { financeService } from '../../../services/financeService';
import IntroCard from '../../../components/common/IntroCard/IntroCard';
import Snackbar from '../../../components/common/Snackbar/Snackbar';
import './CreateInstitutionPage.scss';

const CreateInstitutionPage = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEdit = Boolean(id);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        institutionType: '',
        registrationNumber: '',
        address: '',
        city: '',
        country: '',
        phoneNumber: '',
        email: '',
        website: '',
        contactPersonName: '',
        contactPersonPhone: '',
        contactPersonEmail: '',
        paymentBankName: '',
        paymentAccountNumber: '',
        paymentIban: '',
        paymentSwiftCode: '',
        notes: '',
        isActive: true
    });

    // UI state
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(isEdit);
    const [errors, setErrors] = useState({});
    const [snackbar, setSnackbar] = useState({ show: false, message: '', type: 'success' });

    // Institution types
    const institutionTypes = [
        { value: 'BANK', label: 'Bank' },
        { value: 'CREDIT_UNION', label: 'Credit Union' },
        { value: 'PRIVATE_LENDER', label: 'Private Lender' },
        { value: 'GOVERNMENT', label: 'Government' },
        { value: 'MICROFINANCE', label: 'Microfinance' },
        { value: 'OTHER', label: 'Other' }
    ];

    // Fetch existing data if editing
    useEffect(() => {
        if (isEdit) {
            fetchInstitution();
        }
    }, [id]);

    const fetchInstitution = async () => {
        setIsFetching(true);
        try {
            const response = await financeService.companyLoans.institutions.getById(id);
            const data = response.data || response;
            setFormData({
                name: data.name || '',
                institutionType: data.institutionType || '',
                registrationNumber: data.registrationNumber || '',
                address: data.address || '',
                city: data.city || '',
                country: data.country || '',
                phoneNumber: data.phoneNumber || '',
                email: data.email || '',
                website: data.website || '',
                contactPersonName: data.contactPersonName || '',
                contactPersonPhone: data.contactPersonPhone || '',
                contactPersonEmail: data.contactPersonEmail || '',
                paymentBankName: data.paymentBankName || '',
                paymentAccountNumber: data.paymentAccountNumber || '',
                paymentIban: data.paymentIban || '',
                paymentSwiftCode: data.paymentSwiftCode || '',
                notes: data.notes || '',
                isActive: data.isActive ?? true
            });
        } catch (error) {
            console.error('Error fetching institution:', error);
            showSnackbar('Failed to load institution data', 'error');
        } finally {
            setIsFetching(false);
        }
    };

    const showSnackbar = (message, type = 'success') => {
        setSnackbar({ show: true, message, type });
    };

    // Handle input change
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));

        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    // Validate form
    const validateForm = () => {
        const newErrors = {};

        if (!formData.name?.trim()) newErrors.name = 'Name is required';
        if (!formData.institutionType) newErrors.institutionType = 'Institution type is required';

        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Invalid email format';
        }
        if (formData.contactPersonEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactPersonEmail)) {
            newErrors.contactPersonEmail = 'Invalid email format';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle submit
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            showSnackbar('Please fix the errors before submitting', 'error');
            return;
        }

        setIsLoading(true);
        try {
            if (isEdit) {
                await financeService.companyLoans.institutions.update(id, formData);
                showSnackbar('Institution updated successfully', 'success');
            } else {
                await financeService.companyLoans.institutions.create(formData);
                showSnackbar('Institution created successfully', 'success');
            }

            setTimeout(() => {
                navigate('/finance/company-loans/institutions');
            }, 1500);
        } catch (error) {
            console.error('Error saving institution:', error);
            showSnackbar(error.response?.data?.message || 'Failed to save institution', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // Breadcrumbs
    const breadcrumbs = [
        { label: 'Company Loans', onClick: () => navigate('/finance/company-loans') },
        { label: 'Institutions', onClick: () => navigate('/finance/company-loans/institutions') },
        { label: isEdit ? 'Edit Institution' : 'New Institution' }
    ];

    if (isFetching) {
        return (
            <div className="create-institution-page">
                <div className="loading-state">Loading...</div>
            </div>
        );
    }

    return (
        <div className="create-institution-page">
            <IntroCard
                title={isEdit ? 'Edit Institution' : 'Add Financial Institution'}
                label="FINANCE CENTER"
                icon={<FiHome />}
                breadcrumbs={breadcrumbs}
            />

            <form onSubmit={handleSubmit} className="institution-form">
                {/* Basic Information */}
                <div className="form-section">
                    <h3 className="form-section__title">Basic Information</h3>
                    <div className="form-grid">
                        <div className={`form-group ${errors.name ? 'has-error' : ''}`}>
                            <label>Institution Name *</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                placeholder="Enter institution name"
                            />
                            {errors.name && <span className="error-text">{errors.name}</span>}
                        </div>

                        <div className={`form-group ${errors.institutionType ? 'has-error' : ''}`}>
                            <label>Institution Type *</label>
                            <select
                                name="institutionType"
                                value={formData.institutionType}
                                onChange={handleInputChange}
                            >
                                <option value="">Select Type</option>
                                {institutionTypes.map(type => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </select>
                            {errors.institutionType && <span className="error-text">{errors.institutionType}</span>}
                        </div>

                        <div className="form-group">
                            <label>Registration Number</label>
                            <input
                                type="text"
                                name="registrationNumber"
                                value={formData.registrationNumber}
                                onChange={handleInputChange}
                                placeholder="Business registration number"
                            />
                        </div>

                        <div className="form-group">
                            <label>Website</label>
                            <input
                                type="url"
                                name="website"
                                value={formData.website}
                                onChange={handleInputChange}
                                placeholder="https://..."
                            />
                        </div>
                    </div>
                </div>

                {/* Address */}
                <div className="form-section">
                    <h3 className="form-section__title">Address</h3>
                    <div className="form-grid">
                        <div className="form-group form-group--full">
                            <label>Address</label>
                            <input
                                type="text"
                                name="address"
                                value={formData.address}
                                onChange={handleInputChange}
                                placeholder="Street address"
                            />
                        </div>

                        <div className="form-group">
                            <label>City</label>
                            <input
                                type="text"
                                name="city"
                                value={formData.city}
                                onChange={handleInputChange}
                                placeholder="City"
                            />
                        </div>

                        <div className="form-group">
                            <label>Country</label>
                            <input
                                type="text"
                                name="country"
                                value={formData.country}
                                onChange={handleInputChange}
                                placeholder="Country"
                            />
                        </div>

                        <div className="form-group">
                            <label>Phone Number</label>
                            <input
                                type="tel"
                                name="phoneNumber"
                                value={formData.phoneNumber}
                                onChange={handleInputChange}
                                placeholder="+20..."
                            />
                        </div>

                        <div className={`form-group ${errors.email ? 'has-error' : ''}`}>
                            <label>Email</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                placeholder="email@institution.com"
                            />
                            {errors.email && <span className="error-text">{errors.email}</span>}
                        </div>
                    </div>
                </div>

                {/* Contact Person */}
                <div className="form-section">
                    <h3 className="form-section__title">Contact Person</h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Contact Name</label>
                            <input
                                type="text"
                                name="contactPersonName"
                                value={formData.contactPersonName}
                                onChange={handleInputChange}
                                placeholder="Full name"
                            />
                        </div>

                        <div className="form-group">
                            <label>Contact Phone</label>
                            <input
                                type="tel"
                                name="contactPersonPhone"
                                value={formData.contactPersonPhone}
                                onChange={handleInputChange}
                                placeholder="+20..."
                            />
                        </div>

                        <div className={`form-group ${errors.contactPersonEmail ? 'has-error' : ''}`}>
                            <label>Contact Email</label>
                            <input
                                type="email"
                                name="contactPersonEmail"
                                value={formData.contactPersonEmail}
                                onChange={handleInputChange}
                                placeholder="contact@institution.com"
                            />
                            {errors.contactPersonEmail && <span className="error-text">{errors.contactPersonEmail}</span>}
                        </div>
                    </div>
                </div>

                {/* Payment Details */}
                <div className="form-section">
                    <h3 className="form-section__title">Payment Details</h3>
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Bank Name</label>
                            <input
                                type="text"
                                name="paymentBankName"
                                value={formData.paymentBankName}
                                onChange={handleInputChange}
                                placeholder="Bank name for payments"
                            />
                        </div>

                        <div className="form-group">
                            <label>Account Number</label>
                            <input
                                type="text"
                                name="paymentAccountNumber"
                                value={formData.paymentAccountNumber}
                                onChange={handleInputChange}
                                placeholder="Account number"
                            />
                        </div>

                        <div className="form-group">
                            <label>IBAN</label>
                            <input
                                type="text"
                                name="paymentIban"
                                value={formData.paymentIban}
                                onChange={handleInputChange}
                                placeholder="IBAN"
                            />
                        </div>

                        <div className="form-group">
                            <label>SWIFT Code</label>
                            <input
                                type="text"
                                name="paymentSwiftCode"
                                value={formData.paymentSwiftCode}
                                onChange={handleInputChange}
                                placeholder="SWIFT/BIC code"
                            />
                        </div>
                    </div>
                </div>

                {/* Notes & Status */}
                <div className="form-section">
                    <h3 className="form-section__title">Additional</h3>
                    <div className="form-grid">
                        <div className="form-group form-group--full">
                            <label>Notes</label>
                            <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={handleInputChange}
                                placeholder="Additional notes..."
                                rows="3"
                            />
                        </div>

                        <div className="form-group form-group--checkbox">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    name="isActive"
                                    checked={formData.isActive}
                                    onChange={handleInputChange}
                                />
                                <span>Active Institution</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Form Actions */}
                <div className="form-actions">
                    <button
                        type="button"
                        className="btn btn--secondary"
                        onClick={() => navigate('/finance/company-loans/institutions')}
                        disabled={isLoading}
                    >
                        <FiX /> Cancel
                    </button>
                    <button
                        type="submit"
                        className="btn btn--primary"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <span className="spinner"></span> Saving...
                            </>
                        ) : (
                            <>
                                <FiSave /> {isEdit ? 'Update' : 'Create'} Institution
                            </>
                        )}
                    </button>
                </div>
            </form>

            {/* Snackbar */}
            <Snackbar
                show={snackbar.show}
                message={snackbar.message}
                type={snackbar.type}
                onClose={() => setSnackbar({ ...snackbar, show: false })}
            />
        </div>
    );
};

export default CreateInstitutionPage;