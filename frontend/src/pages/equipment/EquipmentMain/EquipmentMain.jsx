import React, { useState, useEffect,useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FaPlus, FaFilter, FaSearch, FaExclamationCircle, FaChevronDown } from "react-icons/fa";
import EquipmentModal from "./components/EquipmentModal/EquipmentModal.jsx";
import IntroCard from "../../../components/common/IntroCard/IntroCard.jsx";
import UnifiedCard from "../../../components/common/UnifiedCard/UnifiedCard";
import "./EquipmentMain.scss";
import excavatorBlack from "../../../assets/logos/excavator-svgrepo-com black.svg";
import excavatorWhite from "../../../assets/logos/excavator-svgrepo-com.svg";
import { equipmentService } from "../../../services/equipmentService";
import { useAuth } from "../../../contexts/AuthContext";
import { useEquipmentPermissions } from "../../../utils/rbac";
import LoadingPage from "../../../components/common/LoadingPage/LoadingPage";
import PageHeader from "../../../components/common/PageHeader/index.js";

import { FaTools } from 'react-icons/fa';

// Default placeholder for equipment image
const equipmentPlaceholder = "data:image/svg+xml,%3csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100' height='100' fill='%23ddd'/%3e%3ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='%23999'%3eEquipment%3c/text%3e%3c/svg%3e";
import equipmentimg from "../../../assets/imgs/equipmentimg.jpg"

