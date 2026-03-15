import React, { useState, useEffect } from 'react';
import './InventoryValuation.scss';
import PageHeader from '../../../components/common/PageHeader/PageHeader.jsx';
import AssetValuesView from './AssetValuesView/AssetValuesView.jsx';
import Snackbar from '../../../components/common/Snackbar2/Snackbar2.jsx';
import { useInventoryValuations } from '../../../hooks/queries';

const InventoryValuation = () => {
    // Snackbar states
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success');

    // Sites filter state from shared hook
    const { data: sites = [], isLoading: loadingSites } = useInventoryValuations();
    const [selectedSiteIds, setSelectedSiteIds] = useState([]);

    // Set selected site IDs when sites data loads
    useEffect(() => {
        if (sites.length > 0 && selectedSiteIds.length === 0) {
            setSelectedSiteIds(sites.map(site => site.siteId));
        }
    }, [sites]);

    const showSnackbar = (message, type = 'success') => {
        setNotificationMessage(message);
        setNotificationType(type);
        setShowNotification(true);
    };

    const handleSiteFilterChange = (newSelectedIds) => {
        setSelectedSiteIds(newSelectedIds);
    };

    // Prepare filter items for PageHeader
    const filterItems = sites.map(site => ({
        id: site.siteId,
        name: site.siteName
    }));

    return (
        <div className="inventory-valuation-page">
            {/* Main Page Header */}
            <PageHeader
                title="Sites Valuation"
                subtitle="Monitor short-term and long-term assets' values"
                filterConfig={{
                    label: 'Filter by Sites',
                    items: filterItems,
                    selectedItems: selectedSiteIds,
                    onFilterChange: handleSiteFilterChange,
                    disabled: loadingSites
                }}
            />

            {/* Asset Values Section */}
            <div className="valuation-section">
                <AssetValuesView
                    showSnackbar={showSnackbar}
                    selectedSiteIds={selectedSiteIds}
                />
            </div>

            <Snackbar
                type={notificationType}
                text={notificationMessage}
                isVisible={showNotification}
                onClose={() => setShowNotification(false)}
                duration={notificationType === 'error' ? 5000 : 3000}
            />
        </div>
    );
};

export default InventoryValuation;