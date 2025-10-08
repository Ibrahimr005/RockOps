import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './AllSites.css';
import { useAuth } from "../../../contexts/AuthContext";
import { useTranslation } from 'react-i18next';
import { FaBuilding, FaPlus, FaChevronDown } from 'react-icons/fa';
import { siteService } from "../../../services/siteService.js";
import { useSnackbar } from "../../../contexts/SnackbarContext.jsx";
import LoadingPage from "../../../components/common/LoadingPage/LoadingPage.jsx";
import UnifiedCard from "../../../components/common/UnifiedCard/UnifiedCard";
import PageHeader from "../../../components/common/PageHeader/PageHeader.jsx";

// Default placeholder for site image
const siteimg = "data:image/svg+xml,%3csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100' height='100' fill='%23ddd'/%3e%3ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='%23999'%3eSite%3c/text%3e%3c/svg%3e";
import siteimgg from "../../../assets/imgs/siteimgg.jpg"

const AllSites = () => {
    const { t } = useTranslation();
    const [sites, setSites] = useState([]);
    const [filteredSites, setFilteredSites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const { showError, showSuccess, showWarning } = useSnackbar();

    // Filter states
    const [showFilters, setShowFilters] = useState(false);
    const [selectedEmployeeRange, setSelectedEmployeeRange] = useState("");
    const [selectedEquipmentRange, setSelectedEquipmentRange] = useState("");
    const [selectedWarehouseRange, setSelectedWarehouseRange] = useState("");
    const [selectedMerchantRange, setSelectedMerchantRange] = useState("");

    // Modal states and data
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [partners, setPartners] = useState([]);
    const [selectedPartners, setSelectedPartners] = useState([]);
    const [selectedPartnerIds, setSelectedPartnerIds] = useState([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [editingSite, setEditingSite] = useState(null);
    const [formData, setFormData] = useState({
        id: "",
        name: "",
        physicalAddress: "",
        companyAddress: "",
        creationDate: new Date().toISOString().split('T')[0],
        photo: null
    });

    const dropdownRef = useRef(null);
    const isSiteAdmin = currentUser?.role === "ADMIN";

    useEffect(() => {
        console.log("AllSites component mounted");
        fetchSites();
    }, []);

    // Fetch related data when modal opens
    useEffect(() => {
        if (showAddModal || showEditModal) {
            fetchPartners();
        }
    }, [showAddModal, showEditModal]);

    // Set form data when editing site
    useEffect(() => {
        if (editingSite) {
            console.log("Setting up form with editing site data:", editingSite);

            setFormData({
                id: editingSite.id,
                name: editingSite.name || "",
                physicalAddress: editingSite.physicalAddress || "",
                companyAddress: editingSite.companyAddress || "",
                creationDate: editingSite.creationDate || new Date().toISOString().split('T')[0],
                photo: null
            });

            // Set preview image if site has photo
            if (editingSite.photoUrl) {
                setPreviewImage(editingSite.photoUrl);
            } else if (editingSite.photo) {
                setPreviewImage(editingSite.photo);
            } else {
                setPreviewImage(null);
            }

            // Handle partners - check different possible property names
            // console.log("Checking for partners in editing site data");
            // if (editingSite.partners && editingSite.partners.length > 0) {
            //     console.log("Found partners in 'partners' property:", editingSite.partners);
            //     setSelectedPartners(editingSite.partners);
            //     setSelectedPartnerIds(editingSite.partners.map(partner => partner.id));
            // } else if (editingSite.sitePartners && editingSite.sitePartners.length > 0) {
            //     console.log("Found partners in 'sitePartners' property:", editingSite.sitePartners);
            //     // The partners might be nested in a different structure
            //     // Check if there's a partner property in each item
            //     const partners = editingSite.sitePartners.map(sp => sp.partner || sp);
            //     setSelectedPartners(partners);
            //     setSelectedPartnerIds(partners.map(partner => partner.id));
            // } else {
            //     console.log("No partners found in the site data");
            //     setSelectedPartners([]);
            //     setSelectedPartnerIds([]);
            // }
        }
    }, [editingSite]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Apply filters
    useEffect(() => {
        let result = [...sites];

        // Apply employee count filter
        if (selectedEmployeeRange) {
            const [min, max] = selectedEmployeeRange.split('-').map(Number);
            if (max) {
                result = result.filter(site => site.employeeCount >= min && site.employeeCount <= max);
            } else {
                result = result.filter(site => site.employeeCount >= min);
            }
        }

        // Apply equipment count filter
        if (selectedEquipmentRange) {
            const [min, max] = selectedEquipmentRange.split('-').map(Number);
            if (max) {
                result = result.filter(site => site.equipmentCount >= min && site.equipmentCount <= max);
            } else {
                result = result.filter(site => site.equipmentCount >= min);
            }
        }

        // Apply warehouse count filter
        if (selectedWarehouseRange) {
            const [min, max] = selectedWarehouseRange.split('-').map(Number);
            if (max) {
                result = result.filter(site => site.warehouseCount >= min && site.warehouseCount <= max);
            } else {
                result = result.filter(site => site.warehouseCount >= min);
            }
        }

        // Apply merchant count filter
        if (selectedMerchantRange) {
            const [min, max] = selectedMerchantRange.split('-').map(Number);
            if (max) {
                result = result.filter(site => site.merchantCount >= min && site.merchantCount <= max);
            } else {
                result = result.filter(site => site.merchantCount >= min);
            }
        }

        setFilteredSites(result);
    }, [sites, selectedEmployeeRange, selectedEquipmentRange, selectedWarehouseRange, selectedMerchantRange]);

    const fetchSites = async () => {
        try {
            setLoading(true);
            const response = await siteService.getAll();
            console.log("Sites fetched from service:", response.data);
            response.data.forEach((site, index) => {
                console.log(`Site ${index} photoUrl:`, site.photoUrl);
            });

            if (response.data.length > 0) {
                console.log("First site structure:", Object.keys(response.data[0]));
                console.log("First site full object:", response.data[0]);
                console.log("FULL SITE DATA FOR COUNTING:", JSON.stringify(response.data[0], null, 2)); // Add this line
            }
            setSites(response.data);
            setFilteredSites(response.data);
            setError(null);
        } catch (err) {
            const errorMessage = t('common.error') + ': ' + err.message;
            setError(errorMessage);
            showError("Failed to fetch sites. Please try again.");
            console.error("Error fetching sites:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchPartners = async () => {
        try {
            const response = await siteService.getAllPartners();
            setPartners(response.data);
        } catch (error) {
            showError("Failed to fetch partners.");
            console.error("Error fetching partners:", error);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData({ ...formData, photo: file });
            setPreviewImage(URL.createObjectURL(file));
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const toggleDropdown = () => {
        setIsDropdownOpen(!isDropdownOpen);
    };

    const handleSelectPartner = (partner) => {
        // Check if partner is already selected
        if (!selectedPartnerIds.includes(partner.id)) {
            setSelectedPartners([...selectedPartners, partner]);
            setSelectedPartnerIds([...selectedPartnerIds, partner.id]);
        }
        setIsDropdownOpen(false);
    };

    const handleRemovePartner = (partnerId) => {
        setSelectedPartners(selectedPartners.filter(partner => partner.id !== partnerId));
        setSelectedPartnerIds(selectedPartnerIds.filter(id => id !== partnerId));
    };

    const handleOpenAddModal = () => {
        // Reset form data for adding new site
        setFormData({
            id: "",
            name: "",
            physicalAddress: "",
            companyAddress: "",
            creationDate: new Date().toISOString().split('T')[0],
            photo: null
        });
        setPreviewImage(null);
        // setSelectedPartners([]);
        // setSelectedPartnerIds([]);
        setShowAddModal(true);
    };

    // Debug function to help identify site structure
    const debugSiteObject = (site) => {
        console.log("Full site object:", site);
        // List all top-level keys
        console.log("Site object keys:", Object.keys(site));

        // Check for different possible partner structures
        if (site.partners) {
            console.log("Partners property exists:", site.partners);
            if (Array.isArray(site.partners)) {
                console.log("Partners is an array with", site.partners.length, "items");
                if (site.partners.length > 0) {
                    console.log("First partner:", site.partners[0]);
                }
            } else {
                console.log("Partners is not an array, but:", typeof site.partners);
            }
        }

        if (site.sitePartners) {
            console.log("sitePartners property exists:", site.sitePartners);
            if (Array.isArray(site.sitePartners)) {
                console.log("sitePartners is an array with", site.sitePartners.length, "items");
                if (site.sitePartners.length > 0) {
                    console.log("First sitePartner:", site.sitePartners[0]);
                }
            }
        }
    };

    const fetchSite = async (siteId) => {
        try {
            const siteResponse = await siteService.getById(siteId);
            const siteData = siteResponse.data;
            console.log("Raw response from API:", siteData);

            try {
                // Try fetching partners specifically for this site
                const partnersResponse = await siteService.getSitePartners(siteId);
                console.log("Site partners fetched separately:", partnersResponse.data);
                // Add the partners to the site data
                siteData.partners = partnersResponse.data;
            } catch (partnerErr) {
                showWarning("Could not fetch site partners separately");
                console.warn("Could not fetch site partners separately:", partnerErr.message);
                // Continue with the basic site data even if partners fetch fails
            }

            // Debug what we found
            debugSiteObject(siteData);

            return siteData;
        } catch (err) {
            console.error("Error fetching site details:", err.message);
            throw err;
        }
    };

    const handleOpenEditModal = async (site) => {
        try {
            // Reset states before loading new data
            // setSelectedPartners([]);
            // setSelectedPartnerIds([]);
            setPreviewImage(null);

            // Get detailed site info
            const siteDetails = await fetchSite(site.id);
            console.log("Fetched site details for editing:", siteDetails);

            // Set the editing site with complete details
            setEditingSite(siteDetails);
            setShowEditModal(true);
        } catch (err) {
            showError("Error fetching site details. Using basic site data.");
            console.error("Error fetching site details:", err.message);
            // Fall back to using the basic site data if detailed fetch fails
            setEditingSite(site);
            setShowEditModal(true);
        }
    };

    const handleCloseModals = () => {
        setShowAddModal(false);
        setShowEditModal(false);
        setEditingSite(null);
        setPreviewImage(null);
        // setSelectedPartners([]);
        // setSelectedPartnerIds([]);
        setFormData({
            id: "",
            name: "",
            physicalAddress: "",
            companyAddress: "",
            creationDate: new Date().toISOString().split('T')[0],
            photo: null
        });
    };

    const handleAddSite = async (e) => {
        e.preventDefault();

        const formDataToSend = new FormData();

        // Create site data object
        const siteData = {
            name: formData.name,
            physicalAddress: formData.physicalAddress,
            companyAddress: formData.companyAddress,
            creationDate: formData.creationDate,
            // partnerIds: selectedPartnerIds.map(id => parseInt(id, 10)),
        };

        formDataToSend.append("siteData", JSON.stringify(siteData));

        // Add photo if selected
        if (formData.photo) {
            formDataToSend.append("photo", formData.photo);
        }

        try {
            await siteService.addSite(formDataToSend);
            // Refresh site list and close modal
            fetchSites();
            handleCloseModals();
            showSuccess("Site added successfully!");
        } catch (err) {
            console.error("Failed to add site:", err.message);
            showError("Failed to add site. Please try again.");
        }
    };

    const handleUpdateSite = async (e) => {
        e.preventDefault();

        const formDataToSend = new FormData();

        // Create site data object WITHOUT id in the JSON
        // The ID should only be in the URL, not in the request body based on the error
        const siteData = {
            name: formData.name,
            physicalAddress: formData.physicalAddress,
            companyAddress: formData.companyAddress,
            creationDate: formData.creationDate,
            // partnerIds: selectedPartnerIds.map(id => parseInt(id, 10)),
        };

        // First, log what we're sending to help debug
        console.log("Updating site with data:", siteData);
        console.log("Site ID for URL:", formData.id);

        formDataToSend.append("siteData", JSON.stringify(siteData));

        // Add photo if selected
        if (formData.photo) {
            formDataToSend.append("photo", formData.photo);
        }

        try {
            // Check if we have a valid ID
            if (!formData.id) {
                throw new Error("Missing site ID for update");
            }

            await siteService.updateSite(formData.id, formDataToSend);
            // Refresh site list and close modal
            fetchSites();
            handleCloseModals();
            showSuccess("Site updated successfully!");
        } catch (err) {
            console.error("Failed to update site:", err);
            showError(`Failed to update site: ${err.message}`);
        }
    };

    const handleOverlayClick = (e) => {
        // Only close if clicking on the overlay itself, not on the modal content
        if (e.target === e.currentTarget) {
            handleCloseModals();
        }
    };

    const handleResetFilters = () => {
        setSelectedEmployeeRange("");
        setSelectedEquipmentRange("");
        setSelectedWarehouseRange("");
        setSelectedMerchantRange("");
    };

    const getActiveFilterCount = () => {
        let count = 0;
        if (selectedEmployeeRange) count++;
        if (selectedEquipmentRange) count++;
        if (selectedWarehouseRange) count++;
        if (selectedMerchantRange) count++;
        return count;
    };

    if (loading) return <LoadingPage />;
    if (error) return <div className="error-container">{error}</div>;

    return (
        <div className="sites-container">
            <PageHeader
                title="Sites"
                subtitle="Manage and monitor all operational sites across your organization"
                filterButton={{
                    onClick: () => setShowFilters(!showFilters),
                    isActive: showFilters
                }}
                actionButton={isSiteAdmin ? {
                    text: t('site.addSite'),
                    icon: <FaPlus />,
                    onClick: handleOpenAddModal,
                    disabled: loading
                } : null}
            />

            {/* Filter Panel */}
            {showFilters && (
                <div className="page-header__filter-panel">
                    <div className="page-header__filter-header">
                        <h4>Filter Sites</h4>
                        <div className="filter-actions">
                            <button
                                className="filter-reset-btn"
                                onClick={handleResetFilters}
                                disabled={getActiveFilterCount() === 0}
                            >
                                Clear All
                            </button>
                            <button
                                className={`filter-collapse-btn ${showFilters ? '' : 'collapsed'}`}
                                onClick={() => setShowFilters(!showFilters)}
                            >
                                <FaChevronDown />
                            </button>
                        </div>
                    </div>

                    <div className="page-header__filter-list">
                        <div className="page-header__filter-item">
                            <label>Employee Count</label>
                            <select
                                value={selectedEmployeeRange}
                                onChange={(e) => setSelectedEmployeeRange(e.target.value)}
                            >
                                <option value="">All Ranges</option>
                                <option value="0-10">0-10</option>
                                <option value="11-50">11-50</option>
                                <option value="51-100">51-100</option>
                                <option value="101-500">101-500</option>
                                <option value="501">500+</option>
                            </select>
                        </div>

                        <div className="page-header__filter-item">
                            <label>Equipment Count</label>
                            <select
                                value={selectedEquipmentRange}
                                onChange={(e) => setSelectedEquipmentRange(e.target.value)}
                            >
                                <option value="">All Ranges</option>
                                <option value="0-5">0-5</option>
                                <option value="6-20">6-20</option>
                                <option value="21-50">21-50</option>
                                <option value="51-100">51-100</option>
                                <option value="101">100+</option>
                            </select>
                        </div>

                        <div className="page-header__filter-item">
                            <label>Warehouse Count</label>
                            <select
                                value={selectedWarehouseRange}
                                onChange={(e) => setSelectedWarehouseRange(e.target.value)}
                            >
                                <option value="">All Ranges</option>
                                <option value="0-2">0-2</option>
                                <option value="3-5">3-5</option>
                                <option value="6-10">6-10</option>
                                <option value="11">10+</option>
                            </select>
                        </div>

                        <div className="page-header__filter-item">
                            <label>Merchant Count</label>
                            <select
                                value={selectedMerchantRange}
                                onChange={(e) => setSelectedMerchantRange(e.target.value)}
                            >
                                <option value="">All Ranges</option>
                                <option value="0-5">0-5</option>
                                <option value="6-20">6-20</option>
                                <option value="21-50">21-50</option>
                                <option value="51">50+</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}

            <div className="unified-cards-grid">
                {filteredSites.length > 0 ? (
                    filteredSites.map((site) => (
                        <UnifiedCard
                            key={site.id}
                            id={site.id}
                            title={site.name || t('common.noData')}
                            imageUrl={site?.photoUrl}
                            imageFallback={siteimgg}
                            stats={[
                                {
                                    label: t('hr.dashboard.employees'),
                                    value: site.employeeCount || 0
                                },
                                {
                                    label: t('equipment.equipment'),
                                    value: site.equipmentCount || 0
                                },
                                {
                                    label: t('warehouse.warehouses'),
                                    value: site.warehouseCount || 0
                                },
                                {
                                    label: 'Merchants',
                                    value: site.merchantCount || 0
                                }
                            ]}
                            actions={[
                                ...(isSiteAdmin ? [{
                                    label: t('site.editSite'),
                                    variant: 'secondary',
                                    onClick: (id) => handleOpenEditModal(site)
                                }] : []),
                                {
                                    label: t('common.details'),
                                    variant: 'primary',
                                    onClick: (id) => navigate(`/sites/details/${id}`)
                                }
                            ]}
                            onClick={(id) => navigate(`/sites/details/${id}`)}
                        />
                    ))
                ) : (
                    <UnifiedCard
                        isEmpty={true}
                        emptyIcon={FaBuilding}
                        emptyMessage="No sites found. Try adjusting your search filters or add a new site"
                    />
                )}
            </div>

            {/* Add Site Modal */}
            {showAddModal && (
                <div className="site-modal-overlay" onClick={handleOverlayClick}>
                    <div className="site-modal-content">
                        <div className="site-modal-header">
                            <h2>{t('site.addSite')}</h2>
                            <button className="site-modal-close-button" onClick={handleCloseModals}>×</button>
                        </div>

                        <div className="site-modal-body">
                            <div className="site-form-container">
                                <div className="site-form-card">
                                    <div className="site-profile-section">
                                        <label htmlFor="siteImageUpload" className="site-image-upload-label">
                                            {previewImage ? (
                                                <img src={previewImage} alt="Site" className="site-image-preview" />
                                            ) : (
                                                <div className="site-image-placeholder"></div>
                                            )}
                                            <span className="site-upload-text">{t('common.uploadPhoto')}</span>
                                        </label>
                                        <input
                                            type="file"
                                            id="siteImageUpload"
                                            name="photo"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            style={{ display: "none" }}
                                        />
                                    </div>

                                    <div className="site-form-fields-section">
                                        <form onSubmit={handleAddSite}>
                                            <div className="site-form-grid">
                                                <div className="site-form-group">
                                                    <label>{t('site.siteName')} <span className="required-asterisk">*</span></label>
                                                    <input
                                                        type="text"
                                                        name="name"
                                                        value={formData.name}
                                                        onChange={handleInputChange}
                                                        required
                                                    />
                                                </div>

                                                <div className="site-form-group">
                                                    <label>{t('site.physicalAddress')} <span className="required-asterisk">*</span></label>
                                                    <input
                                                        type="text"
                                                        name="physicalAddress"
                                                        value={formData.physicalAddress}
                                                        onChange={handleInputChange}
                                                        required
                                                    />
                                                </div>

                                                <div className="site-form-group">
                                                    <label>{t('site.companyAddress')} <span className="required-asterisk">*</span></label>
                                                    <input
                                                        type="text"
                                                        name="companyAddress"
                                                        value={formData.companyAddress}
                                                        onChange={handleInputChange}
                                                        required
                                                    />
                                                </div>

                                                <div className="site-form-group">
                                                    <label>{t('site.creationDate')} <span className="required-asterisk">*</span></label>
                                                    <input
                                                        type="date"
                                                        name="creationDate"
                                                        value={formData.creationDate}
                                                        onChange={handleInputChange}
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            {/* Partners section - commented out but with updated class names */}
                                            {/*<div className="site-form-group site-partners-section">*/}
                                            {/*    <label>{t('site.partners')}</label>*/}
                                            {/*    <div className="site-partners-dropdown" ref={dropdownRef}>*/}
                                            {/*        <div className="site-dropdown-header" onClick={toggleDropdown}>*/}
                                            {/*            <span>{t('site.selectPartners')}</span>*/}
                                            {/*            <span className={`site-dropdown-icon ${isDropdownOpen ? 'open' : ''}`}>▼</span>*/}
                                            {/*        </div>*/}

                                            {/*        {isDropdownOpen && (*/}
                                            {/*            <div className="site-dropdown-menu">*/}
                                            {/*                {partners*/}
                                            {/*                    .filter(partner => !selectedPartnerIds.includes(partner.id))*/}
                                            {/*                    .map(partner => (*/}
                                            {/*                        <div*/}
                                            {/*                            key={partner.id}*/}
                                            {/*                            className="site-dropdown-item"*/}
                                            {/*                            onClick={() => handleSelectPartner(partner)}*/}
                                            {/*                        >*/}
                                            {/*                            {partner.firstName} {partner.lastName}*/}
                                            {/*                        </div>*/}
                                            {/*                    ))}*/}
                                            {/*                {partners.filter(partner => !selectedPartnerIds.includes(partner.id)).length === 0 && (*/}
                                            {/*                    <div className="site-dropdown-item">{t('site.noPartnersAvailable')}</div>*/}
                                            {/*                )}*/}
                                            {/*            </div>*/}
                                            {/*        )}*/}
                                            {/*    </div>*/}

                                            {/*    {selectedPartners.length > 0 && (*/}
                                            {/*        <div className="site-partners-list">*/}
                                            {/*            {selectedPartners.map(partner => (*/}
                                            {/*                <div key={partner.id} className="site-partner-chip">*/}
                                            {/*                    <span>{partner.firstName} {partner.lastName}</span>*/}
                                            {/*                    <span*/}
                                            {/*                        className="site-remove-partner"*/}
                                            {/*                        onClick={() => handleRemovePartner(partner.id)}*/}
                                            {/*                    >*/}
                                            {/*                        ×*/}
                                            {/*                    </span>*/}
                                            {/*                </div>*/}
                                            {/*            ))}*/}
                                            {/*        </div>*/}
                                            {/*    )}*/}
                                            {/*</div>*/}

                                            <div className="site-form-actions">
                                                <button type="button" className="site-cancel-button" onClick={handleCloseModals}>{t('common.cancel')}</button>
                                                <button type="submit" className="site-submit-button">{t('site.addSite')}</button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Site Modal */}
            {showEditModal && (
                <div className="site-modal-overlay" onClick={handleOverlayClick}>
                    <div className="site-modal-content">
                        <div className="site-modal-header">
                            <h2>{t('site.editSite')}</h2>
                            <button className="site-modal-close-button" onClick={handleCloseModals}>×</button>
                        </div>

                        <div className="site-modal-body">
                            <div className="site-form-container">
                                <div className="site-form-card">
                                    <div className="site-profile-section">
                                        <label htmlFor="siteEditImageUpload" className="site-image-upload-label">
                                            {previewImage ? (
                                                <img src={previewImage} alt="Site" className="site-image-preview" />
                                            ) : (
                                                <div className="site-image-placeholder"></div>
                                            )}
                                            <span className="site-upload-text">{t('common.uploadPhoto')}</span>
                                        </label>
                                        <input
                                            type="file"
                                            id="siteEditImageUpload"
                                            name="photo"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            style={{ display: "none" }}
                                        />
                                    </div>

                                    <div className="site-form-fields-section">
                                        <form onSubmit={handleUpdateSite}>
                                            <input type="hidden" name="id" value={formData.id} />
                                            <div className="site-form-grid">
                                                <div className="site-form-group">
                                                    <label>{t('site.siteName')}</label>
                                                    <input
                                                        type="text"
                                                        name="name"
                                                        value={formData.name}
                                                        onChange={handleInputChange}
                                                        required
                                                    />
                                                </div>

                                                <div className="site-form-group">
                                                    <label>{t('site.physicalAddress')}</label>
                                                    <input
                                                        type="text"
                                                        name="physicalAddress"
                                                        value={formData.physicalAddress}
                                                        onChange={handleInputChange}
                                                        required
                                                    />
                                                </div>

                                                <div className="site-form-group">
                                                    <label>{t('site.companyAddress')}</label>
                                                    <input
                                                        type="text"
                                                        name="companyAddress"
                                                        value={formData.companyAddress}
                                                        onChange={handleInputChange}
                                                        required
                                                    />
                                                </div>

                                                <div className="site-form-group">
                                                    <label>{t('site.creationDate')}</label>
                                                    <input
                                                        type="date"
                                                        name="creationDate"
                                                        value={formData.creationDate}
                                                        onChange={handleInputChange}
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            {/* Partners section - commented out but with updated class names */}
                                            {/*<div className="site-form-group site-partners-section">*/}
                                            {/*    <label>{t('site.partners')}</label>*/}
                                            {/*    <div className="site-partners-dropdown" ref={dropdownRef}>*/}
                                            {/*        <div className="site-dropdown-header" onClick={toggleDropdown}>*/}
                                            {/*            <span>{t('site.selectPartners')}</span>*/}
                                            {/*            <span className={`site-dropdown-icon ${isDropdownOpen ? 'open' : ''}`}>▼</span>*/}
                                            {/*        </div>*/}

                                            {/*        {isDropdownOpen && (*/}
                                            {/*            <div className="site-dropdown-menu">*/}
                                            {/*                {partners*/}
                                            {/*                    .filter(partner => !selectedPartnerIds.includes(partner.id))*/}
                                            {/*                    .map(partner => (*/}
                                            {/*                        <div*/}
                                            {/*                            key={partner.id}*/}
                                            {/*                            className="site-dropdown-item"*/}
                                            {/*                            onClick={() => handleSelectPartner(partner)}*/}
                                            {/*                        >*/}
                                            {/*                            {partner.firstName} {partner.lastName}*/}
                                            {/*                        </div>*/}
                                            {/*                    ))}*/}
                                            {/*                {partners.filter(partner => !selectedPartnerIds.includes(partner.id)).length === 0 && (*/}
                                            {/*                    <div className="site-dropdown-item">{t('site.noPartnersAvailable')}</div>*/}
                                            {/*                )}*/}
                                            {/*            </div>*/}
                                            {/*        )}*/}
                                            {/*    </div>*/}

                                            {/*    {selectedPartners.length > 0 && (*/}
                                            {/*        <div className="site-partners-list">*/}
                                            {/*            {selectedPartners.map(partner => (*/}
                                            {/*                <div key={partner.id} className="site-partner-chip">*/}
                                            {/*                    <span>{partner.firstName} {partner.lastName}</span>*/}
                                            {/*                    <span*/}
                                            {/*                        className="site-remove-partner"*/}
                                            {/*                        onClick={() => handleRemovePartner(partner.id)}*/}
                                            {/*                    >*/}
                                            {/*                        ×*/}
                                            {/*                    </span>*/}
                                            {/*                </div>*/}
                                            {/*            ))}*/}
                                            {/*        </div>*/}
                                            {/*    )}*/}
                                            {/*</div>*/}

                                            <div className="site-form-actions">
                                                <button type="button" className="site-cancel-button" onClick={handleCloseModals}>{t('common.cancel')}</button>
                                                <button type="submit" className="site-submit-button site-save-button">{t('common.save')}</button>

                                            </div>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AllSites;