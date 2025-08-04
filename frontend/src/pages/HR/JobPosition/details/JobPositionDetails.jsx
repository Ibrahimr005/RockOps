
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiEdit, FiTrash2, FiBriefcase } from 'react-icons/fi';
import LoadingPage from '../../../../components/common/LoadingPage/LoadingPage.jsx';
import IntroCard from '../../../../components/common/IntroCard/IntroCard.jsx';
import { useSnackbar } from '../../../../contexts/SnackbarContext';
import { jobPositionService } from '../../../../services/hr/jobPositionService.js';

// Import custom hook
import { usePositionData } from './hooks/usePositionData.js';

// Import tab components
import PositionOverviewTab from './tabs/PositionOverviewTab.jsx';
import PositionEmployeesTab from './tabs/PositionEmployeesTab.jsx';
import PositionPromotionsTab from './tabs/PositionPromotionsTab.jsx';
import PositionAnalyticsTab from './tabs/PositionAnalyticsTab.jsx';
import PositionHeader from './components/PositionHeader.jsx';
import PositionTabsNavigation from './components/PositionTabsNavigation.jsx';
import PositionErrorState from './components/PositionErrorState.jsx';

import './JobPositionDetails.scss';

const JobPositionDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showSuccess, showError } = useSnackbar();
    const [activeTab, setActiveTab] = useState('overview');
    const [showDebugInfo, setShowDebugInfo] = useState(process.env.NODE_ENV === 'development');

    // Use custom hook for data management
    const { position, positionData, loading, error, refetch } = usePositionData(id);

    // Debug logging
    React.useEffect(() => {
        if (process.env.NODE_ENV === 'development') {
            console.log('🐛 JobPositionDetails Debug Info:', {
                id,
                position: position ? {
                    id: position.id,
                    positionName: position.positionName,
                    contractType: position.contractType,
                    employeesCount: position.employees?.length || 0,
                    vacanciesCount: position.vacancies?.length || 0,
                    promotionsFromCount: position.promotionsFromThisPosition?.length || 0,
                    promotionsToCount: position.promotionsToThisPosition?.length || 0
                } : null,
                positionDataSummary: {
                    employees: positionData.employees?.length || 0,
                    promotionStats: Object.keys(positionData.promotionStats).length,
                    salaryStats: Object.keys(positionData.salaryStats).length,
                    validation: Object.keys(positionData.validation).length
                },
                loading,
                error
            });
        }
    }, [id, position, positionData, loading, error]);

    const handleEdit = () => {
        navigate('/hr/positions', { state: { editPositionId: id } });
    };

    const handleDelete = async () => {
        try {
            // Check if position can be deleted first
            const canDeleteResponse = await jobPositionService.getCanDelete(id);
            const canDeleteData = canDeleteResponse.data;

            if (!canDeleteData.canDelete) {
                const reasons = canDeleteData.blockingReasons.join('\n• ');
                showError(`Cannot delete position:\n• ${reasons}`);
                return;
            }

            // Show warnings if any
            if (canDeleteData.warnings && canDeleteData.warnings.length > 0) {
                const warnings = canDeleteData.warnings.join('\n• ');
                const confirmMessage = `Warning:\n• ${warnings}\n\nAre you sure you want to delete this position? This action cannot be undone.`;

                if (!window.confirm(confirmMessage)) {
                    return;
                }
            } else {
                if (!window.confirm('Are you sure you want to delete this position? This action cannot be undone.')) {
                    return;
                }
            }

            await jobPositionService.delete(id);
            showSuccess('Job position deleted successfully!');
            navigate('/hr/positions');
        } catch (err) {
            console.error('Error deleting position:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Failed to delete position';
            showError(errorMessage);
        }
    };

    // Helper functions with null checks
    const formatCurrency = (amount) => {
        if (!amount || amount === 0) return 'N/A';
        return `$${Number(amount).toLocaleString()}`;
    };

    const getContractTypeDisplay = (contractType) => {
        if (!contractType) return 'N/A';
        return contractType.replace('_', ' ').toLowerCase()
            .replace(/\b\w/g, l => l.toUpperCase());
    };

    // Debug component to show raw data
    const DebugPanel = () => {
        if (!showDebugInfo || process.env.NODE_ENV !== 'development') return null;

        return (
            <div style={{
                position: 'fixed',
                top: '10px',
                right: '10px',
                background: 'rgba(0,0,0,0.9)',
                color: 'white',
                padding: '10px',
                borderRadius: '5px',
                maxWidth: '400px',
                maxHeight: '500px',
                overflow: 'auto',
                fontSize: '12px',
                zIndex: 9999
            }}>
                <button
                    onClick={() => setShowDebugInfo(false)}
                    style={{ float: 'right', background: 'red', color: 'white', border: 'none' }}
                >
                    ×
                </button>
                <h4>🐛 Debug Info</h4>
                <div><strong>Route ID:</strong> {id}</div>
                <div><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</div>
                <div><strong>Error:</strong> {error || 'None'}</div>
                <div><strong>Position:</strong> {position ? 'Loaded' : 'Null'}</div>

                {position && (
                    <div>
                        <strong>Position Summary:</strong>
                        <ul style={{ fontSize: '10px', margin: '5px 0' }}>
                            <li>Name: {position.positionName}</li>
                            <li>Type: {position.contractType}</li>
                            <li>Employees: {position.employees?.length || 0}</li>
                            <li>Vacancies: {position.vacancies?.length || 0}</li>
                            <li>Base Salary: {position.baseSalary}</li>
                            <li>Monthly Salary: {position.monthlyBaseSalary}</li>
                        </ul>
                    </div>
                )}

                <div>
                    <strong>Stats Summary:</strong>
                    <ul style={{ fontSize: '10px', margin: '5px 0' }}>
                        <li>Promotion Stats Keys: {Object.keys(positionData.promotionStats || {}).length}</li>
                        <li>Salary Stats Keys: {Object.keys(positionData.salaryStats || {}).length}</li>
                        <li>Validation Keys: {Object.keys(positionData.validation || {}).length}</li>
                        <li>Employee Analytics Keys: {Object.keys(positionData.employeeAnalytics || {}).length}</li>
                    </ul>
                </div>
            </div>
        );
    };

    // Loading state
    if (loading) {
        return <LoadingPage message="Loading position details..." />;
    }

    // Error state
    if (error) {
        return (
            <PositionErrorState
                error={error}
                onRetry={refetch}
                onBack={() => navigate('/hr/positions')}
            />
        );
    }

    // No position found
    if (!position) {
        return (
            <PositionErrorState
                error="The requested job position could not be found."
                title="Position Not Found"
                onBack={() => navigate('/hr/positions')}
            />
        );
    }

    // Tab content renderer
    const renderTabContent = () => {
        const commonProps = {
            position,
            positionData,
            formatCurrency,
            getContractTypeDisplay,
            navigate,
            refetch // Add refetch for dynamic updates
        };

        switch (activeTab) {
            case 'overview':
                return <PositionOverviewTab {...commonProps} />;
            case 'employees':
                return <PositionEmployeesTab {...commonProps} />;
            case 'promotions':
                return <PositionPromotionsTab {...commonProps} />;
            case 'analytics':
                return <PositionAnalyticsTab {...commonProps} />;
            default:
                return <PositionOverviewTab {...commonProps} />;
        }
    };

    // Calculate stats for IntroCard with proper fallbacks
    const employeeCount = positionData.employees?.length || 0;
    const baseSalary = positionData.salaryStats?.calculatedMonthlySalary ||
        positionData.salaryStats?.baseSalary ||
        position.baseSalary ||
        position.monthlyBaseSalary ||
        0;
    const promotionCount = positionData.promotionStats?.totalPromotionsFrom || 0;

    return (
        <div className="job-position-details">
            {/* Debug Panel */}
            <DebugPanel />

            {/* Debug Toggle Button */}
            {process.env.NODE_ENV === 'development' && (
                <button
                    onClick={() => setShowDebugInfo(!showDebugInfo)}
                    style={{
                        position: 'fixed',
                        bottom: '10px',
                        right: '10px',
                        background: 'blue',
                        color: 'white',
                        border: 'none',
                        padding: '10px',
                        borderRadius: '5px',
                        zIndex: 9998
                    }}
                >
                    🐛 Toggle Debug
                </button>
            )}

            {/* Header Section */}
            <PositionHeader
                position={position}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onBack={() => navigate('/hr/positions')}
            />

            {/* Intro Card */}
            <IntroCard
                icon={<FiBriefcase />}
                title={position.positionName}
                label={getContractTypeDisplay(position.contractType)}
                stats={[
                    {
                        label: 'Employees',
                        value: employeeCount,
                        icon: 'FiUsers'
                    },
                    {
                        label: 'Base Salary',
                        value: formatCurrency(baseSalary),
                        icon: 'FiDollarSign'
                    },
                    {
                        label: 'Promotions',
                        value: promotionCount,
                        icon: 'FiTrendingUp'
                    }
                ]}
            />

            {/* Tabs Navigation */}
            <PositionTabsNavigation
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                employeeCount={employeeCount}
            />

            {/* Tab Content */}
            <div className="tab-content">
                {renderTabContent()}
            </div>
        </div>
    );
};

export default JobPositionDetails;