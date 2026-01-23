import React, { useState, useEffect } from 'react';
import './InventoryValuation.scss';
import PageHeader from '../../../components/common/PageHeader/PageHeader.jsx';
import AssetValuesView from './AssetValuesView/AssetValuesView.jsx';
import Snackbar from '../../../components/common/Snackbar2/Snackbar2.jsx';
import {inventoryValuationService} from '../../../services/finance/inventoryValuationService.js'
import { siteService } from '../../../services/siteService.js';

const InventoryValuation = () => {
    // Snackbar states
    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success');

    // Sites filter state
    const [sites, setSites] = useState([]);
    const [selectedSiteIds, setSelectedSiteIds] = useState([]);
    const [loadingSites, setLoadingSites] = useState(true);

    // Fetch sites on mount
    useEffect(() => {
        fetchSites();
    }, []);

    const fetchSites = async () => {
        setLoadingSites(true);
        try {
            const response = await inventoryValuationService.getAllSiteBalances();
            const data = response.data || response;
            console.log('Sites data:', data);
            const siteList = Array.isArray(data) ? data : [];
            setSites(siteList);
            setSelectedSiteIds(siteList.map(site => site.siteId));
        } catch (error) {
            console.error('Failed to fetch sites:', error);
            setSites([]);
        } finally {
            setLoadingSites(false);
        }
    };

    const showSnackbar = (message, type = 'success') => {
        setNotificationMessage(message);
        setNotificationType(type);
        setShowNotification(true);
    };

    const handleSiteFilterChange = (newSelectedIds) => {
        setSelectedSiteIds(newSelectedIds);
    };

    // Prepare filter items for PageHeader
// Prepare filter items for PageHeader
    const filterItems = sites.map(site => ({
        id: site.siteId,
        name: site.siteName
    }));

    return (
        <div className="inventory-valuation-page">
            {/* Main Page Header */}
            <PageHeader
                title="Inventory Valuation"
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