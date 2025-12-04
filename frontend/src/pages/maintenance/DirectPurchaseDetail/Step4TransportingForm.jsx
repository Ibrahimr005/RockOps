import React, { useState, useEffect } from 'react';
import { FaTruck, FaUser, FaBuilding, FaCheckCircle } from 'react-icons/fa';
import { siteService } from '../../../services/siteService';
import directPurchaseService from '../../../services/directPurchaseService';

const Step4TransportingForm = ({ ticketId, ticketData, onSave, onComplete, isLoading }) => {
    const [formData, setFormData] = useState({
        transportFromLocation: '',
        transportToSiteId: '',
        actualTransportationCost: 0,
        responsiblePersonType: 'contact', // 'contact' or 'employee'
        transportResponsibleContactId: '',
        transportResponsibleEmployeeId: ''
    });

    const [siteList, setSiteList] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [errors, setErrors] = useState({});
    const [loadingContacts, setLoadingContacts] = useState(false);
    const [loadingEmployees, setLoadingEmployees] = useState(false);

    useEffect(() => {
        loadSites();
    }, []);

    useEffect(() => {
        // Load existing data from ticketData
        if (ticketData) {
            const defaultSiteId = ticketData.transportToSiteId ||
                                  (ticketData.equipment?.siteId) ||
                                  '';

            setFormData({
                transportFromLocation: ticketData.transportFromLocation || '',
                transportToSiteId: defaultSiteId,
                actualTransportationCost: ticketData.actualTransportationCost || 0,
                responsiblePersonType: ticketData.transportResponsibleContactId ? 'contact' : 'employee',
                transportResponsibleContactId: ticketData.transportResponsibleContactId || '',
                transportResponsibleEmployeeId: ticketData.transportResponsibleEmployeeId || ''
            });

            // Load contacts if merchant is selected
            if (ticketData.merchantId) {
                loadContacts(ticketData.merchantId);
            }

            // Load employees if site is selected
            if (defaultSiteId) {
                loadEmployees(defaultSiteId);
            }
        }
    }, [ticketData]);

    useEffect(() => {
        // Load employees when transport to site changes
        if (formData.transportToSiteId) {
            loadEmployees(formData.transportToSiteId);
        }
    }, [formData.transportToSiteId]);

    const loadSites = async () => {
        try {
            const response = await siteService.getAllSites();
            setSiteList(response.data || []);
        } catch (error) {
            console.error('Error loading sites:', error);
        }
    };

    const loadContacts = async (merchantId) => {
        try {
            setLoadingContacts(true);
            const response = await directPurchaseService.getMerchantContacts(merchantId);
            setContacts(response.data || []);
        } catch (error) {
            console.error('Error loading contacts:', error);
            setContacts([]);
        } finally {
            setLoadingContacts(false);
        }
    };

    const loadEmployees = async (siteId) => {
        try {
            setLoadingEmployees(true);
            const response = await directPurchaseService.getSiteEmployees(siteId);
            setEmployees(response.data || []);
        } catch (error) {
            console.error('Error loading employees:', error);
            setEmployees([]);
        } finally {
            setLoadingEmployees(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'actualTransportationCost' ? parseFloat(value) || 0 : value
        }));

        // Clear error
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const handleResponsiblePersonTypeChange = (type) => {
        setFormData(prev => ({
            ...prev,
            responsiblePersonType: type,
            transportResponsibleContactId: '',
            transportResponsibleEmployeeId: ''
        }));

        // Load contacts if switching to contact and merchant exists
        if (type === 'contact' && ticketData?.merchantId) {
            loadContacts(ticketData.merchantId);
        }
    };

    const handleResponsiblePersonChange = (e) => {
        const { value } = e.target;
        if (formData.responsiblePersonType === 'contact') {
            setFormData(prev => ({
                ...prev,
                transportResponsibleContactId: value,
                transportResponsibleEmployeeId: ''
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                transportResponsibleEmployeeId: value,
                transportResponsibleContactId: ''
            }));
        }

        // Clear error
        if (errors.responsiblePerson) {
            setErrors(prev => ({
                ...prev,
                responsiblePerson: ''
            }));
        }
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.transportFromLocation || !formData.transportFromLocation.trim()) {
            newErrors.transportFromLocation = 'Transport from location is required';
        }
        if (!formData.transportToSiteId) {
            newErrors.transportToSiteId = 'Transport to site is required';
        }
        if (formData.actualTransportationCost < 0) {
            newErrors.actualTransportationCost = 'Transportation cost cannot be negative';
        }
        if (!formData.transportResponsibleContactId && !formData.transportResponsibleEmployeeId) {
            newErrors.responsiblePerson = 'Transport responsible person is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = () => {
        onSave({
            transportFromLocation: formData.transportFromLocation,
            transportToSiteId: formData.transportToSiteId,
            actualTransportationCost: formData.actualTransportationCost,
            transportResponsibleContactId: formData.transportResponsibleContactId || null,
            transportResponsibleEmployeeId: formData.transportResponsibleEmployeeId || null
        });
    };

    const handleComplete = () => {
        if (validate()) {
            onComplete({
                transportFromLocation: formData.transportFromLocation,
                transportToSiteId: formData.transportToSiteId,
                actualTransportationCost: formData.actualTransportationCost,
                transportResponsibleContactId: formData.transportResponsibleContactId || null,
                transportResponsibleEmployeeId: formData.transportResponsibleEmployeeId || null
            });
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    };

    return (
        <div className="step-form step4-form">
            <div className="form-grid">
                {/* Transport From Location */}
                <div className="form-group">
                    <label className="required">Transport From Location</label>
                    <input
                        type="text"
                        name="transportFromLocation"
                        value={formData.transportFromLocation}
                        onChange={handleInputChange}
                        placeholder="e.g., Merchant warehouse, supplier location"
                        className={errors.transportFromLocation ? 'error' : ''}
                    />
                    {errors.transportFromLocation && <span className="error-message">{errors.transportFromLocation}</span>}
                </div>

                {/* Transport To Site */}
                <div className="form-group">
                    <label className="required">Transport To Site</label>
                    <select
                        name="transportToSiteId"
                        value={formData.transportToSiteId}
                        onChange={handleInputChange}
                        className={errors.transportToSiteId ? 'error' : ''}
                    >
                        <option value="">Select destination site...</option>
                        {siteList.map(site => (
                            <option key={site.id} value={site.id}>
                                {site.name}
                            </option>
                        ))}
                    </select>
                    {errors.transportToSiteId && <span className="error-message">{errors.transportToSiteId}</span>}
                    <small className="field-hint">Defaults to equipment's site</small>
                </div>

                {/* Transportation Cost */}
                <div className="form-group">
                    <label className="required">Transportation Cost</label>
                    <input
                        type="number"
                        name="actualTransportationCost"
                        value={formData.actualTransportationCost}
                        onChange={handleInputChange}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className={errors.actualTransportationCost ? 'error' : ''}
                    />
                    {errors.actualTransportationCost && <span className="error-message">{errors.actualTransportationCost}</span>}
                </div>
            </div>

            {/* Transport Responsible Person - Smart Selector */}
            <div className="responsible-person-section">
                <h4>Transport Responsible Person</h4>
                {errors.responsiblePerson && <span className="error-message">{errors.responsiblePerson}</span>}

                {/* Type Toggle */}
                <div className="person-type-toggle">
                    <button
                        type="button"
                        className={`toggle-btn ${formData.responsiblePersonType === 'contact' ? 'active' : ''}`}
                        onClick={() => handleResponsiblePersonTypeChange('contact')}
                    >
                        <FaUser /> Merchant Contact
                    </button>
                    <button
                        type="button"
                        className={`toggle-btn ${formData.responsiblePersonType === 'employee' ? 'active' : ''}`}
                        onClick={() => handleResponsiblePersonTypeChange('employee')}
                    >
                        <FaBuilding /> Site Employee
                    </button>
                </div>

                {/* Person Selector */}
                <div className="person-selector">
                    {formData.responsiblePersonType === 'contact' ? (
                        <div className="form-group">
                            <label>Select Contact from Merchant</label>
                            {loadingContacts ? (
                                <p className="loading-text">Loading contacts...</p>
                            ) : contacts.length > 0 ? (
                                <select
                                    value={formData.transportResponsibleContactId}
                                    onChange={handleResponsiblePersonChange}
                                    className={errors.responsiblePerson ? 'error' : ''}
                                >
                                    <option value="">Select contact...</option>
                                    {contacts.map(contact => (
                                        <option key={contact.id} value={contact.id}>
                                            {contact.firstName} {contact.lastName} - {contact.phoneNumber}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <p className="no-data-text">No contacts available for this merchant</p>
                            )}
                        </div>
                    ) : (
                        <div className="form-group">
                            <label>Select Employee from Destination Site</label>
                            {loadingEmployees ? (
                                <p className="loading-text">Loading employees...</p>
                            ) : employees.length > 0 ? (
                                <select
                                    value={formData.transportResponsibleEmployeeId}
                                    onChange={handleResponsiblePersonChange}
                                    className={errors.responsiblePerson ? 'error' : ''}
                                >
                                    <option value="">Select employee...</option>
                                    {employees.map(employee => (
                                        <option key={employee.id} value={employee.id}>
                                            {employee.fullName} - {employee.jobPosition || 'N/A'}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <p className="no-data-text">
                                    {formData.transportToSiteId
                                        ? 'No employees available at this site'
                                        : 'Please select destination site first'}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Final Summary */}
            <div className="info-box success">
                <FaCheckCircle className="info-icon" />
                <div className="info-content">
                    <strong>Final Step!</strong> After completing this step, the ticket will be marked as COMPLETED.
                    Review all information carefully before proceeding.
                </div>
            </div>

            {/* Actions */}
            <div className="form-actions">
                <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleSave}
                    disabled={isLoading}
                >
                    Save Progress
                </button>
                <button
                    type="button"
                    className="btn-primary btn-success"
                    onClick={handleComplete}
                    disabled={isLoading}
                >
                    {isLoading ? 'Completing...' : 'Complete Ticket'}
                </button>
            </div>
        </div>
    );
};

export default Step4TransportingForm;