const EquipmentMain = () => {
    const [equipmentData, setEquipmentData] = useState([]);
    const [filteredEquipment, setFilteredEquipment] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [showFilters, setShowFilters] = useState(false);
    const [equipmentTypes, setEquipmentTypes] = useState([]);
    const [equipmentBrands, setEquipmentBrands] = useState([]);
    const [sites, setSites] = useState([]);
    const [statusOptions, setStatusOptions] = useState([]);
    const [selectedType, setSelectedType] = useState("");
    const [selectedBrand, setSelectedBrand] = useState("");
    const [selectedSite, setSelectedSite] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("");
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [equipmentToEdit, setEquipmentToEdit] = useState(null);

    const equipmentCardsRefs = useRef([]);
    const actionsSetFlags = useRef({});

    // Get authentication context and permissions
    const auth = useAuth();
    const permissions = useEquipmentPermissions(auth);
    const navigate = useNavigate();

    // Function to refresh presigned URL for equipment image
    const handleImageRefresh = async (equipmentId) => {
        try {
            console.log(`Refreshing presigned URL for equipment ${equipmentId}`);
            const response = await equipmentService.refreshEquipmentMainPhoto(equipmentId);
            return response.data;
        } catch (error) {
            console.error(`Error refreshing image URL for equipment ${equipmentId}:`, error);
            return null;
        }
    };

    // Fetch equipment data
    const fetchEquipmentData = async () => {
        try {
            setLoading(true);
            const response = await equipmentService.getAllEquipment();

            if (Array.isArray(response.data)) {
                // Add this console.log
                console.log("First equipment object:", response.data[0]);
                console.log("Full equipment structure:", JSON.stringify(response.data[0], null, 2));

                setEquipmentData(response.data);
                setFilteredEquipment(response.data);
            } else {
                console.error("Expected array data, received:", typeof response.data);
                setError("Invalid data format received from server");
            }
        } catch (error) {
            console.error("Error fetching equipment data:", error);
            setError(error.message || "Failed to load equipment data");
        } finally {
            setLoading(false);
        }
    };

    // Fetch equipment types and brands
    const fetchReferenceLists = async () => {
        try {
            // Fetch equipment types
            const typesResponse = await equipmentService.getAllEquipmentTypes();
            if (Array.isArray(typesResponse.data)) {
                setEquipmentTypes(typesResponse.data);
            }

            // Fetch equipment brands
            const brandsResponse = await equipmentService.getAllEquipmentBrands();
            if (Array.isArray(brandsResponse.data)) {
                setEquipmentBrands(brandsResponse.data);
            }

            // Fetch sites
            const sitesResponse = await equipmentService.getAllSites();
            if (Array.isArray(sitesResponse.data)) {
                setSites(sitesResponse.data);
            }

            // Fetch equipment status options
            const statusResponse = await equipmentService.getEquipmentStatusOptions();
            if (Array.isArray(statusResponse.data)) {
                setStatusOptions(statusResponse.data);
            }
        } catch (error) {
            console.error("Error fetching reference data:", error);
        }
    };

    useEffect(() => {
        fetchEquipmentData();
        fetchReferenceLists();
    }, []);

    // Update equipment cards when data is available
    useEffect(() => {
        if (!Array.isArray(filteredEquipment) || filteredEquipment.length === 0) return;

        // Reset the actions set flags when equipment data changes
        actionsSetFlags.current = {};

        // Make sure refs array is the right size
        if (equipmentCardsRefs.current.length !== filteredEquipment.length) {
            equipmentCardsRefs.current = Array(filteredEquipment.length).fill(null);
        }

        filteredEquipment.forEach((data, index) => {
            if (equipmentCardsRefs.current[index]) {
                // Extract data directly from the DTO
                console.log();
                // Use only the equipment name for display
                const displayName = data.name || 'Unknown Equipment';
                const siteName = data.siteName ? data.siteName : 'No Site Assigned';
                const status = data.status || 'Unknown';
                const driverName = data.mainDriverName ? data.mainDriverName : 'No Driver ';
                const imageUrl = data.imageUrl || null;
                const equipmentId = data.id;

                // Update the card with equipment data
                equipmentCardsRefs.current[index].updateEquipmentCard(
                    displayName, siteName, status, driverName, imageUrl, equipmentId
                );
            }
        });
    }, [filteredEquipment]);

    // Filter equipment based on search and filter criteria
    useEffect(() => {
        let result = [...equipmentData];

        // Apply search filter
        if (searchTerm) {
            const lowerCaseSearch = searchTerm.toLowerCase();
            result = result.filter(item =>
                (item.name && item.name.toLowerCase().includes(lowerCaseSearch)) ||
                (item.model && item.model.toLowerCase().includes(lowerCaseSearch)) ||
                (item.brand && item.brand.toLowerCase().includes(lowerCaseSearch)) ||
                (item.serialNumber && item.serialNumber.toLowerCase().includes(lowerCaseSearch))
            );
        }

        // Apply type, brand, site and status filters
        if (selectedType) {
            const typeId = isNaN(selectedType) ? selectedType : Number(selectedType);
            result = result.filter(item => item.typeId === typeId);
        }
        if (selectedBrand) {
            const brandId = isNaN(selectedBrand) ? selectedBrand : Number(selectedBrand);
            result = result.filter(item => item.brandId === brandId);
        }
        if (selectedSite) {
            const siteId = isNaN(selectedSite) ? selectedSite : Number(selectedSite);
            result = result.filter(item => item.siteId === siteId);
        }
        if (selectedStatus) {
            result = result.filter(item => item.status === selectedStatus);
        }

        setFilteredEquipment(result);
    }, [equipmentData, searchTerm, selectedType, selectedBrand, selectedSite, selectedStatus]);

    const handleAddEquipment = () => {
        setEquipmentToEdit(null);
        setIsModalOpen(true);
    };

    const handleEditEquipment = (equipmentId) => {
        const equipmentToEdit = equipmentData.find(item => item.id === equipmentId);
        if (equipmentToEdit) {
            setEquipmentToEdit(equipmentToEdit);
            setIsModalOpen(true);
        }
    };

    const handleSaveEquipment = (savedEquipment) => {
        setNotificationMessage(
            equipmentToEdit
                ? `Equipment "${savedEquipment.name}" was updated successfully!`
                : `Equipment "${savedEquipment.name}" was added successfully!`
        );
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 3000);
        fetchEquipmentData();
    };

    const handleResetFilters = () => {
        setSelectedType("");
        setSelectedBrand("");
        setSelectedSite("");
        setSelectedStatus("");
        setSearchTerm("");
    };

    const toggleFilters = () => {
        setShowFilters(!showFilters);
    };

    const getActiveFilterCount = () => {
        let count = 0;
        if (selectedType) count++;
        if (selectedBrand) count++;
        if (selectedSite) count++;
        if (selectedStatus) count++;
        return count;
    };

    // Helper function to get status class
    const getStatusClass = (status) => {
        const statusMap = {
            'RUNNING': 'status-running',
            'AVAILABLE': 'status-available',
            'IN_USE': 'status-in-use',
            'RENTED': 'status-rented',
            'MAINTENANCE': 'status-maintenance',
            'UNAVAILABLE': 'status-unavailable',
            'SOLD': 'status-sold',
            'SCRAPPED': 'status-scrapped'
        };
        return statusMap[status] || '';
    };

    // Helper function to format status for display
    const formatStatus = (status) => {
        if (!status) return 'Unknown';
        return status.replace(/_/g, ' ').toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    return (
        <main className="equipment-main-container">
            {/* Header area with stats */}
            {/*<IntroCard*/}
            {/*    title="Equipment"*/}
            {/*    label="EQUIPMENT MANAGEMENT"*/}
            {/*    lightModeImage={excavatorBlack}*/}
            {/*    darkModeImage={excavatorWhite}*/}
            {/*    stats={[*/}
            {/*        {*/}
            {/*            value: equipmentData.length,*/}
            {/*            label: "Total Equipment"*/}
            {/*        }*/}
            {/*    ]}*/}
            {/*    onInfoClick={() => {*/}
            {/*        // Handle info button click if needed*/}
            {/*        console.log("Equipment info clicked");*/}
            {/*    }}*/}
            {/*/>*/}
            <PageHeader
                title="Equipment"
                subtitle="View and manage all equipment in your fleet"
                filterButton={{
                    onClick: () => setShowFilters(!showFilters),
                    isActive: showFilters,
                    activeCount: getActiveFilterCount()
                }}
                actionButton={permissions.canCreate ? {
                    text: "Add Equipment",
                    icon: <FaPlus />,
                    onClick: handleAddEquipment,
                    disabled: loading
                } : null}
            />

            {/* Filter Panel */}
            {showFilters && (
                <div className="page-header__filter-panel">
                    <div className="page-header__filter-header">
                        <h4>Filter Equipment</h4>
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
                            <label>Equipment Type</label>
                            <select
                                value={selectedType}
                                onChange={(e) => setSelectedType(e.target.value)}
                            >
                                <option value="">All Types</option>
                                {equipmentTypes.map(type => (
                                    <option key={type.id} value={type.id}>{type.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="page-header__filter-item">
                            <label>Equipment Brand</label>
                            <select
                                value={selectedBrand}
                                onChange={(e) => setSelectedBrand(e.target.value)}
                            >
                                <option value="">All Brands</option>
                                {equipmentBrands.map(brand => (
                                    <option key={brand.id} value={brand.id}>{brand.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="page-header__filter-item">
                            <label>Site</label>
                            <select
                                value={selectedSite}
                                onChange={(e) => setSelectedSite(e.target.value)}
                            >
                                <option value="">All Sites</option>
                                {sites.map(site => (
                                    <option key={site.id} value={site.id}>{site.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="page-header__filter-item">
                            <label>Status</label>
                            <select
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value)}
                            >
                                <option value="">All Statuses</option>
                                {statusOptions.map(status => (
                                    <option key={status.value} value={status.value}>
                                        {status.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* Search and filter toolbar */}
            {/*<section className="equipment-toolbar">*/}
            {/*    <div className="equipment-toolbar-header">*/}
            {/*        <div className="equipment-search-section">*/}
            {/*            <div className="equipment-search-container">*/}
            {/*                <FaSearch className="equipment-search-icon" />*/}
            {/*                <input*/}
            {/*                    type="text"*/}
            {/*                    placeholder="Search equipment by name, model, brand, or serial number..."*/}
            {/*                    className="equipment-search-input"*/}
            {/*                    value={searchTerm}*/}
            {/*                    onChange={(e) => setSearchTerm(e.target.value)}*/}
            {/*                />*/}
            {/*            </div>*/}
            {/*        </div>*/}

            {/*        <div className="equipment-actions-section">*/}
            {/*            {permissions.canCreate && (*/}
            {/*                <button className="btn-primary" onClick={handleAddEquipment}>*/}
            {/*                    <FaPlus /> Add Equipment*/}
            {/*                </button>*/}
            {/*            )}*/}
            {/*        </div>*/}
            {/*    </div>*/}

            {/*    <div className="equipment-filters-section">*/}
            {/*        <div className="equipment-filters-header">*/}
            {/*            <button className="equipment-filter-toggle" onClick={toggleFilters}>*/}
            {/*                <FaFilter /> */}
            {/*                <span>Filters</span>*/}
            {/*                {showFilters && <span className="filter-count">({getActiveFilterCount()})</span>}*/}
            {/*            </button>*/}
            {/*        </div>*/}

            {/*        {showFilters && (*/}
            {/*            <div className="equipment-filters-panel">*/}
            {/*                <div className="equipment-filter-controls">*/}
            {/*                    <div className="equipment-filter-row">*/}
            {/*                        <div className="equipment-filter-group">*/}
            {/*                            <label>Equipment Type</label>*/}
            {/*                            <select*/}
            {/*                                value={selectedType}*/}
            {/*                                onChange={(e) => setSelectedType(e.target.value)}*/}
            {/*                            >*/}
            {/*                                <option value="">All Types</option>*/}
            {/*                                {equipmentTypes.map(type => (*/}
            {/*                                    <option key={type.id} value={type.id}>{type.name}</option>*/}
            {/*                                ))}*/}
            {/*                            </select>*/}
            {/*                        </div>*/}

            {/*                        <div className="equipment-filter-group">*/}
            {/*                            <label>Equipment Brand</label>*/}
            {/*                            <select*/}
            {/*                                value={selectedBrand}*/}
            {/*                                onChange={(e) => setSelectedBrand(e.target.value)}*/}
            {/*                            >*/}
            {/*                                <option value="">All Brands</option>*/}
            {/*                                {equipmentBrands.map(brand => (*/}
            {/*                                    <option key={brand.id} value={brand.id}>{brand.name}</option>*/}
            {/*                                ))}*/}
            {/*                            </select>*/}
            {/*                        </div>*/}

            {/*                        <div className="equipment-filter-group">*/}
            {/*                            <label>Site</label>*/}
            {/*                            <select*/}
            {/*                                value={selectedSite}*/}
            {/*                                onChange={(e) => setSelectedSite(e.target.value)}*/}
            {/*                            >*/}
            {/*                                <option value="">All Sites</option>*/}
            {/*                                {sites.map(site => (*/}
            {/*                                    <option key={site.id} value={site.id}>{site.name}</option>*/}
            {/*                                ))}*/}
            {/*                            </select>*/}
            {/*                        </div>*/}

            {/*                        <div className="equipment-filter-group">*/}
            {/*                            <label>Status</label>*/}
            {/*                            <select*/}
            {/*                                value={selectedStatus}*/}
            {/*                                onChange={(e) => setSelectedStatus(e.target.value)}*/}
            {/*                            >*/}
            {/*                                <option value="">All Statuses</option>*/}
            {/*                                {statusOptions.map(status => (*/}
            {/*                                    <option key={status.value} value={status.value}>*/}
            {/*                                        {status.label}*/}
            {/*                                    </option>*/}
            {/*                                ))}*/}
            {/*                            </select>*/}
            {/*                        </div>*/}
            {/*                    </div>*/}

            {/*                    <div className="equipment-filter-actions">*/}
            {/*                        <button className="equipment-filter-reset" onClick={handleResetFilters}>*/}
            {/*                            Clear All Filters*/}
            {/*                        </button>*/}
            {/*                    </div>*/}
            {/*                </div>*/}
            {/*            </div>*/}
            {/*        )}*/}
            {/*    </div>*/}
            {/*</section>*/}

            {/* Equipment cards grid */}

            {loading ? (
                <LoadingPage />
            ) : error ? (
                <div className="equipment-error">
                    <FaExclamationCircle />
                    <p>Error: {error}</p>
                    <p>Please try again later or contact support.</p>
                </div>
            ) : filteredEquipment.length > 0 ? (
                <div className="unified-cards-grid">
                    {filteredEquipment.map((equipment) => (
                        <UnifiedCard
                            key={equipment.id}
                            id={equipment.id}
                            title={equipment.name || 'Unknown Equipment'}
                            imageUrl={equipment.imageUrl}
                            imageFallback={equipmentimg}
                            onImageRefresh={handleImageRefresh}
                            onClick={(id) => navigate(`/equipment/${id}`)}
                            stats={[
                                {
                                    label: 'Site',
                                    value: equipment.siteName || 'No Site Assigned'
                                },
                                {
                                    label: 'Equipment Type',
                                    value: equipment.typeName || 'N/A'
                                },
                                {
                                    label: 'Equipment Brand',
                                    value: equipment.brandName || 'N/A'
                                },
                                {
                                    label: 'Main Driver',
                                    value: equipment.mainDriverName || 'No Driver'
                                },
                                {
                                    label: 'Status',
                                    value: formatStatus(equipment.status),
                                    statusIndicator: true,
                                    statusClass: getStatusClass(equipment.status)
                                }
                            ]}
                            actions={[
                                ...(permissions.canEdit ? [{
                                    label: 'Edit',
                                    variant: 'secondary',
                                    icon: <FaPlus />,
                                    onClick: (id) => handleEditEquipment(id)
                                }] : []),
                                {
                                    label: 'View Details',
                                    variant: 'primary',
                                    onClick: (id) => {
                                        // Navigate to equipment info page (ViewEquipmentData component)
                                        navigate(`/equipment/info/${id}`)
                                    }
                                }
                            ]}
                        />
                    ))}
                </div>
            ) : (
                <UnifiedCard
                    isEmpty={true}
                    emptyIcon={FaTools}
                    emptyMessage="No equipment found. Try adjusting your search filters or add new equipment"
                />
            )}


            {/* Notification */}
            {showNotification && (
                <div className="equipment-notification success-notification">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                        <path d="M22 4L12 14.01l-3-3" />
                    </svg>
                    <span>{notificationMessage}</span>
                </div>
            )}

            {/* Equipment Modal */}
            <EquipmentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveEquipment}
                equipmentToEdit={equipmentToEdit}
            />
        </main>
    );
};

export default EquipmentMain;