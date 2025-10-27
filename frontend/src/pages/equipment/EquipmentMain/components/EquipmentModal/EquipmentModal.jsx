import React, { useState, useEffect, useRef } from "react";
import { FaTimes, FaUpload, FaExclamationCircle, FaInfoCircle, FaCheck, FaArrowRight, FaTrash } from "react-icons/fa";
import { equipmentService } from "../../../../../services/equipmentService.js";
import { equipmentTypeService } from "../../../../../services/equipmentTypeService.js";
import { equipmentBrandService } from "../../../../../services/equipmentBrandService.js";
import { siteService } from "../../../../../services/siteService.js";
import { merchantService } from "../../../../../services/merchant/merchantService.js";
import { documentService } from "../../../../../services/documentService.js";
import { useSnackbar } from "../../../../../contexts/SnackbarContext.jsx";
import DocumentUpload from '../../../../../components/equipment/DocumentUpload';
import "./EquipmentModal.scss";
import '../../../../../styles/form-validation.scss';

const EquipmentModal = ({ isOpen, onClose, onSave, equipmentToEdit = null }) => {
    const { showSuccess, showError, showInfo, showWarning, hideSnackbar, showConfirmation } = useSnackbar();
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
        typeId: "",
        siteId: "",
        mainDriverId: "",
        subDriverId: "",
        status: "AVAILABLE",
        manufactureYear: "",
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
        workedHours: "0"
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
        shipping: "",
        customs: "",
        taxes: "",
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
    const [fieldValidation, setFieldValidation] = useState({
        serialNumber: { isValid: true, message: '' },
        egpPrice: { isValid: true, message: '' },
        dollarPrice: { isValid: true, message: '' },
        shipping: { isValid: true, message: '' },
        customs: { isValid: true, message: '' },
        taxes: { isValid: true, message: '' },
        workedHours: { isValid: true, message: '' },
        manufactureYear: { isValid: true, message: '' }
    });

    // Define tabs with required fields based on database schema
    const tabs = [
        {
            id: 0,
            name: "Basic Information",
            requiredFields: ['name', 'serialNumber', 'typeId', 'model', 'brandId', 'manufactureYear']
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

    // Document states
    const [documentsByFieldType, setDocumentsByFieldType] = useState({
        SHIPPING: [],
        CUSTOMS: [],
        TAXES: []
    });

    // Status options (to be fetched from backend)
    const [statusOptions, setStatusOptions] = useState([]);

    // Brand creation modal state
    const [showBrandModal, setShowBrandModal] = useState(false);
    const [newBrandData, setNewBrandData] = useState({ name: '', description: '' });
    const [creatingBrand, setCreatingBrand] = useState(false);

    // Scroll to top whenever tab changes
    useEffect(() => {
        if (contentRef.current) {
            contentRef.current.scrollTop = 0;
        }
    }, [tabIndex]);

    // Clear form data with snackbar confirmation
    const handleClearForm = () => {
        if (formTouched) {
            showConfirmation(
                "Are you sure you want to clear all form data?",
                performClearForm,
                () => hideSnackbar()
            );
        } else {
            performClearForm();
        }
    };

    // Actually clear the form
    const performClearForm = () => {
        // Reset all form state
        setFormData(initialFormState);
        setDisplayValues({
            egpPrice: "",
            dollarPrice: "",
            shipping: "",
            customs: "",
            taxes: "",
            workedHours: "0",
            purchasedDate: "",
            deliveredDate: ""
        });
        setImageFile(null);
        setPreviewImage(null);
        setTypeChangeWarning(false);
        setTabIndex(0); // Return to first tab
        setFormTouched(false);
        setFormValid(false);
        setError(null);
        
        // Reset validation state
        setTabValidation({
            0: false,
            1: false,
            2: false
        });
        
        // Reset documents
        setDocumentsByFieldType({
            SHIPPING: [],
            CUSTOMS: [],
            TAXES: []
        });
        
        // Reset file input element
        const fileInput = document.getElementById('equipmentImage');
        if (fileInput) {
            fileInput.value = '';
        }
        
        // Hide any existing snackbars
        hideSnackbar();
        
        showSuccess("Form has been cleared successfully");
    };

    // Handle document changes
    const handleDocumentsChange = (fieldType, documents) => {
        setDocumentsByFieldType(prev => ({
            ...prev,
            [fieldType]: documents
        }));
        setFormTouched(true);
    };

    // Fetch necessary data when modal opens and prevent background scrolling
    useEffect(() => {
        if (isOpen) {
            // Prevent background page scrolling when modal is open
            document.body.style.overflow = 'hidden';
            
            fetchFormData();
            if (equipmentToEdit) {
                populateFormForEditing();
            } else {
                setFormData(initialFormState);
                setDisplayValues({
                    egpPrice: "",
                    dollarPrice: "",
                    shipping: "",
                    customs: "",
                    taxes: "",
                    workedHours: "0"
                });
                setImageFile(null);
                setPreviewImage(null);
                setFormTouched(false);
                setTabIndex(0);
                setDocumentsByFieldType({
                    SHIPPING: [],
                    CUSTOMS: [],
                    TAXES: []
                });
            }
            validateAllTabs();
            if (contentRef.current) {
                contentRef.current.scrollTop = 0;
            }
        } else {
            // Restore background page scrolling when modal is closed
            document.body.style.overflow = 'unset';
        }
        
        return () => {
            // Cleanup: Always restore scrolling when component unmounts
            document.body.style.overflow = 'unset';
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

    // Re-validate tabs whenever field validation state changes
    useEffect(() => {
        if (isOpen) {
            validateAllTabs();
        }
    }, [fieldValidation, isOpen]);

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

            // Fetch equipment status options
            try {
                const statusResponse = await equipmentService.getEquipmentStatusOptions();
                setStatusOptions(statusResponse.data);
            } catch (error) {
                console.error("Error fetching equipment status options:", error);
                // Fallback to default status options
                setStatusOptions([
                    { value: "AVAILABLE", label: "Available" },
                    { value: "RENTED", label: "Rented" },
                    { value: "IN_MAINTENANCE", label: "In Maintenance" },
                    { value: "RUNNING", label: "Running" },
                    { value: "SOLD", label: "Sold" },
                    { value: "SCRAPPED", label: "Scrapped" }
                ]);
            }

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

                // Only clear and show warning for sub driver if not eligible
                if (formData.subDriverId && !subDriverStillEligible) {
                    setFormData(prev => ({ ...prev, subDriverId: "" }));
                    setTypeChangeWarning(true);
                    showWarning("The selected sub driver is not qualified for this equipment type and has been cleared.");
                }

                // For main driver, only clear if not eligible and not already assigned
                if (formData.mainDriverId && !mainDriverStillEligible && !equipmentToEdit?.mainDriverId) {
                    setFormData(prev => ({ ...prev, mainDriverId: "" }));
                    setTypeChangeWarning(true);
                    showWarning("The selected main driver is not qualified for this equipment type and has been cleared.");
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

    const populateFormForEditing = async () => {
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
            typeId: equipmentToEdit.typeId || "",
            siteId: equipmentToEdit.siteId || "",
            mainDriverId: equipmentToEdit.mainDriverId || "",
            subDriverId: equipmentToEdit.subDriverId || "",
            status: equipmentToEdit.status || "AVAILABLE",
            manufactureYear: equipmentToEdit.manufactureYear ? equipmentToEdit.manufactureYear.toString() : "",
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

        // Set display values for numeric fields only
        setDisplayValues({
            egpPrice: formatNumberWithCommas(equipmentToEdit.egpPrice) || "",
            dollarPrice: formatNumberWithCommas(equipmentToEdit.dollarPrice) || "",
            shipping: formatNumberWithCommas(equipmentToEdit.shipping) || "",
            customs: formatNumberWithCommas(equipmentToEdit.customs) || "",
            taxes: formatNumberWithCommas(equipmentToEdit.taxes) || "",
            workedHours: formatNumberWithCommas(equipmentToEdit.workedHours) || "0"
        });

        // Fetch fresh presigned URL for equipment image (important for S3/MinIO)
        if (equipmentToEdit.id) {
            try {
                console.log(`Fetching fresh presigned URL for equipment ${equipmentToEdit.id}`);
                const photoResponse = await equipmentService.getEquipmentMainPhoto(equipmentToEdit.id);
                if (photoResponse.data) {
                    console.log("Fresh presigned URL fetched successfully");
                    setPreviewImage(photoResponse.data);
                } else if (equipmentToEdit.imageUrl) {
                    // Fallback to existing URL if fresh fetch fails
                    setPreviewImage(equipmentToEdit.imageUrl);
                }
            } catch (error) {
                console.error("Error fetching fresh equipment photo:", error);
                // Try refresh endpoint as fallback
                try {
                    console.log("Retrying with refresh endpoint...");
                    const refreshResponse = await equipmentService.refreshEquipmentMainPhoto(equipmentToEdit.id);
                    if (refreshResponse.data) {
                        console.log("Fresh presigned URL fetched via refresh");
                        setPreviewImage(refreshResponse.data);
                    }
                } catch (refreshError) {
                    console.error("Error refreshing equipment photo:", refreshError);
                    // Use existing URL as last resort
                    if (equipmentToEdit.imageUrl) {
                        setPreviewImage(equipmentToEdit.imageUrl);
                    }
                }
            }
        } else if (equipmentToEdit.imageUrl) {
            // Fallback for equipment without ID
            setPreviewImage(equipmentToEdit.imageUrl);
        }

        // Since we're editing an existing item, mark form as touched
        setFormTouched(true);
        setShowValidationHint(false); // Don't show validation hints initially when editing

        // Load existing documents
        loadExistingDocuments(equipmentToEdit.id);
    };

    // Load existing documents when editing equipment
    const loadExistingDocuments = async (equipmentId) => {
        try {
            const response = await documentService.getByEntity('equipment', equipmentId);
            const allDocuments = response.data;

            // Group documents by field type based on document type
            const documentsData = {
                SHIPPING: [],
                CUSTOMS: [],
                TAXES: []
            };

            allDocuments.forEach(doc => {
                const docType = doc.type.toUpperCase();
                if (docType.includes('SHIPPING')) {
                    documentsData.SHIPPING.push({
                        id: doc.id,
                        documentName: doc.name,
                        documentType: doc.type,
                        fieldType: 'SHIPPING',
                        fileType: 'application/octet-stream', // Default since not stored in Document entity
                        fileSize: doc.fileSize || 0,
                        fileUrl: doc.url,
                        isNew: false,
                        existingDocument: true
                    });
                } else if (docType.includes('CUSTOMS')) {
                    documentsData.CUSTOMS.push({
                        id: doc.id,
                        documentName: doc.name,
                        documentType: doc.type,
                        fieldType: 'CUSTOMS',
                        fileType: 'application/octet-stream',
                        fileSize: doc.fileSize || 0,
                        fileUrl: doc.url,
                        isNew: false,
                        existingDocument: true
                    });
                } else if (docType.includes('TAX')) {
                    documentsData.TAXES.push({
                        id: doc.id,
                        documentName: doc.name,
                        documentType: doc.type,
                        fieldType: 'TAXES',
                        fileType: 'application/octet-stream',
                        fileSize: doc.fileSize || 0,
                        fileUrl: doc.url,
                        isNew: false,
                        existingDocument: true
                    });
                }
            });

            setDocumentsByFieldType(documentsData);
        } catch (error) {
            console.error('Error loading existing documents:', error);
        }
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

        // Apply thousand separator to all cost fields
        if (["egpPrice", "dollarPrice", "shipping", "customs", "taxes"].includes(name)) {
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
            const numericValue = parseNumberInput(value) || "0";
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
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }

        setFormTouched(true);

        // Trigger real-time validation for specific fields
        const fieldsToValidate = ['serialNumber', 'egpPrice', 'dollarPrice', 'shipping', 'customs', 'taxes', 'workedHours', 'manufactureYear'];
        if (fieldsToValidate.includes(name)) {
            // Use setTimeout to allow state to update first
            setTimeout(() => {
                validateField(name, value);
            }, 100);
        }
    };

    // Validation functions
    const validateSerialNumber = async (serialNumber) => {
        if (!serialNumber || serialNumber.trim() === '') {
            return { isValid: false, message: 'Serial number is required' };
        }

        try {
            // Check if this is an edit operation and the serial number hasn't changed
            if (equipmentToEdit && equipmentToEdit.serialNumber === serialNumber) {
                return { isValid: true, message: '' };
            }

            // Check uniqueness by fetching all equipment and comparing serial numbers
            const response = await equipmentService.getAllEquipment();
            const existingEquipment = response.data.find(
                equipment => equipment.serialNumber.toLowerCase() === serialNumber.toLowerCase() &&
                equipment.id !== (equipmentToEdit?.id)
            );

            if (existingEquipment) {
                return { 
                    isValid: false, 
                    message: `Serial number already exists for equipment: ${existingEquipment.name || 'Unknown Equipment'}` 
                };
            }

            return { isValid: true, message: '' };
        } catch (error) {
            console.error('Error validating serial number:', error);
            return { isValid: false, message: 'Unable to validate serial number. Please try again.' };
        }
    };

    const validateNumericField = (value, fieldName) => {
        if (!value || value.trim() === '') {
            return { isValid: true, message: '' }; // Empty is valid for optional fields
        }

        // Remove commas and check if it's a valid number
        const numericValue = parseNumberInput(value);
        
        // Check if it's a valid number
        if (isNaN(numericValue) || numericValue < 0) {
            return { 
                isValid: false, 
                message: `${fieldName} must be a valid positive number` 
            };
        }

        return { isValid: true, message: '' };
    };

    const validateManufactureYear = (year) => {
        if (!year || year.trim() === '') {
            return { isValid: false, message: 'Manufacture year is required' };
        }

        const currentYear = new Date().getFullYear();
        const yearNumber = parseInt(year);

        if (isNaN(yearNumber)) {
            return { isValid: false, message: 'Manufacture year must be a valid number' };
        }

        if (yearNumber < 1900 || yearNumber > currentYear) {
            return { 
                isValid: false, 
                message: `Manufacture year must be between 1900 and ${currentYear}` 
            };
        }

        return { isValid: true, message: '' };
    };

    const validateImageFile = (file) => {
        if (!file) {
            return { isValid: true, message: '' }; // No file is valid
        }

        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        const maxSize = 5 * 1024 * 1024; // 5MB

        if (!allowedTypes.includes(file.type)) {
            return { 
                isValid: false, 
                message: 'Only image files are allowed (JPEG, PNG, GIF, WebP)' 
            };
        }

        if (file.size > maxSize) {
            return { 
                isValid: false, 
                message: 'Image file size must be less than 5MB' 
            };
        }

        return { isValid: true, message: '' };
    };

    // Real-time field validation
    const validateField = async (fieldName, value) => {
        let validationResult = { isValid: true, message: '' };

        switch (fieldName) {
            case 'serialNumber':
                validationResult = await validateSerialNumber(value);
                break;
            case 'egpPrice':
                validationResult = validateNumericField(value, 'EGP Price');
                break;
            case 'dollarPrice':
                validationResult = validateNumericField(value, 'USD Price');
                break;
            case 'shipping':
                validationResult = validateNumericField(value, 'Shipping Cost');
                break;
            case 'customs':
                validationResult = validateNumericField(value, 'Customs Cost');
                break;
            case 'taxes':
                validationResult = validateNumericField(value, 'Taxes Cost');
                break;
            case 'workedHours':
                validationResult = validateNumericField(value, 'Worked Hours');
                break;
            case 'manufactureYear':
                validationResult = validateManufactureYear(value);
                break;
            default:
                break;
        }

        setFieldValidation(prev => ({
            ...prev,
            [fieldName]: validationResult
        }));

        return validationResult;
    };

    // Prevent wheel events from changing number input values when scrolling
    const handleNumberInputWheel = (e) => {
        // Prevent wheel events on number inputs and monetary fields when focused
        const monetaryFields = ['egpPrice', 'dollarPrice', 'shipping', 'customs', 'taxes', 'workedHours'];
        if (e.target.type === 'number' || monetaryFields.includes(e.target.name)) {
            e.preventDefault();
            e.target.blur(); // Remove focus to prevent accidental changes
        }
    };

    // Prevent wheel events on the entire modal content to avoid interference
    const handleModalWheel = (e) => {
        // Allow normal scrolling within the modal content area, but prevent changes to focused inputs
        const monetaryFields = ['egpPrice', 'dollarPrice', 'shipping', 'customs', 'taxes', 'workedHours'];
        if ((e.target.type === 'number' || monetaryFields.includes(e.target.name)) && 
            document.activeElement === e.target) {
            e.preventDefault();
            e.target.blur();
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate the image file
            const validation = validateImageFile(file);
            
            if (!validation.isValid) {
                showError(validation.message);
                // Clear the file input
                e.target.value = '';
                return;
            }

            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewImage(reader.result);
            };
            reader.readAsDataURL(file);
            setFormTouched(true);
        }
    };

    const handleRemoveImage = () => {
        setImageFile(null);
        setPreviewImage(null);
        const fileInput = document.getElementById('equipmentImage');
        if (fileInput) {
            fileInput.value = '';
        }
        setFormTouched(true);
        showInfo('Image removed successfully');
    };

    const handleTabChange = (index) => {
        setTabIndex(index);
        // Clear any existing snackbars when changing tabs
        hideSnackbar();
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

        // For tab 0 (Basic Information), check image and field validations
        if (tabId === 0) {
            // Check image requirement
            const hasImage = imageFile !== null || (equipmentToEdit && equipmentToEdit.imageUrl);
            
            // Check field-specific validations for tab 0
            const tab0Fields = ['serialNumber', 'manufactureYear'];
            const fieldsValid = tab0Fields.every(field => fieldValidation[field].isValid);
            
            // Tab is valid only if all conditions are met
            isValid = isValid && hasImage && fieldsValid;
        }

        // For tab 1 (Purchase Details), check monetary field validations
        if (tabId === 1) {
            const tab1Fields = ['egpPrice', 'dollarPrice', 'shipping', 'customs', 'taxes'];
            const fieldsValid = tab1Fields.every(field => fieldValidation[field].isValid);
            
            // Tab is valid only if required fields are filled AND field validations pass
            isValid = isValid && fieldsValid;
        }

        // For tab 2 (Additional Info), check worked hours validation
        if (tabId === 2) {
            const tab2Fields = ['workedHours'];
            const fieldsValid = tab2Fields.every(field => fieldValidation[field].isValid);
            
            // Tab is valid only if required fields are filled AND field validations pass
            isValid = isValid && fieldsValid;
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

    // Find which tab a field belongs to
    const getFieldTab = (fieldName) => {
        for (const tab of tabs) {
            if (tab.requiredFields.includes(fieldName)) {
                return tab.id;
            }
        }
        return 0; // Default to first tab if not found
    };

    // Get the first missing field and its tab
    const getFirstMissingField = () => {
        // Check field validation errors first
        const validationFields = [
            { field: 'serialNumber', tabId: 0 },
            { field: 'manufactureYear', tabId: 0 },
            { field: 'egpPrice', tabId: 1 },
            { field: 'dollarPrice', tabId: 1 },
            { field: 'shipping', tabId: 1 },
            { field: 'customs', tabId: 1 },
            { field: 'taxes', tabId: 1 },
            { field: 'workedHours', tabId: 2 }
        ];

        for (const { field, tabId } of validationFields) {
            if (!fieldValidation[field].isValid) {
                return { field, tabId, validationError: fieldValidation[field].message };
            }
        }

        // Check image requirement (belongs to tab 0)
        if (!imageFile && (!equipmentToEdit || !equipmentToEdit.imageUrl)) {
            return { field: 'image', tabId: 0 };
        }

        // Check all required fields in tab order
        for (const tab of tabs) {
            for (const field of tab.requiredFields) {
                if (!formData[field] || formData[field] === "" || formData[field] === null || formData[field] === undefined) {
                    return { field, tabId: tab.id };
                }
            }
        }

        return null;
    };

    const validateForm = () => {
        // Try to validate all tabs
        const isValid = validateAllTabs();

        if (!isValid) {
            // Find the first missing field and navigate to its tab
            const missingField = getFirstMissingField();

            if (missingField) {
                // Switch to the tab containing the missing field
                setTabIndex(missingField.tabId);
                setShowValidationHint(true);

                // Show appropriate message based on missing field
                let message = "Please complete all required fields before submitting.";
                
                // If it's a validation error, use the specific validation message
                if (missingField.validationError) {
                    message = missingField.validationError;
                    showError(message);
                } else if (missingField.field === 'image') {
                    message = "Please upload an equipment image before submitting.";
                    showWarning(message);
                } else {
                    // Create more specific messages for different fields
                    const fieldMessages = {
                        'name': 'Equipment name is required',
                        'serialNumber': 'Serial number is required',
                        'typeId': 'Equipment type selection is required',
                        'model': 'Model is required',
                        'brandId': 'Brand selection is required',
                        'manufactureYear': 'Manufacture year is required',
                        'purchasedDate': 'Purchase date is required',
                        'deliveredDate': 'Delivery date is required',
                        'egpPrice': 'EGP price is required',
                        'countryOfOrigin': 'Country of origin is required',
                        'shipping': 'Shipping cost is required',
                        'customs': 'Customs cost is required',
                        'taxes': 'Taxes amount is required',
                        'purchasedFrom': 'Purchased from merchant is required'
                    };

                    if (fieldMessages[missingField.field]) {
                        message = `${fieldMessages[missingField.field]}. Please fill this field to continue.`;
                    }
                    showWarning(message);
                }
            }

            return false;
        }

        return true;
    };

    // Parse backend error messages to be more user-friendly
    const parseErrorMessage = (error) => {
        const message = error?.response?.data?.message || error?.message || "An unexpected error occurred.";
        if (message.toLowerCase().includes("serial") && message.toLowerCase().includes("already") && message.toLowerCase().includes("exist")) {
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
        // Try to extract a user-friendly message from backend error
        if (error?.response?.data?.userMessage) {
            return error.response.data.userMessage;
        }
        return message;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) {
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const formDataToSend = new FormData();

            // Use 'typeId' and 'brandId' instead of 'type' and 'brand'
            formDataToSend.append('typeId', formData.typeId);
            formDataToSend.append('brandId', formData.brandId);

            // Add all required fields
            formDataToSend.append('name', formData.name);
            formDataToSend.append('model', formData.model);
            formDataToSend.append('serialNumber', formData.serialNumber);
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

            // Handle workedHours - send 0 if empty, null, undefined, or whitespace-only
            const workedHoursValue = formData.workedHours &&
            formData.workedHours !== "" &&
            formData.workedHours.toString().trim() !== ""
                ? formData.workedHours : 0;
            formDataToSend.append('workedHours', workedHoursValue);

            // Add optional fields with proper null checking
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
            } else {
                console.log(formDataToSend);
                // Create new equipment
                result = await equipmentService.addEquipment(formDataToSend);
            }

            // Upload documents after equipment is created/updated
            const equipmentId = equipmentToEdit ? equipmentToEdit.id : result.data.id;
            await uploadDocuments(equipmentId);

            if (equipmentToEdit) {
                showSuccess(`Equipment "${formData.name}" has been updated successfully`);
            } else {
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

    // Upload documents for all field types
    const uploadDocuments = async (equipmentId) => {
        try {
            const fieldTypes = ['SHIPPING', 'CUSTOMS', 'TAXES'];

            for (const fieldType of fieldTypes) {
                const documents = documentsByFieldType[fieldType] || [];

                for (const document of documents) {
                    // Only upload new documents (those with file property)
                    if (document.isNew && document.file) {
                        try {
                            const documentData = {
                                name: document.documentName,
                                type: document.documentType,
                                file: document.file
                            };

                            await documentService.create('equipment', equipmentId, documentData);
                        } catch (error) {
                            console.error(`Error uploading ${fieldType} document:`, error);
                            // Continue with other documents even if one fails
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error uploading documents:', error);
            // Don't throw error as this is not critical to equipment creation
        }
    };

    const handleNextTab = () => {
        if (tabIndex < tabs.length - 1) {
            setTabIndex(tabIndex + 1);
            // Scroll to top will be handled by useEffect
        }
    };

    // Brand creation functions
    const handleBrandChange = (e) => {
        const { value } = e.target;
        if (value === 'add_new') {
            setShowBrandModal(true);
        } else {
            handleInputChange(e);
        }
    };

    const handleNewBrandInputChange = (e) => {
        const { name, value } = e.target;
        setNewBrandData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleCreateBrand = async (e) => {
        e.preventDefault();
        if (!newBrandData.name.trim()) {
            showError('Brand name is required');
            return;
        }

        setCreatingBrand(true);
        try {
            const response = await equipmentBrandService.createEquipmentBrand(newBrandData);
            const newBrand = response.data;

            // Add the new brand to the list
            setEquipmentBrands(prev => [...prev, newBrand]);

            // Automatically select the newly created brand
            setFormData(prev => ({
                ...prev,
                brandId: newBrand.id
            }));

            // Close the modal and reset form
            setShowBrandModal(false);
            setNewBrandData({ name: '', description: '' });
            showSuccess(`Brand "${newBrand.name}" created successfully and selected`);
        } catch (error) {
            console.error('Error creating brand:', error);
            
            // Handle specific error cases
            if (error.response?.status === 409) {
                // Check if it's our enhanced conflict response
                if (error.response.data?.conflictType) {
                    const { conflictType, resourceName, isInactive } = error.response.data;
                    if (isInactive) {
                        showError(`Equipment brand "${resourceName}" already exists but was previously deleted. Please contact your administrator to reactivate it, or choose a different name.`);
                    } else {
                        showError(`Equipment brand "${resourceName}" already exists. Please choose a different name.`);
                    }
                } else {
                    // Fallback for legacy error responses
                    if (error.response.data?.message?.includes('inactive') || error.response.data?.message?.includes('deleted')) {
                        showError(`Equipment brand "${newBrandData.name.trim()}" already exists but was previously deleted. Please contact your administrator to reactivate it, or choose a different name.`);
                    } else {
                        showError(`Equipment brand "${newBrandData.name.trim()}" already exists. Please choose a different name.`);
                    }
                }
            } else if (error.response?.status === 400) {
                const message = error.response.data?.message || 'Please check your input and try again';
                showError(`Brand name is invalid: ${message}`);
            } else if (error.response?.status === 403) {
                showError('You don\'t have permission to create equipment brands. Please contact your administrator.');
            } else {
                showError(`Failed to create brand: ${error.response?.data?.message || error.message}`);
            }
        } finally {
            setCreatingBrand(false);
        }
    };

    const handleCancelBrandCreation = () => {
        setShowBrandModal(false);
        setNewBrandData({ name: '', description: '' });
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

    const handleOverlayClick = (e) => {
        // Only close if clicking on the overlay itself, not on the modal content
        if (e.target === e.currentTarget) {
            if (formTouched) {
                showConfirmation(
                    "Are you sure you want to close? Any unsaved changes will be lost.",
                    onClose,
                    () => hideSnackbar()
                );
            } else {
                onClose();
            }
        }
    };

    return (
        <div className="equipment-modal-overlay" onClick={handleOverlayClick}>
            <div className="equipment-modal">
                <div className="equipment-modal-header">
                    <h2>{equipmentToEdit ? 'Edit Equipment' : 'Add New Equipment'}</h2>
                    <button className="btn-close" onClick={onClose} aria-label="Close">
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

                {/* Show validation error banner when there are field validation issues */}
                {Object.values(fieldValidation).some(field => !field.isValid) && (
                    <div className="equipment-validation-error-banner">
                        <FaExclamationCircle />
                        <div className="validation-error-content">
                            <strong>Validation Error</strong>
                            <p>Please fix the following issues before proceeding:</p>
                            <ul>
                                {Object.entries(fieldValidation)
                                    .filter(([_, field]) => !field.isValid)
                                    .map(([fieldName, field]) => (
                                        <li key={fieldName}>{field.message}</li>
                                    ))
                                }
                            </ul>
                        </div>
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
                    <div className="equipment-modal-content" ref={contentRef} onWheel={handleModalWheel}>
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
                                        className={!fieldValidation.serialNumber.isValid ? 'error' : ''}
                                        required
                                    />
                                    {!fieldValidation.serialNumber.isValid && (
                                        <div className="field-error">
                                            <FaExclamationCircle />
                                            <span>{fieldValidation.serialNumber.message}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="equipment-modal-form-row">
                                <div className="equipment-modal-form-group">
                                    <label htmlFor="brand" className="required-field">Brand</label>
                                    <select
                                        id="brandId"
                                        name="brandId"
                                        value={formData.brandId}
                                        onChange={handleBrandChange}
                                        required
                                    >
                                        <option value="">Select equipment brand</option>
                                        {equipmentBrands.map(brand => (
                                            <option key={brand.id} value={brand.id}>
                                                {brand.name}
                                            </option>
                                        ))}
                                        <option value="add_new" className="add-new-option">
                                            + Add New Brand
                                        </option>
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
                                        onChange={handleInputChange}
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
                                    <label htmlFor="status">Status</label>
                                    <select
                                        id="status"
                                        name="status"
                                        value={formData.status}
                                        onChange={handleInputChange}
                                    >
                                        {statusOptions.map(status => (
                                            <option key={status.value} value={status.value}>
                                                {status.label}
                                            </option>
                                        ))}
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
                                        onWheel={handleNumberInputWheel}
                                        className={!fieldValidation.manufactureYear.isValid ? 'error' : ''}
                                        min="1900"
                                        max={new Date().getFullYear()}
                                        required
                                    />
                                    {!fieldValidation.manufactureYear.isValid && (
                                        <div className="field-error">
                                            <FaExclamationCircle />
                                            <span>{fieldValidation.manufactureYear.message}</span>
                                        </div>
                                    )}
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
                                                <button
                                                    type="button"
                                                    className="remove-image-btn"
                                                    onClick={handleRemoveImage}
                                                    title="Remove image"
                                                >
                                                    <FaTimes />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    {!imageFile && !equipmentToEdit?.imageUrl && showValidationHint && !tabValidation[0] && (
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
                                    <input
                                        type="date"
                                        id="purchasedDate"
                                        name="purchasedDate"
                                        value={formData.purchasedDate}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </div>
                                <div className="equipment-modal-form-group">
                                    <label htmlFor="deliveredDate" className="required-field">Delivery Date</label>
                                    <input
                                        type="date"
                                        id="deliveredDate"
                                        name="deliveredDate"
                                        value={formData.deliveredDate}
                                        onChange={handleInputChange}
                                        required
                                    />
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
                                        onWheel={handleNumberInputWheel}
                                        className={!fieldValidation.egpPrice.isValid ? 'error' : ''}
                                        placeholder="Enter price in EGP"
                                        required
                                    />
                                    {!fieldValidation.egpPrice.isValid && (
                                        <div className="field-error">
                                            <FaExclamationCircle />
                                            <span>{fieldValidation.egpPrice.message}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="equipment-modal-form-group">
                                    <label htmlFor="dollarPrice">Price (USD)</label>
                                    <input
                                        type="text"
                                        id="dollarPrice"
                                        name="dollarPrice"
                                        value={displayValues.dollarPrice}
                                        onChange={handleInputChange}
                                        onWheel={handleNumberInputWheel}
                                        className={!fieldValidation.dollarPrice.isValid ? 'error' : ''}
                                        placeholder="Enter price in USD"
                                    />
                                    {!fieldValidation.dollarPrice.isValid && (
                                        <div className="field-error">
                                            <FaExclamationCircle />
                                            <span>{fieldValidation.dollarPrice.message}</span>
                                        </div>
                                    )}
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
                                        required
                                    />
                                </div>
                            </div>

                            <div className="equipment-modal-form-row">
                                <div className="equipment-modal-form-group">
                                    <label htmlFor="shipping" className="required-field">Shipping Cost (EGP)</label>
                                    <input
                                        type="text"
                                        id="shipping"
                                        name="shipping"
                                        value={displayValues.shipping}
                                        onChange={handleInputChange}
                                        onWheel={handleNumberInputWheel}
                                        className={!fieldValidation.shipping.isValid ? 'error' : ''}
                                        placeholder="Enter shipping cost"
                                        required
                                    />
                                    {!fieldValidation.shipping.isValid && (
                                        <div className="field-error">
                                            <FaExclamationCircle />
                                            <span>{fieldValidation.shipping.message}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="equipment-modal-form-group">
                                    <label htmlFor="customs" className="required-field">Customs Cost (EGP)</label>
                                    <input
                                        type="text"
                                        id="customs"
                                        name="customs"
                                        value={displayValues.customs}
                                        onChange={handleInputChange}
                                        onWheel={handleNumberInputWheel}
                                        className={!fieldValidation.customs.isValid ? 'error' : ''}
                                        placeholder="Enter customs cost"
                                        required
                                    />
                                    {!fieldValidation.customs.isValid && (
                                        <div className="field-error">
                                            <FaExclamationCircle />
                                            <span>{fieldValidation.customs.message}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="equipment-modal-form-row">
                                <div className="equipment-modal-form-group">
                                    <label htmlFor="taxes" className="required-field">Taxes Cost (EGP)</label>
                                    <input
                                        type="text"
                                        id="taxes"
                                        name="taxes"
                                        value={displayValues.taxes}
                                        onChange={handleInputChange}
                                        onWheel={handleNumberInputWheel}
                                        className={!fieldValidation.taxes.isValid ? 'error' : ''}
                                        placeholder="Enter taxes cost"
                                        required
                                    />
                                    {!fieldValidation.taxes.isValid && (
                                        <div className="field-error">
                                            <FaExclamationCircle />
                                            <span>{fieldValidation.taxes.message}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Document Attachments for Monetary Fields */}
                            <div className="monetary-documents-section">
                                <h3>Document Attachments</h3>
                                <div className="document-preview-grid">
                                    <DocumentUpload
                                        fieldType="SHIPPING"
                                        fieldLabel="Shipping Documents"
                                        onDocumentsChange={handleDocumentsChange}
                                        initialDocuments={documentsByFieldType.SHIPPING}
                                    />
                                    <DocumentUpload
                                        fieldType="CUSTOMS"
                                        fieldLabel="Customs Documents"
                                        onDocumentsChange={handleDocumentsChange}
                                        initialDocuments={documentsByFieldType.CUSTOMS}
                                    />
                                    <DocumentUpload
                                        fieldType="TAXES"
                                        fieldLabel="Tax Documents"
                                        onDocumentsChange={handleDocumentsChange}
                                        initialDocuments={documentsByFieldType.TAXES}
                                    />
                                </div>
                            </div>

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
                                        onWheel={handleNumberInputWheel}
                                        className={!fieldValidation.workedHours.isValid ? 'error' : ''}
                                        placeholder="Enter worked hours"
                                    />
                                    {!fieldValidation.workedHours.isValid && (
                                        <div className="field-error">
                                            <FaExclamationCircle />
                                            <span>{fieldValidation.workedHours.message}</span>
                                        </div>
                                    )}
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
                                title={!formValid ? "Please complete all required fields before submitting" : ""}
                            >
                                {loading ? 'Saving...' : equipmentToEdit ? 'Update Equipment' : 'Add Equipment'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {/* Brand Creation Modal */}
            {showBrandModal && (
                <div className="brand-modal-overlay" onClick={handleCancelBrandCreation}>
                    <div className="brand-modal-content" onClick={e => e.stopPropagation()}>
                        <div className="brand-modal-header">
                            <h3>Add New Equipment Brand</h3>
                            <button
                                className="brand-modal-close"
                                onClick={handleCancelBrandCreation}
                                disabled={creatingBrand}
                            >
                                <FaTimes />
                            </button>
                        </div>
                        <form onSubmit={handleCreateBrand}>
                            <div className="brand-modal-body">
                                <div className="form-group">
                                    <label htmlFor="brandName">Brand Name <span className="required-field">*</span></label>
                                    <input
                                        type="text"
                                        id="brandName"
                                        name="name"
                                        value={newBrandData.name}
                                        onChange={handleNewBrandInputChange}
                                        placeholder="Enter brand name"
                                        required
                                        disabled={creatingBrand}
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="brandDescription">Description</label>
                                    <textarea
                                        id="brandDescription"
                                        name="description"
                                        value={newBrandData.description}
                                        onChange={handleNewBrandInputChange}
                                        placeholder="Enter brand description (optional)"
                                        rows="3"
                                        disabled={creatingBrand}
                                    />
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button
                                    type="button"
                                    onClick={handleCancelBrandCreation}
                                    disabled={creatingBrand}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="brand-modal-submit"
                                    disabled={creatingBrand || !newBrandData.name.trim()}
                                >
                                    {creatingBrand ? 'Creating...' : 'Create Brand'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EquipmentModal;