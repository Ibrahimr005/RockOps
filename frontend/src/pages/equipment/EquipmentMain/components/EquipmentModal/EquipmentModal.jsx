import React, { useState, useEffect, useRef } from "react";
import { FaTimes, FaUpload, FaExclamationCircle, FaInfoCircle, FaCheck, FaArrowRight, FaTrash } from "react-icons/fa";
import { equipmentService } from "../../../../../services/equipmentService.js";
import { equipmentTypeService } from "../../../../../services/equipmentTypeService.js";
import { equipmentBrandService } from "../../../../../services/equipmentBrandService.js";
import { siteService } from "../../../../../services/siteService.js";
import { merchantService } from "../../../../../services/merchantService.js";
import { useSnackbar } from "../../../../../contexts/SnackbarContext.jsx";
import MonetaryFieldDocuments from '../../../../../components/equipment/MonetaryFieldDocuments';
import "./EquipmentModal.scss";

const EquipmentModal = ({ isOpen, onClose, onSave, equipmentToEdit = null }) => {
    const { showSuccess, showError, showInfo, showWarning, hideSnackbar } = useSnackbar();
    const contentRef = useRef(null);

    // Helper functions for formatting
    const formatDateForDisplay = (dateString) => {
        if (!dateString) return '';

        // Ensure date is in correct format for display
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;

        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();

        return `${day}/${month}/${year}`; // Format for display: dd/mm/yyyy
    };

    const formatDateForInput = (dateString) => {
        if (!dateString) return '';

        // Handle different date formats
        let date;

        // Check if the format is already dd/mm/yyyy
        if (dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
            const [day, month, year] = dateString.split('/');
            date = new Date(year, month - 1, day);
        } else {
            date = new Date(dateString);
        }

        if (isNaN(date.getTime())) return dateString;

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`; // Format for HTML date input: yyyy-mm-dd
    };

    const formatNumberWithCommas = (number) => {
        if (number === undefined || number === null || number === '') return '';
        return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    };

    const parseNumberInput = (value) => {
        // Remove commas and convert to number
        return value ? value.toString().replace(/,/g, '') : '';
    };

    const initialFormState = {
        name: "",
        model: "",
        brandId: "",
        serialNumber: "",
        modelNumber: "",
        typeId: "",
        siteId: "",
        mainDriverId: "",
        subDriverId: "",
        status: "AVAILABLE",
        manufactureYear: new Date().getFullYear(),
        purchasedDate: "",
        deliveredDate: "",
        egpPrice: "",
        dollarPrice: "",
        purchasedFrom: "",
        examinedBy: "",
        equipmentComplaints: "",
        countryOfOrigin: "",
        shipping: "",
        customs: "",
        taxes: "",
        relatedDocuments: "",
        workedHours: 0
    };


    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [equipmentTypes, setEquipmentTypes] = useState([]);
    const [equipmentBrands, setEquipmentBrands] = useState([]);
    const [sites, setSites] = useState([]);
    const [merchants, setMerchants] = useState([]);
    const [previewImage, setPreviewImage] = useState(null);
    const [formData, setFormData] = useState(initialFormState);
    const [displayValues, setDisplayValues] = useState({
        egpPrice: "",
        dollarPrice: "",
        workedHours: "0",
        purchasedDate: "",
        deliveredDate: ""
    });
    const [imageFile, setImageFile] = useState(null);
    const [tabIndex, setTabIndex] = useState(0);
    const [formValid, setFormValid] = useState(false);
    const [tabValidation, setTabValidation] = useState({
        0: false, // Basic Information tab
        1: false, // Purchase Details tab
        2: false  // Additional Info tab
    });
    const [showValidationHint, setShowValidationHint] = useState(true);
    const [formTouched, setFormTouched] = useState(false);
    const confirmClearRef = useRef(null);

    // Define tabs with required fields based on database schema
    const tabs = [
        {
            id: 0,
            name: "Basic Information",
            requiredFields: ['name', 'serialNumber', 'typeId', 'model', 'brandId', 'modelNumber', 'manufactureYear']
        },
        {
            id: 1,
            name: "Purchase Details",
            requiredFields: ['purchasedDate', 'deliveredDate', 'egpPrice', 'countryOfOrigin', 'shipping', 'customs', 'taxes', 'purchasedFrom']
        },
        {
            id: 2,
            name: "Additional Info",
            requiredFields: []
        }
    ];

    const [eligibleDrivers, setEligibleDrivers] = useState([]);
    const [driverError, setDriverError] = useState(null);
    const [typeChangeWarning, setTypeChangeWarning] = useState(false);

    // Scroll to top whenever tab changes
    useEffect(() => {
        if (contentRef.current) {
            contentRef.current.scrollTop = 0;
        }
    }, [tabIndex]);

    // Clear form data with snackbar confirmation
    const handleClearForm = () => {
        if (formTouched) {
            showWarning("Are you sure you want to clear all form data?", 0, true);

            // Create action buttons for the snackbar
            setTimeout(() => {
                const snackbar = document.querySelector('.global-notification');
                if (snackbar) {
                    const actionContainer = document.createElement('div');
                    actionContainer.className = 'snackbar-actions';

                    // Yes button
                    const yesButton = document.createElement('button');
                    yesButton.innerText = 'YES';
                    yesButton.className = 'snackbar-action-button confirm';
                    yesButton.onclick = () => {
                        performClearForm();
                        hideSnackbar();
                    };

                    // No button
                    const noButton = document.createElement('button');
                    noButton.innerText = 'NO';
                    noButton.className = 'snackbar-action-button cancel';
                    noButton.onclick = () => {
                        hideSnackbar();
                    };

                    actionContainer.appendChild(yesButton);
                    actionContainer.appendChild(noButton);
                    snackbar.appendChild(actionContainer);

                    // Store reference for cleanup
                    confirmClearRef.current = actionContainer;
                }
            }, 100);
        } else {
            performClearForm();
        }
    };

    // Hide snackbar action buttons
    const hideSnackbarActions = () => {
        if (confirmClearRef.current) {
            confirmClearRef.current.remove();
            confirmClearRef.current = null;
        }
        hideSnackbar();
    };

    // Actually clear the form
    const performClearForm = () => {
        setFormData(initialFormState);
        setDisplayValues({
            egpPrice: "",
            dollarPrice: "",
            workedHours: "0"
        });
        setImageFile(null);
        setPreviewImage(null);
        setTypeChangeWarning(false);
        setTabIndex(0); // Return to first tab
        setFormTouched(false);
        showInfo("Form has been cleared");
    };

    // Fetch necessary data when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchFormData();

            // If equipment is provided for editing
            if (equipmentToEdit) {
                populateFormForEditing();
            } else {
                // Reset form for new equipment
                setFormData(initialFormState);
                setDisplayValues({
                    egpPrice: "",
                    dollarPrice: "",
                    workedHours: "0"
                });
                setImageFile(null);
                setPreviewImage(null);
                setFormTouched(false);
                setTabIndex(0); // Always start at the first tab
            }

            // Reset validation states
            validateAllTabs();

            // Reset scroll position
            if (contentRef.current) {
                contentRef.current.scrollTop = 0;
            }
        }

        // Cleanup function
        return () => {
            if (confirmClearRef.current) {
                confirmClearRef.current.remove();
                confirmClearRef.current = null;
            }
        };
    }, [isOpen, equipmentToEdit]);

    // Validate the form whenever form data changes
    useEffect(() => {
        validateAllTabs();

        // Mark form as touched when changed
        if (isOpen && JSON.stringify(formData) !== JSON.stringify(initialFormState)) {
            setFormTouched(true);
        }
    }, [formData, imageFile]);

    // Fetch eligible drivers whenever the equipment type changes
    useEffect(() => {
        if (formData.typeId) {
            fetchEligibleDrivers(formData.typeId);
        } else {
            setEligibleDrivers([]);
        }
    }, [formData.typeId]);

    const fetchFormData = async () => {
        setLoading(true);
        try {
            // Fetch equipment types
            const typesResponse = await equipmentTypeService.getAllEquipmentTypes();
            setEquipmentTypes(typesResponse.data);

            // Fetch equipment brands
            const brandsResponse = await equipmentBrandService.getAllEquipmentBrands();
            setEquipmentBrands(brandsResponse.data);

            // Fetch sites
            const sitesResponse = await siteService.getAllSites();
            setSites(sitesResponse.data);

            // Fetch merchants
            try {
                const merchantsResponse = await merchantService.getAllMerchants();
                setMerchants(merchantsResponse.data);
            } catch (error) {
                console.error("Error fetching merchants:", error);
                setMerchants([]);
                showWarning("Could not fetch merchant data. Some features may be limited.");
            }

            setLoading(false);
        } catch (error) {
            console.error("Error fetching form data:", error);
            setError("Failed to load form data. Please try again.");
            showError("Failed to load form data. Please try again.");
            setLoading(false);
        }
    };

    // Fetch eligible drivers for the selected equipment type
    const fetchEligibleDrivers = async (typeId) => {
        if (!typeId) return;

        try {
            const response = await equipmentService.getEligibleDriversForEquipmentType(typeId);
            setEligibleDrivers(response.data);

            // Check if current drivers are still eligible after type change
            if (formData.mainDriverId || formData.subDriverId) {
                const mainDriverStillEligible = response.data.some(driver => driver.id === formData.mainDriverId);
                const subDriverStillEligible = response.data.some(driver => driver.id === formData.subDriverId);

                // Clear drivers if they're no longer eligible and show a warning
                if (formData.mainDriverId && !mainDriverStillEligible) {
                    setFormData(prev => ({ ...prev, mainDriverId: "" }));
                    setTypeChangeWarning(true);
                    showWarning("The selected main driver is not qualified for this equipment type and has been cleared.");
                }

                if (formData.subDriverId && !subDriverStillEligible) {
                    setFormData(prev => ({ ...prev, subDriverId: "" }));
                    setTypeChangeWarning(true);
                    showWarning("The selected sub driver is not qualified for this equipment type and has been cleared.");
                }
            }

            setDriverError(null);
        } catch (error) {
            console.error("Error fetching eligible drivers:", error);
            setDriverError("Could not fetch eligible drivers for this equipment type");
            showError("Could not fetch eligible drivers for this equipment type");
            setEligibleDrivers([]);
        }
    };

    const populateFormForEditing = () => {
        if (!equipmentToEdit) return;

        // Set form data from equipment being edited
        console.log("equipment to edit");
        console.log(equipmentToEdit);

        // Prepare the form data
        const newFormData = {
            name: equipmentToEdit.name || "",
            model: equipmentToEdit.model || "",
            brandId: equipmentToEdit.brandId || "",
            serialNumber: equipmentToEdit.serialNumber || "",
            modelNumber: equipmentToEdit.modelNumber || "",
            typeId: equipmentToEdit.typeId || "",
            siteId: equipmentToEdit.siteId || "",
            mainDriverId: equipmentToEdit.mainDriverId || "",
            subDriverId: equipmentToEdit.subDriverId || "",
            status: equipmentToEdit.status || "AVAILABLE",
            manufactureYear: equipmentToEdit.manufactureYear || new Date().getFullYear(),
            purchasedDate: formatDateForInput(equipmentToEdit.purchasedDate) || "",
            deliveredDate: formatDateForInput(equipmentToEdit.deliveredDate) || "",
            egpPrice: equipmentToEdit.egpPrice || "",
            dollarPrice: equipmentToEdit.dollarPrice || "",
            purchasedFrom: equipmentToEdit.purchasedFromId || "",
            examinedBy: equipmentToEdit.examinedBy || "",
            equipmentComplaints: equipmentToEdit.equipmentComplaints || "",
            countryOfOrigin: equipmentToEdit.countryOfOrigin || "",
            shipping: equipmentToEdit.shipping || "",
            customs: equipmentToEdit.customs || "",
            taxes: equipmentToEdit.taxes || "",
            relatedDocuments: equipmentToEdit.relatedDocuments || "",
            workedHours: equipmentToEdit.workedHours || 0
        };

        setFormData(newFormData);

        // Set display values for numeric fields and dates
        setDisplayValues({
            egpPrice: formatNumberWithCommas(equipmentToEdit.egpPrice) || "",
            dollarPrice: formatNumberWithCommas(equipmentToEdit.dollarPrice) || "",
            workedHours: formatNumberWithCommas(equipmentToEdit.workedHours) || "0",
            purchasedDate: formatDateForDisplay(equipmentToEdit.purchasedDate) || "",
            deliveredDate: formatDateForDisplay(equipmentToEdit.deliveredDate) || ""
        });

        // Set preview image if equipment has an image
        if (equipmentToEdit.imageUrl) {
            setPreviewImage(equipmentToEdit.imageUrl);
        }

        // Since we're editing an existing item, mark form as touched
        setFormTouched(true);
        setShowValidationHint(false); // Don't show validation hints initially when editing
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        
        // Handle checkbox inputs
        if (type === 'checkbox') {
            setFormData(prev => ({
                ...prev,
                [name]: checked
            }));
            
            setFormTouched(true);
            return;
        }

        // Handle number inputs with comma formatting
        if (name === 'egpPrice' || name === 'dollarPrice') {
            const numericValue = parseNumberInput(value);
            setFormData(prev => ({
                ...prev,
                [name]: numericValue
            }));
            setDisplayValues(prev => ({
                ...prev,
                [name]: formatNumberWithCommas(numericValue)
            }));
        } else if (name === 'workedHours') {
            const numericValue = parseNumberInput(value);
            setFormData(prev => ({
                ...prev,
                [name]: numericValue
            }));
            setDisplayValues(prev => ({
                ...prev,
                [name]: formatNumberWithCommas(numericValue)
            }));
        } else if (name === 'purchasedDate' || name === 'deliveredDate') {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
            setDisplayValues(prev => ({
                ...prev,
                [name]: formatDateForDisplay(value)
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }

        setFormTouched(true);
    };

    const handleTypeChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewImage(reader.result);
            };
            reader.readAsDataURL(file);
            setFormTouched(true);
        }
    };

    const handleTabChange = (index) => {
        setTabIndex(index);
        // The useEffect will handle scrolling to top
    };

    // Validate a specific tab based on its required fields
    const validateTab = (tabId) => {
        const tab = tabs.find(t => t.id === tabId);
        if (!tab) return true;

        // Check if all required fields for this tab are filled
        let isValid = tab.requiredFields.every(field =>
            formData[field] !== undefined &&
            formData[field] !== null &&
            formData[field] !== ""
        );

        // Special handling for Basic Information tab - also require image
        if (tabId === 0) {
            isValid = isValid && (imageFile !== null || (equipmentToEdit && equipmentToEdit.imageUrl));
        }

        setTabValidation(prev => ({
            ...prev,
            [tabId]: isValid
        }));

        return isValid;
    };

    // Validate all tabs and update form validity
    const validateAllTabs = () => {
        // All tabs need to be valid for the form to be valid
        const tab0Valid = validateTab(0);
        const tab1Valid = validateTab(1);
        const tab2Valid = validateTab(2);

        const isFormValid = tab0Valid && tab1Valid && tab2Valid;
        setFormValid(isFormValid);
        return isFormValid;
    };

    // Get tab status indicator - always show indicators for all tabs
    const getTabStatus = (tabId) => {
        if (tabValidation[tabId]) {
            return <FaCheck className="tab-status-icon valid" />;
        } else {
            return <FaExclamationCircle className="tab-status-icon invalid" />;
        }
    };

    const validateForm = () => {
        // Try to validate all tabs
        const isValid = validateAllTabs();

        if (!isValid) {
            // Find the first invalid tab
            const firstInvalidTab = Object.keys(tabValidation)
                .find(tabId => !tabValidation[tabId]);

            if (firstInvalidTab !== undefined) {
                // Switch to the first invalid tab
                setTabIndex(parseInt(firstInvalidTab));
                setShowValidationHint(true);

                // Use snackbar to inform user about missing fields
                showWarning("Please complete all required fields before submitting.");
            }

            return false;
        }

        return true;
    };

    // Parse backend error messages to be more user-friendly
    const parseErrorMessage = (error) => {
        const message = error?.response?.data?.message || error?.message || "An unexpected error occurred.";

        // Check for specific error patterns
        if (message.includes("serial number") && message.includes("already exists")) {
            return "This serial number is already in use. Please use a unique serial number.";
        }

        if (message.includes("Validation error") || message.includes("Not valid")) {
            return "Some fields contain invalid data. Please check your inputs and try again.";
        }

        if (message.includes("Cannot be assigned as a driver")) {
            return "The selected employee cannot be assigned as a driver for this equipment type.";
        }

        if (message.includes("Equipment type not found")) {
            return "The selected equipment type no longer exists. Please select another type.";
        }

        if (message.includes("required") || message.includes("cannot be null")) {
            return "Some required fields are missing. Please fill all required fields.";
        }

        // Return the original message if no specific pattern matches
        return message;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) {
            setShowValidationHint(true);
            setTabIndex(0); // Go to the first tab
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const formDataToSend = new FormData();

            // FIX: Use 'typeId' and 'brandId' instead of 'type' and 'brand'
            formDataToSend.append('typeId', formData.typeId);
            formDataToSend.append('brandId', formData.brandId);

            // Add all required fields
            formDataToSend.append('name', formData.name);
            formDataToSend.append('model', formData.model);
            formDataToSend.append('serialNumber', formData.serialNumber);
            formDataToSend.append('modelNumber', formData.modelNumber);
            formDataToSend.append('purchasedDate', formData.purchasedDate);
            formDataToSend.append('deliveredDate', formData.deliveredDate);
            formDataToSend.append('egpPrice', formData.egpPrice);

            // Add dollarPrice field with a default value if not present
            formDataToSend.append('dollarPrice', formData.dollarPrice || 0);

            formDataToSend.append('countryOfOrigin', formData.countryOfOrigin);
            formDataToSend.append('shipping', formData.shipping);
            formDataToSend.append('customs', formData.customs);
            formDataToSend.append('taxes', formData.taxes);
            formDataToSend.append('examinedBy', formData.examinedBy);

            if (formData.purchasedFrom) {
                formDataToSend.append('purchasedFrom', formData.purchasedFrom);
            }

            formDataToSend.append('status', formData.status);
            formDataToSend.append('manufactureYear', formData.manufactureYear);

            if (formData.workedHours !== undefined) {
                formDataToSend.append('workedHours', formData.workedHours);
            } else {
                formDataToSend.append('workedHours', 0);
            }

            // FIX: Add optional fields with proper null checking
            if (formData.siteId) {
                formDataToSend.append('siteId', formData.siteId);
            }

            if (formData.mainDriverId) {
                formDataToSend.append('mainDriverId', formData.mainDriverId);
            }

            if (formData.subDriverId) {
                formDataToSend.append('subDriverId', formData.subDriverId);
            }

            if (formData.equipmentComplaints) {
                formDataToSend.append('equipmentComplaints', formData.equipmentComplaints);
            }

            if (formData.relatedDocuments) {
                formDataToSend.append('relatedDocuments', formData.relatedDocuments);
            }

            // Append the image if selected
            if (imageFile) {
                formDataToSend.append('file', imageFile);
            }

            // Debug: Log all FormData entries
            console.log("=== FormData Contents ===");
            for (let [key, value] of formDataToSend.entries()) {
                if (value instanceof File) {
                    console.log(`${key}: [File] ${value.name} (${value.size} bytes, ${value.type})`);
                } else {
                    console.log(`${key}: ${value}`);
                }
            }
            console.log("=== End FormData Contents ===");

            let result;
            if (equipmentToEdit) {
                // Update existing equipment
                result = await equipmentService.updateEquipment(equipmentToEdit.id, formDataToSend);
                showSuccess(`Equipment "${formData.name}" has been updated successfully`);
            } else {
                console.log(formDataToSend);
                // Create new equipment
                result = await equipmentService.addEquipment(formDataToSend);
                showSuccess(`Equipment "${formData.name}" has been added successfully`);
            }

            setLoading(false);
            onSave(result.data);
            onClose();
        } catch (error) {
            console.error("Error saving equipment:", error);
            const userFriendlyErrorMessage = parseErrorMessage(error);
            setError(userFriendlyErrorMessage);
            showError(`Error: ${userFriendlyErrorMessage}`);
            setLoading(false);
        }
    };

    const handleNextTab = () => {
        if (tabIndex < tabs.length - 1) {
            setTabIndex(tabIndex + 1);
            // Scroll to top will be handled by useEffect
        }
    };

    const currentEquipmentType = equipmentTypes.find(t => t.id === formData.typeId)?.name || '';
    const currentEquipmentTypeData = equipmentTypes.find(t => t.id === formData.typeId);
    const isEquipmentTypeDrivable = currentEquipmentTypeData?.drivable || false;

    // If modal is not open, don't render anything
    if (!isOpen) return null;

    const availableMainDrivers = eligibleDrivers.filter(driver =>
        driver.id !== formData.subDriverId
    );

    const availableSubDrivers = eligibleDrivers.filter(driver =>
        driver.id !== formData.mainDriverId
    );

    return (
        <div className="equipment-modal-overlay">
            <div className="equipment-modal">
                <div className="equipment-modal-header">
                    <h2>{equipmentToEdit ? 'Edit Equipment' : 'Add New Equipment'}</h2>
                    <button className="equipment-modal-close" onClick={onClose} aria-label="Close">
                        <FaTimes />
                    </button>
                </div>

                {/* Form guidance banner */}
                <div className="equipment-form-guidance">
                    <FaInfoCircle className="guidance-icon" />
                    <div className="guidance-text">
                        <p>This form is divided into {tabs.length} tabs. Please complete all required fields marked with <span className="required">*</span> before submitting.</p>
                        <p>Currently on: <strong>{tabs[tabIndex].name}</strong> (Tab {tabIndex + 1} of {tabs.length})</p>
                    </div>
                </div>

                <div className="equipment-modal-tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`equipment-modal-tab ${tabIndex === tab.id ? 'active' : ''} ${tabValidation[tab.id] ? 'valid' : 'invalid'}`}
                            onClick={() => handleTabChange(tab.id)}
                        >
                            {tab.name} {getTabStatus(tab.id)}
                        </button>
                    ))}
                </div>

                {error && (
                    <div className="equipment-modal-error">
                        <FaExclamationCircle />
                        <span>{error}</span>
                    </div>
                )}

                {showValidationHint && !tabValidation[tabIndex] && (
                    <div className="equipment-validation-hint">
                        <FaExclamationCircle />
                        <span>Please complete all required fields in this tab before proceeding.</span>
                    </div>
                )}

                {typeChangeWarning && (
                    <div className="equipment-validation-warning">
                        <FaExclamationCircle />
                        <span>The previously selected driver(s) are not qualified for this equipment type and have been cleared. Please select a driver that can operate {currentEquipmentType}.</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="equipment-modal-form">
                    <div className="equipment-modal-content" ref={contentRef}>
                        {/* Tab 1: Basic Information */}
                        <div className={`equipment-modal-tab-content ${tabIndex === 0 ? 'active' : ''}`}>
                            <div className="equipment-modal-form-row">
                                <div className="equipment-modal-form-group">
                                    <label htmlFor="name" className="required-field">Equipment Name</label>
                                    <input
                                        type="text"
                                        id="name"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        placeholder="Enter equipment name"
                                        className={!formData.name && showValidationHint ? "invalid-field" : ""}
                                        required
                                    />
                                </div>
                                <div className="equipment-modal-form-group">
                                    <label htmlFor="serialNumber" className="required-field">Serial Number</label>
                                    <input
                                        type="text"
                                        id="serialNumber"
                                        name="serialNumber"
                                        value={formData.serialNumber}
                                        onChange={handleInputChange}
                                        placeholder="Enter serial number"
                                        className={!formData.serialNumber && showValidationHint ? "invalid-field" : ""}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="equipment-modal-form-row">
                                <div className="equipment-modal-form-group">
                                    <label htmlFor="brand" className="required-field">Brand</label>
                                    <select
                                        id="brandId"
                                        name="brandId"
                                        value={formData.brandId}
                                        onChange={handleInputChange}
                                        className={!formData.brandId && showValidationHint ? "invalid-field" : ""}
                                        required
                                    >
                                        <option value="">Select equipment brand</option>
                                        {equipmentBrands.map(brand => (
                                            <option key={brand.id} value={brand.id}>
                                                {brand.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="equipment-modal-form-group">
                                    <label htmlFor="model" className="required-field">Model</label>
                                    <input
                                        type="text"
                                        id="model"
                                        name="model"
                                        value={formData.model}
                                        onChange={handleInputChange}
                                        placeholder="Enter model"
                                        className={!formData.model && showValidationHint ? "invalid-field" : ""}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="equipment-modal-form-row">
                                <div className="equipment-modal-form-group">
                                    <label htmlFor="typeId" className="required-field">Equipment Type</label>
                                    <select
                                        id="typeId"
                                        name="typeId"
                                        value={formData.typeId}
                                        onChange={handleTypeChange}
                                        className={!formData.typeId && showValidationHint ? "invalid-field" : ""}
                                        required
                                    >
                                        <option value="">Select equipment type</option>
                                        {equipmentTypes.map(type => (
                                            <option key={type.id} value={type.id}>
                                                {type.name}
                                            </option>
                                        ))}
                                    </select>
                                    {formData.typeId && isEquipmentTypeDrivable && (
                                        <div className="field-hint">
                                            <FaInfoCircle />
                                            <span>Drivers for this equipment must have the job position: {currentEquipmentType} Driver</span>
                                        </div>
                                    )}
                                    {formData.typeId && !isEquipmentTypeDrivable && (
                                        <div className="field-hint">
                                            <FaInfoCircle />
                                            <span>This equipment type does not require a driver</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="equipment-modal-form-row">
                                <div className="equipment-modal-form-group">
                                    <label htmlFor="modelNumber" className="required-field">Model Number</label>
                                    <input
                                        type="text"
                                        id="modelNumber"
                                        name="modelNumber"
                                        value={formData.modelNumber}
                                        onChange={handleInputChange}
                                        placeholder="Enter model number"
                                        className={!formData.modelNumber && showValidationHint ? "invalid-field" : ""}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="equipment-modal-form-row">
                                <div className="equipment-modal-form-group">
                                    <label htmlFor="status">Status</label>
                                    <select
                                        id="status"
                                        name="status"
                                        value={formData.status}
                                        onChange={handleInputChange}
                                    >
                                        <option value="AVAILABLE">Available</option>
                                        <option value="RENTED">Rented</option>
                                        <option value="IN_MAINTENANCE">In Maintenance</option>
                                        <option value="SOLD">Sold</option>
                                        <option value="SCRAPPED">Scrapped</option>
                                    </select>
                                </div>
                                <div className="equipment-modal-form-group">
                                    <label htmlFor="manufactureYear" className="required-field">Manufacture Year</label>
                                    <input
                                        type="number"
                                        id="manufactureYear"
                                        name="manufactureYear"
                                        value={formData.manufactureYear}
                                        onChange={handleInputChange}
                                        min="1900"
                                        max={new Date().getFullYear()}
                                        className={!formData.manufactureYear && showValidationHint ? "invalid-field" : ""}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="equipment-modal-form-row">
                                <div className="equipment-modal-form-group">
                                    <label htmlFor="siteId">Site</label>
                                    <select
                                        id="siteId"
                                        name="siteId"
                                        value={formData.siteId}
                                        onChange={handleInputChange}
                                    >
                                        <option value="">Select site</option>
                                        {sites.map(site => (
                                            <option key={site.id} value={site.id}>
                                                {site.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="equipment-modal-form-group">
                                    <label className="required-field">Equipment Image</label>
                                    <div className="equipment-modal-image-upload">
                                        <input
                                            type="file"
                                            id="equipmentImage"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            className="equipment-image-input"
                                        />
                                        <label htmlFor="equipmentImage" className="equipment-image-label">
                                            <FaUpload />
                                            <span>Choose file</span>
                                        </label>
                                        {previewImage && (
                                            <div className="equipment-image-preview">
                                                <img src={previewImage} alt="Equipment preview" />
                                            </div>
                                        )}
                                    </div>
                                    {!imageFile && !equipmentToEdit?.imageUrl && showValidationHint && (
                                        <div className="field-hint warning">
                                            <FaExclamationCircle />
                                            <span>Equipment image is required</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="tab-navigation">
                                <button type="button" className="next-tab-button" onClick={handleNextTab}>
                                    Next: Purchase Details <FaArrowRight />
                                </button>
                            </div>
                        </div>

                        {/* Tab 2: Purchase Details */}
                        <div className={`equipment-modal-tab-content ${tabIndex === 1 ? 'active' : ''}`}>
                            <div className="equipment-modal-form-row">
                                <div className="equipment-modal-form-group">
                                    <label htmlFor="purchasedDate" className="required-field">Purchase Date</label>
                                    <div className="date-input-container">
                                        <input
                                            type="date"
                                            id="purchasedDate"
                                            name="purchasedDate"
                                            value={formData.purchasedDate}
                                            onChange={handleInputChange}
                                            className={!formData.purchasedDate && showValidationHint ? "invalid-field" : ""}
                                            required
                                        />
                                        <div className="date-display">{displayValues.purchasedDate || 'DD/MM/YYYY'}</div>
                                    </div>
                                </div>
                                <div className="equipment-modal-form-group">
                                    <label htmlFor="deliveredDate" className="required-field">Delivery Date</label>
                                    <div className="date-input-container">
                                        <input
                                            type="date"
                                            id="deliveredDate"
                                            name="deliveredDate"
                                            value={formData.deliveredDate}
                                            onChange={handleInputChange}
                                            className={!formData.deliveredDate && showValidationHint ? "invalid-field" : ""}
                                            required
                                        />
                                        <div className="date-display">{displayValues.deliveredDate || 'DD/MM/YYYY'}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="equipment-modal-form-row">
                                <div className="equipment-modal-form-group">
                                    <label htmlFor="egpPrice" className="required-field">Price (EGP)</label>
                                    <input
                                        type="text"
                                        id="egpPrice"
                                        name="egpPrice"
                                        value={displayValues.egpPrice}
                                        onChange={handleInputChange}
                                        placeholder="Enter price in EGP"
                                        className={!formData.egpPrice && showValidationHint ? "invalid-field" : ""}
                                        required
                                    />
                                </div>
                                <div className="equipment-modal-form-group">
                                    <label htmlFor="dollarPrice">Price (USD)</label>
                                    <input
                                        type="text"
                                        id="dollarPrice"
                                        name="dollarPrice"
                                        value={displayValues.dollarPrice}
                                        onChange={handleInputChange}
                                        placeholder="Enter price in USD"
                                    />
                                </div>
                            </div>

                            <div className="equipment-modal-form-row">
                                <div className="equipment-modal-form-group">
                                    <label htmlFor="purchasedFrom" className="required-field">Purchased From</label>
                                    <select
                                        id="purchasedFrom"
                                        name="purchasedFrom"
                                        value={formData.purchasedFrom}
                                        onChange={handleInputChange}
                                        className={!formData.purchasedFrom && showValidationHint ? "invalid-field" : ""}
                                        required
                                    >
                                        <option value="">Select merchant</option>
                                        {merchants.map(merchant => (
                                            <option key={merchant.id} value={merchant.id}>
                                                {merchant.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="equipment-modal-form-group">
                                    <label htmlFor="countryOfOrigin" className="required-field">Country of Origin</label>
                                    <input
                                        type="text"
                                        id="countryOfOrigin"
                                        name="countryOfOrigin"
                                        value={formData.countryOfOrigin}
                                        onChange={handleInputChange}
                                        placeholder="Enter country of origin"
                                        className={!formData.countryOfOrigin && showValidationHint ? "invalid-field" : ""}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="equipment-modal-form-row">
                                <div className="equipment-modal-form-group">
                                    <label htmlFor="shipping" className="required-field">Shipping Cost (EGP)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        id="shipping"
                                        name="shipping"
                                        value={formData.shipping}
                                        onChange={handleInputChange}
                                        placeholder="Enter shipping cost"
                                        className={!formData.shipping && showValidationHint ? "invalid-field" : ""}
                                        required
                                    />
                                </div>
                                <div className="equipment-modal-form-group">
                                    <label htmlFor="customs" className="required-field">Customs Cost (EGP)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        id="customs"
                                        name="customs"
                                        value={formData.customs}
                                        onChange={handleInputChange}
                                        placeholder="Enter customs cost"
                                        className={!formData.customs && showValidationHint ? "invalid-field" : ""}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="equipment-modal-form-row">
                                <div className="equipment-modal-form-group">
                                    <label htmlFor="taxes" className="required-field">Taxes Cost (EGP)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        id="taxes"
                                        name="taxes"
                                        value={formData.taxes}
                                        onChange={handleInputChange}
                                        placeholder="Enter taxes cost"
                                        className={!formData.taxes && showValidationHint ? "invalid-field" : ""}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Document Attachments for Monetary Fields */}
                            {equipmentToEdit && equipmentToEdit.id && (
                                <div className="monetary-documents-section">
                                    <h3>Document Attachments</h3>
                                    <MonetaryFieldDocuments 
                                        equipmentId={equipmentToEdit.id} 
                                        fieldType="SHIPPING" 
                                        fieldLabel="Shipping" 
                                    />
                                    <MonetaryFieldDocuments 
                                        equipmentId={equipmentToEdit.id} 
                                        fieldType="CUSTOMS" 
                                        fieldLabel="Customs" 
                                    />
                                    <MonetaryFieldDocuments 
                                        equipmentId={equipmentToEdit.id} 
                                        fieldType="TAXES" 
                                        fieldLabel="Taxes" 
                                    />
                                </div>
                            )}

                            <div className="tab-navigation">
                                <button type="button" className="next-tab-button" onClick={handleNextTab}>
                                    Next: Additional Info <FaArrowRight />
                                </button>
                            </div>
                        </div>

                        {/* Tab 3: Additional Info */}
                        <div className={`equipment-modal-tab-content ${tabIndex === 2 ? 'active' : ''}`}>
                            {isEquipmentTypeDrivable && formData.typeId && (
                                <div className="equipment-modal-form-row">
                                    <div className="equipment-modal-form-group">
                                        <label htmlFor="mainDriverId">Main Driver</label>
                                        <select
                                            id="mainDriverId"
                                            name="mainDriverId"
                                            value={formData.mainDriverId}
                                            onChange={handleInputChange}
                                            disabled={!formData.typeId || availableMainDrivers.length === 0}
                                        >
                                            <option value="">Select main driver</option>
                                            {availableMainDrivers.map(driver => (
                                                <option key={driver.id} value={driver.id}>
                                                    {driver.fullName} - {driver.position}
                                                </option>
                                            ))}
                                        </select>
                                        {!formData.typeId && (
                                            <div className="field-hint">
                                                <FaInfoCircle />
                                                <span>Please select an equipment type first</span>
                                            </div>
                                        )}
                                        {formData.typeId && availableMainDrivers.length === 0 && (
                                            <div className="field-hint warning">
                                                <FaExclamationCircle />
                                                <span>
                {eligibleDrivers.length === 0
                    ? `No eligible drivers found for this equipment type. Drivers must have the job position: ${currentEquipmentType} Driver`
                    : 'All eligible drivers are already assigned or selected as sub driver'
                }
            </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="equipment-modal-form-group">
                                        <label htmlFor="subDriverId">Sub Driver</label>
                                        <select
                                            id="subDriverId"
                                            name="subDriverId"
                                            value={formData.subDriverId}
                                            onChange={handleInputChange}
                                            disabled={!formData.typeId || availableSubDrivers.length === 0}
                                        >
                                            <option value="">Select sub driver</option>
                                            {availableSubDrivers.map(driver => (
                                                <option key={driver.id} value={driver.id}>
                                                    {driver.fullName} - {driver.position}
                                                </option>
                                            ))}
                                        </select>
                                        {formData.typeId && availableSubDrivers.length === 0 && (
                                            <div className="field-hint warning">
                                                <FaExclamationCircle />
                                                <span>
                {eligibleDrivers.length === 0
                    ? `No eligible drivers found for this equipment type`
                    : 'All eligible drivers are already assigned or selected as main driver'
                }
            </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            
                            {(!isEquipmentTypeDrivable && formData.typeId) && (
                                <div className="equipment-modal-form-row">
                                    <div className="equipment-modal-form-group full-width">
                                        <div className="info-message">
                                            <FaInfoCircle />
                                            <span>This equipment type ({currentEquipmentType}) does not require a driver. Driver assignment is disabled.</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            <div className="equipment-modal-form-row">
                                <div className="equipment-modal-form-group">
                                    <label htmlFor="workedHours">Worked Hours</label>
                                    <input
                                        type="text"
                                        id="workedHours"
                                        name="workedHours"
                                        value={displayValues.workedHours}
                                        onChange={handleInputChange}
                                        placeholder="Enter worked hours"
                                    />
                                </div>
                                <div className="equipment-modal-form-group">
                                    <label htmlFor="examinedBy">Examined By</label>
                                    <input
                                        type="text"
                                        id="examinedBy"
                                        name="examinedBy"
                                        value={formData.examinedBy}
                                        onChange={handleInputChange}
                                        placeholder="Enter examiner name"
                                    />
                                </div>
                            </div>

                            <div className="equipment-modal-form-row">
                                <div className="equipment-modal-form-group full-width">
                                    <label htmlFor="equipmentComplaints">Equipment Complaints</label>
                                    <textarea
                                        id="equipmentComplaints"
                                        name="equipmentComplaints"
                                        value={formData.equipmentComplaints}
                                        onChange={handleInputChange}
                                        placeholder="Enter any equipment complaints or issues"
                                        rows="3"
                                    />
                                </div>
                            </div>

                            <div className="equipment-modal-form-row">
                                <div className="equipment-modal-form-group full-width">
                                    <label htmlFor="relatedDocuments">Related Documents</label>
                                    <textarea
                                        id="relatedDocuments"
                                        name="relatedDocuments"
                                        value={formData.relatedDocuments}
                                        onChange={handleInputChange}
                                        placeholder="Enter related documents information"
                                        rows="3"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="equipment-modal-footer">
                        <div className="form-completion-status">
                            <div className="completion-indicator">
                                <div
                                    className="completion-bar"
                                    style={{
                                        width: `${Object.values(tabValidation).filter(Boolean).length / tabs.length * 100}%`
                                    }}
                                ></div>
                            </div>
                            <span>
                                {Object.values(tabValidation).filter(Boolean).length} of {tabs.length} tabs complete
                            </span>
                        </div>
                        <div className="form-actions">
                            <button
                                type="button"
                                className="equipment-modal-clear"
                                onClick={handleClearForm}
                                disabled={loading}
                            >
                                <FaTrash /> Clear
                            </button>
                            <button
                                type="button"
                                className="equipment-modal-cancel"
                                onClick={onClose}
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="equipment-modal-submit"
                                disabled={loading || !formValid}
                            >
                                {loading ? 'Saving...' : equipmentToEdit ? 'Update Equipment' : 'Add Equipment'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EquipmentModal;