import React, {useEffect, useState} from "react";
import DataTable from "../../../../components/common/DataTable/DataTable";
import {useTranslation} from 'react-i18next';
import {useAuth} from "../../../../contexts/AuthContext";
import Snackbar from "../../../../components/common/Snackbar/Snackbar";
import { siteService } from "../../../../services/siteService";

const SiteFixedAssetsTab = ({siteId}) => {
    const {t} = useTranslation();
    const [assetsData, setAssetsData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [availableFixedAsset, setAvailableFixedAsset] = useState([]);
    const {currentUser} = useAuth();
    const [snackbar, setSnackbar] = useState({
        show: false,
        message: '',
        type: 'success'
    });

    const isSiteAdmin = currentUser?.role === "SITE_ADMIN";

    // Define columns for DataTable
    const columns = [
        {
            header: 'ID',
            accessor: 'conventionalId',
            sortable: true
        },
        {
            header: 'Asset Name',
            accessor: 'assetName',
            sortable: true
        },
        {
            header: 'Creation Date',
            accessor: 'creationDate',
            sortable: true
        },
        {
            header: 'Area/Quantity',
            accessor: 'areaQuantity',
            sortable: true
        }
    ];

    useEffect(() => {
        fetchFixedAssets();
    }, [siteId]);

    const fetchFixedAssets = async () => {
        try {
            const response = await siteService.getSiteFixedAssets(siteId);
            const data = response.data;

            if (Array.isArray(data)) {
                const transformedData = data.map((asset, index) => ({
                    conventionalId: `FA-${String(index + 1).padStart(3, "0")}`,
                    assetID: asset.id,
                    assetName: asset.name,
                    creationDate: asset.creationDate.split("T")[0],
                    areaQuantity: `${asset.area} m²`,
                }));

                setAssetsData(transformedData);
            } else {
                setAssetsData([]);
                setSnackbar({
                    show: true,
                    message: 'No fixed assets found for this site',
                    type: 'info'
                });
            }

            setLoading(false);
        } catch (err) {
            setError(err.message);
            setAssetsData([]);
            setLoading(false);
            setSnackbar({
                show: true,
                message: err.message,
                type: 'error'
            });
        }
    };

    // Count assets per name
    const assetCounts = assetsData.reduce((acc, item) => {
        acc[item.assetName] = (acc[item.assetName] || 0) + 1;
        return acc;
    }, {});

    const fetchAvailableFixedAsset = async () => {
        try {
            const response = await siteService.getUnassignedFixedAssets();
            const data = response.data;
            const unassignedFixedAsset = data.filter(ep => !ep.site);
            setAvailableFixedAsset(unassignedFixedAsset);
            if (unassignedFixedAsset.length === 0) {
                setSnackbar({
                    show: true,
                    message: 'No available fixed assets found to assign',
                    type: 'info'
                });
            }
        } catch (err) {
            console.error("Error fetching available fixed asset:", err);
            setAvailableFixedAsset([]);
            setSnackbar({
                show: true,
                message: 'Failed to fetch available fixed assets',
                type: 'error'
            });
        }
    };

    const handleAssignFixedAsset = async (fixedAssetId) => {
        try {
            await siteService.assignFixedAsset(siteId, fixedAssetId);
            setShowModal(false);
            await fetchFixedAssets();
            setSnackbar({
                show: true,
                message: 'Fixed asset successfully assigned to site',
                type: 'success'
            });
        } catch (err) {
            console.error("Error assigning fixed asset:", err);
            setSnackbar({
                show: true,
                message: 'Failed to assign fixed asset',
                type: 'error'
            });
        }
    };

    const handleOpenModal = () => {
        setShowModal(true);
        fetchAvailableFixedAsset();
    };

    const handleCloseModal = () => setShowModal(false);

    const handleCloseSnackbar = () => {
        setSnackbar(prev => ({ ...prev, show: false }));
    };

    if (loading) return <div className="loading-container">{t('site.loadingFixedAssets')}</div>;

    return (
        <div className="site-fixed-assets-tab">
            <Snackbar
                show={snackbar.show}
                message={snackbar.message}
                type={snackbar.type}
                onClose={handleCloseSnackbar}
                duration={3000}
            />
            <div className="departments-header">
                <h3>{t('site.siteFixedAssetsReport')}</h3>
                {isSiteAdmin && (
                    <div className="btn-primary-container">
                        <button className="assign-button" onClick={handleOpenModal}>
                            {t('site.assignFixedAsset')}
                        </button>
                    </div>
                )}
            </div>

            <div className="assets-stats">
                {Object.entries(assetCounts).map(([assetName, count]) => (
                    <div className="stat-card" key={assetName}>
                        <div className="stat-title">{assetName}</div>
                        <div className="stat-value">{count}</div>
                    </div>
                ))}
            </div>

            {/* Updated Modal JSX - Replace the existing modal section in your component */}
            {showModal && (
                <div className="assign-fixed-asset-modal-overlay">
                    <div className="assign-fixed-asset-modal-content">
                        <div className="assign-fixed-asset-modal-header">
                            <h2>{t('site.assignFixedAsset')}</h2>
                            <button
                                className="assign-fixed-asset-modal-close-button"
                                onClick={handleCloseModal}
                            >
                                ×
                            </button>
                        </div>

                        <div className="assign-fixed-asset-modal-body">
                            {availableFixedAsset.length === 0 ? (
                                <div className="assign-fixed-asset-no-assets">
                                    <p>{t('site.noFixedAssetsAvailable')}</p>
                                </div>
                            ) : (
                                <div className="assign-fixed-asset-table-container">
                                    <table className="assign-fixed-asset-table">
                                        <thead>
                                        <tr>
                                            <th>{t('common.name')}</th>
                                            <th>{t('site.creationDate')}</th>
                                            <th>{t('fixedAssets.areaOrQuantity')}</th>
                                            <th>{t('common.action')}</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {availableFixedAsset.map((ep) => (
                                            <tr key={ep.id}>
                                                <td>{ep.name}</td>
                                                <td className="assign-fixed-asset-creation-date">
                                                    {ep.creationDate}
                                                </td>
                                                <td className="assign-fixed-asset-area">
                                                    {ep.area} m²
                                                </td>
                                                <td>
                                                    <button
                                                        className="assign-fixed-asset-btn"
                                                        onClick={() => handleAssignFixedAsset(ep.id)}
                                                    >
                                                        {t('site.assign')}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
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
                        data={assetsData}
                        columns={columns}
                        loading={loading}
                        showSearch={true}
                        showFilters={true}
                        filterableColumns={columns}
                        itemsPerPageOptions={[10, 25, 50, 100]}
                        defaultItemsPerPage={10}
                        tableTitle="Fixed Assets List"
                    />
                </div>
            )}
        </div>
    );
};

export default SiteFixedAssetsTab;