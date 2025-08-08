import React, {useEffect, useState} from "react";
import DataTable from "../../../../components/common/DataTable/DataTable.jsx";
import {useTranslation} from 'react-i18next';
import {useAuth} from "../../../../contexts/AuthContext.jsx";
import {FaTrash, FaEdit, FaSave, FaTimes, FaPlus} from 'react-icons/fa';
import { useSnackbar } from "../../../../contexts/SnackbarContext.jsx";
import { siteService } from "../../../../services/siteService.js";

const SitePartnersTab = ({siteId}) => {
    const {t} = useTranslation();
    const [partnersData, setPartnersData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [availablePartners, setAvailablePartners] = useState([]);
    const [partnerPercentages, setPartnerPercentages] = useState({});
    const {currentUser} = useAuth();
    const [editingPartner, setEditingPartner] = useState(null);
    const [editPercentage, setEditPercentage] = useState("");
    const { showSuccess, showError, showWarning } = useSnackbar();

    const isSiteAdmin = currentUser?.role === "SITE_ADMIN" || "ADMIN";

    // Define columns for DataTable
    const columns = [
        {
            header: 'ID',
            accessor: 'conventionalId',
            sortable: true
        },
        {
            header: 'Partner Name',
            accessor: 'partnerName',
            sortable: true
        },
        {
            header: 'Percentage',
            accessor: 'partnerPercentage',
            sortable: true,
            render: (row) => (
                editingPartner === row.partnerID ? (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                            type="number"
                            className="assign-partner-percentage-input"
                            value={editPercentage}
                            onChange={(e) => setEditPercentage(e.target.value)}
                            placeholder="0"
                            min="0"
                            max="100"
                            step="0.01"
                            style={{ width: '80px' }}
                        />
                        <button
                            className="icon-button success"
                            onClick={() => handleUpdatePartner(row.partnerID, editPercentage)}
                            disabled={!editPercentage || parseFloat(editPercentage) < 0 || parseFloat(editPercentage) > 100}
                            title="Save"
                        >
                            <FaSave />
                        </button>
                        <button
                            className="icon-button cancel"
                            onClick={() => {
                                setEditingPartner(null);
                                setEditPercentage("");
                            }}
                            title="Cancel"
                        >
                            <FaTimes />
                        </button>
                    </div>
                ) : (
                    row.partnerPercentage
                )
            )
        },
        {
            header: 'Actions',
            accessor: 'actions',
            sortable: false,
            render: (row) => (
                isSiteAdmin && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            className="icon-button primary"
                            onClick={() => {
                                setEditingPartner(row.partnerID);
                                setEditPercentage(row.partnerPercentage.replace('%', ''));
                            }}
                            title="Edit Percentage"
                        >
                            <FaEdit />
                        </button>
                        <button
                            className="icon-button danger"
                            onClick={() => handleRemovePartner(row.partnerID)}
                            title="Remove Partner"
                        >
                            <FaTrash />
                        </button>
                    </div>
                )
            )
        }
    ];

    useEffect(() => {
        fetchPartners();
    }, [siteId]);

    const fetchPartners = async () => {
        try {
            setLoading(true);
            const response = await siteService.getSitePartners(siteId);
            const data = response.data;

            if (Array.isArray(data)) {
                const transformedData = data.map((item, index) => ({
                    conventionalId: `P-${String(index + 1).padStart(3, '0')}`,
                    partnerID: item.id,
                    partnerFirstName: item.firstName,
                    partnerLastName: item.lastName,
                    partnerName: `${item.firstName} ${item.lastName}`,
                    partnerPercentage: `${parseFloat(item.percentage).toFixed(2)}%`,
                }));

                setPartnersData(transformedData);
            } else {
                setPartnersData([]);
            }

            setLoading(false);
        } catch (err) {
            console.error('Error fetching partners:', err);
            setError(err.message || 'No Partners found for this site.');
            showError(err.message || 'No Partners found for this site.');
            setPartnersData([]);
            setLoading(false);
        }
    };

    const handleOpenModal = () => {
        setShowModal(true);
        fetchAvailablePartners();
    };

    const handlePercentageChange = (partnerId, value) => {
        setPartnerPercentages(prev => ({
            ...prev,
            [partnerId]: value
        }));
    };

    const handleCloseModal = () => setShowModal(false);

    const fetchAvailablePartners = async () => {
        try {
            const response = await siteService.getUnassignedPartners(siteId);
            const data = response.data;
            const unassignedPartners = data.filter(eq => !eq.site);
            setAvailablePartners(unassignedPartners);
        } catch (err) {
            console.error("Error fetching available partners:", err);
            showError("Unable to load available partners. Please try again.");
            setAvailablePartners([]);
        }
    };

    const handleAssignPartner = async (partnerId) => {
        try {
            const percentageValue = partnerPercentages[partnerId];

            // Enhanced frontend validation
            if (!percentageValue || isNaN(percentageValue)) {
                showError("Please enter a valid percentage");
                return;
            }

            const numericPercentage = parseFloat(percentageValue);
            if (numericPercentage <= 0 || numericPercentage > 100) {
                showError("Percentage must be between 0 and 100");
                return;
            }

            console.log(`Assigning partner ${partnerId} with ${numericPercentage}% to site ${siteId}`);

            // Call the API using siteService
            const response = await siteService.assignPartner(siteId, partnerId, numericPercentage);

            console.log("Assignment successful:", response);

            // Reset state and refresh
            setShowModal(false);
            setPartnerPercentages({});
            await fetchPartners();
            showSuccess("Partner successfully assigned to the site.");

        } catch (err) {
            console.error("Error assigning partner:", err);

            // Enhanced error handling based on common issues
            if (err.response?.status === 500) {
                const errorMessage = err.response?.data?.message || err.message;

                if (errorMessage?.includes("already assigned")) {
                    showError("This partner is already assigned to the site.");
                } else if (errorMessage?.includes("available")) {
                    showError("Not enough percentage available. Please check current assignments.");
                } else if (errorMessage?.includes("not found")) {
                    showError("Partner or site not found. Please refresh and try again.");
                } else if (errorMessage?.includes("Default partner assignment not found")) {
                    showError("Site configuration error. Please contact administrator.");
                } else if (errorMessage?.includes("Percentage calculation error")) {
                    showError("Assignment would exceed 100%. Please adjust percentages.");
                } else {
                    showError("Server error occurred. Please try again or contact support.");
                }
            } else if (err.response?.status === 400) {
                showError("Invalid request. Please check your input and try again.");
            } else {
                showError(err.message || "Failed to assign partner. Please try again.");
            }
        }
    };

    const handleUpdatePartner = async (partnerId, newPercentage) => {
        try {
            await siteService.updatePartnerPercentage(siteId, partnerId, parseFloat(newPercentage));

            await fetchPartners();
            setEditingPartner(null);
            setEditPercentage("");
            showSuccess("Partner percentage successfully updated");
        } catch (err) {
            console.error("Error updating partner percentage:", err);
            if (err.message && err.message.includes("Rock4Mining")) {
                showError("Cannot modify the default partner's percentage. Please adjust other partners instead");
            } else if (err.message && err.message.includes("Cannot increase partner percentage")) {
                showError("Not enough percentage available. Please reduce other partners first");
            } else if (err.message && err.message.includes("Server Error")) {
                showError("Unable to update partner percentage. Please check if the percentage is available");
            } else {
                showError(err.message || "Unable to update partner percentage");
            }
        }
    };

    const handleRemovePartner = async (partnerId) => {
        try {
            await siteService.removePartner(siteId, partnerId);
            await fetchPartners();
            showSuccess("Partner successfully removed from the site");
        } catch (err) {
            console.error("Error removing partner:", err);
            if (err.message && err.message.includes("Rock4Mining")) {
                showError("This partner cannot be removed as they are the default partner for the site");
            } else if (err.message && err.message.includes("Server Error")) {
                showError("Unable to remove partner. The partner might be the default partner or have active assignments.");
            } else {
                showError(err.message || "Unable to remove partner from the site");
            }
        }
    };

    if (loading) return <div className="loading-container">Loading Partners...</div>;

    return (
        <div className="site-partners-tab">
            {/* Updated Assign Partner Modal JSX - Replace the existing modal section in your component */}
            {showModal && (
                <div className="assign-partner-modal-overlay">
                    <div className="assign-partner-modal-content">
                        <div className="assign-partner-modal-header">
                            <h2>Assign Partner</h2>
                            <button
                                className="assign-partner-modal-close-button"
                                onClick={handleCloseModal}
                            >
                                ×
                            </button>
                        </div>

                        <div className="assign-partner-modal-body">
                            {availablePartners.length === 0 ? (
                                <div className="assign-partner-no-partners">
                                    <p>No Partners Available</p>
                                </div>
                            ) : (
                                <div className="assign-partner-table-container">
                                    <table className="assign-partner-table">
                                        <thead>
                                        <tr>
                                            <th>First Name</th>
                                            <th>Last Name</th>
                                            <th>Percentage (%)</th>
                                            <th>{t('common.action')}</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {availablePartners.map((partner) => {
                                            const currentPercentage = partnerPercentages[partner.id] || "";
                                            const isValidPercentage = currentPercentage &&
                                                parseFloat(currentPercentage) >= 0 &&
                                                parseFloat(currentPercentage) <= 100;

                                            return (
                                                <tr key={partner.id}>
                                                    <td
                                                        className="assign-partner-first-name"
                                                        data-label="First Name"
                                                    >
                                                        {partner.firstName}
                                                    </td>
                                                    <td
                                                        className="assign-partner-last-name"
                                                        data-label="Last Name"
                                                    >
                                                        {partner.lastName}
                                                    </td>
                                                    <td data-label="Percentage">
                                                        <div className="assign-partner-percentage-label">
                                                            <input
                                                                type="number"
                                                                className="assign-partner-percentage-input"
                                                                value={currentPercentage}
                                                                onChange={(e) => handlePercentageChange(partner.id, e.target.value)}
                                                                placeholder="0"
                                                                min="0"
                                                                max="100"
                                                                step="0.01"
                                                            />
                                                        </div>
                                                        <div
                                                            className={`assign-partner-validation-message ${
                                                                currentPercentage && !isValidPercentage ? 'show' : ''
                                                            }`}
                                                        >
                                                            Please enter a value between 0 and 100
                                                        </div>
                                                    </td>
                                                    <td data-label="Action">
                                                        <button
                                                            className="assign-partner-btn"
                                                            onClick={() => handleAssignPartner(partner.id)}
                                                            disabled={!isValidPercentage}
                                                        >
                                                            {t('site.assign')}
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {error ? (
                <div className="error-container">{error}</div>
            ) : (
                <div className="data-table-container">
                    <DataTable
                        data={partnersData}
                        columns={columns}
                        loading={loading}
                        showSearch={true}
                        showFilters={true}
                        filterableColumns={columns}
                        itemsPerPageOptions={[10, 25, 50, 100]}
                        defaultItemsPerPage={10}
                        tableTitle="Partners List"
                        showAddButton={isSiteAdmin}
                        addButtonText="Assign Partner"
                        addButtonIcon={<FaPlus />}
                        onAddClick={handleOpenModal}
                        addButtonProps={{
                            className: 'assign-button',
                        }}
                    />
                </div>
            )}
        </div>
    );
};

export default SitePartnersTab;