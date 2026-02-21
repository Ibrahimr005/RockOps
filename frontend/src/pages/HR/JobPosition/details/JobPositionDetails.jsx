import React, {useEffect, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import {
    FiArrowLeft,
    FiBriefcase,
    FiEdit,
    FiHome,
    FiInfo,
    FiUsers,
    FiGitCommit,
    FiMinusCircle,
    FiClock,
    FiAlertCircle,
    FiCheckCircle,
    FiChevronDown,
    FiChevronRight
} from 'react-icons/fi';
import EditPositionForm from '../components/EditPositionForm.jsx';
import PositionOverview from './components/PositionOverview.jsx';
import PositionEmployees from './components/PositionEmployees.jsx';
import {useSnackbar} from '../../../../contexts/SnackbarContext';
import {jobPositionService} from '../../../../services/hr/jobPositionService.js';
import './JobPositionDetails.scss';
import IntroCard from "../../../../components/common/IntroCard/IntroCard.jsx";
import ContentLoader from "../../../../components/common/ContentLoader/ContentLoader.jsx";

const JobPositionDetails = () => {
    const {id} = useParams();
    const navigate = useNavigate();
    const {showSuccess, showError} = useSnackbar();

    const [position, setPosition] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showEditForm, setShowEditForm] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    // Tab configuration
    const tabs = [
        {
            id: 'overview',
            label: 'Overview',
            icon: <FiInfo/>,
            component: PositionOverview
        },
        {
            id: 'employees',
            label: 'Employees',
            icon: <FiUsers/>,
            component: PositionEmployees
        }
    ];

    useEffect(() => {
        if (id) {
            fetchPositionDetails();
        }
    }, [id]);

    const fetchPositionDetails = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await jobPositionService.getDetails(id);
            console.log(response.data)
            setPosition(response.data);
        } catch (err) {
            console.error('Error fetching position details:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Failed to load position details';
            setError(errorMessage);
            showError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleEditPosition = async (formData) => {
        try {
            setError(null);
            await jobPositionService.update(id, formData);
            await fetchPositionDetails();
            setShowEditForm(false);
            showSuccess('Job position updated successfully!');
        } catch (err) {
            console.error('Error updating position:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Failed to update position';
            setError(errorMessage);
            showError(errorMessage);
            throw err;
        }
    };

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
    };

    const formatCurrency = (amount) => {
        if (amount === null || amount === undefined) return 'Not Set';
        return `$${Number(amount).toFixed(2)}`;
    };

    // Helper to render the hierarchy tree with ancestors, current, and children
    const renderHierarchyTree = () => {
        const pathString = position.hierarchyPath || position.positionName;
        const ancestors = pathString.split(' > ');
        // Remove the last item (current position) from ancestors
        ancestors.pop();
        const children = position.childPositions || [];

        return (
            <div className="hierarchy-tree-container">
                {/* Ancestor nodes */}
                {ancestors.map((nodeName, index) => (
                    <div key={`ancestor-${index}`} className="tree-step">
                        <div className="tree-node ancestor" style={{ paddingLeft: `${index * 1.25}rem` }}>
                            <FiChevronRight className="tree-indent-icon" />
                            <span className="node-name">{nodeName}</span>
                        </div>
                        <div className="tree-connector" style={{ marginLeft: `${(index + 0.5) * 1.25}rem` }}>
                            <div className="line"></div>
                        </div>
                    </div>
                ))}

                {/* Current position node */}
                <div className="tree-step">
                    <div className="tree-node current" style={{ marginLeft: `${ancestors.length * 1.25}rem` }}>
                        <FiCheckCircle />
                        <span className="node-name">{position.positionName}</span>
                        <span className="current-badge">Current</span>
                    </div>
                </div>

                {/* Children nodes */}
                {children.length > 0 && (
                    <div className="tree-children" style={{ marginLeft: `${(ancestors.length + 0.5) * 1.25}rem` }}>
                        {children.map((child, index) => {
                            const isLastChild = index === children.length - 1;
                            return (
                                <div key={child.id} className="tree-child-step">
                                    <div className="tree-child-connector">
                                        <div className={`vertical-line ${isLastChild ? 'last' : ''}`}></div>
                                        <div className="horizontal-line"></div>
                                    </div>
                                    <div
                                        className={`tree-node child ${!child.active ? 'inactive' : ''}`}
                                        onClick={() => navigate(`/hr/positions/${child.id}`)}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => e.key === 'Enter' && navigate(`/hr/positions/${child.id}`)}
                                    >
                                        <FiBriefcase className="tree-child-icon" />
                                        <span className="node-name">{child.positionName}</span>
                                        {child.employeeCount > 0 && (
                                            <span className="child-employee-count">
                                                <FiUsers /> {child.employeeCount}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {children.length === 0 && (
                    <div className="tree-no-children" style={{ marginLeft: `${(ancestors.length + 1) * 1.25}rem` }}>
                        <span>No sub-positions</span>
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return (
            <ContentLoader message={"Loading Position Details.."} />
        );
    }

    if (error || !position) {
        return (
            <div className="position-details-container">
                <div className="error-container">
                    <h2>Error Loading Position</h2>
                    <p>{error || 'Position not found'}</p>
                    <button
                        className="btn btn-primary"
                        onClick={() => navigate('/hr/positions')}
                    >
                        <FiArrowLeft/> Back to Positions
                    </button>
                </div>
            </div>
        );
    }

    const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

    const getBreadcrumbs = () => {
        return [
            { label: 'Home', icon: <FiHome />, onClick: () => navigate('/') },
            { label: 'HR', onClick: () => navigate('/hr') },
            { label: 'Job Positions', icon: <FiBriefcase />, onClick: () => navigate('/hr/positions') },
            { label: position.positionName }
        ];
    };

    const getPositionStats = () => {
        return [
            {
                value: position.totalEmployeeCount || position.employeeCount || '0',
                label: 'Total Employees'
            },
            {
                value: position.hierarchyLevel ? `Level ${position.hierarchyLevel}` : 'Root',
                label: 'Hierarchy'
            },
            {
                value: position.active ? 'Active' : 'Inactive',
                label: 'Status'
            }
        ];
    };

    const getActionButtons = () => {
        return [
            {
                text: 'Edit Position',
                icon: <FiEdit />,
                onClick: () => setShowEditForm(true),
                className: 'primary'
            }
        ];
    };

    const isMonthly = position.contractType === 'MONTHLY' || position.monthlyContract === true;

    return (
        <div className="position-details-container">
            {/* Header Section */}
            <IntroCard
                title={position.positionName}
                subtitle={position.positionNumber}
                label="JOB POSITION DETAILS"
                breadcrumbs={getBreadcrumbs()}
                icon={<FiBriefcase />}
                stats={getPositionStats()}
                actionButtons={getActionButtons()}
                className="position-intro-card"
            />

            {/* Info Cards Grid */}
            <div className="position-info-grid">

                {/* 1. Hierarchy Tree Card */}
                <div className="pos-info-card hierarchy-card">
                    <div className="pos-card-header">
                        <FiGitCommit className="pos-card-icon" />
                        <h3>Organizational Structure</h3>
                    </div>
                    <div className="pos-card-content">
                        {renderHierarchyTree()}

                        <div className="hierarchy-meta">
                            <div className="meta-item">
                                <span className="label">Reporting Head:</span>
                                <span className="value">{position.head || 'Direct Report'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Monthly Deductions Card (Conditional) */}
                {isMonthly && (
                    <div className="pos-info-card deduction-card">
                        <div className="pos-card-header">
                            <FiMinusCircle className="pos-card-icon" />
                            <h3>Deduction Rules</h3>
                        </div>
                        <div className="pos-card-content two-col">
                            <div className="deduction-item">
                                <span className="label"><FiAlertCircle /> Absent Penalty</span>
                                <span className="value highlight-danger">{formatCurrency(position.absentDeduction)}</span>
                            </div>
                            <div className="deduction-item">
                                <span className="label"><FiClock /> Late Penalty</span>
                                <span className="value highlight-warning">{formatCurrency(position.lateDeduction)}</span>
                            </div>
                            <div className="deduction-item full-width">
                                <span className="label">Late Forgiveness Policy</span>
                                <span className="value small-text">
                                    {position.lateForgivenessMinutes || 0} min grace period
                                    <span className="separator">•</span>
                                    {position.lateForgivenessCountPerQuarter || 0} forgiven per quarter
                                </span>
                            </div>
                            <div className="deduction-item full-width">
                                <span className="label">Excess Leave Penalty (per day)</span>
                                <span className="value">{formatCurrency(position.leaveDeduction)}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Tabs Navigation */}
            <div className="tabs-container">
                <div className="tabs-header">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => handleTabChange(tab.id)}
                        >
                            {tab.icon}
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="tab-content">
                    {ActiveComponent && (
                        <ActiveComponent
                            position={position}
                            positionId={id}
                            onRefresh={fetchPositionDetails}
                        />
                    )}
                </div>
            </div>

            {/* Edit Position Modal */}
            {showEditForm && position && (
                <EditPositionForm
                    isOpen={showEditForm}
                    onClose={() => {
                        setShowEditForm(false);
                        setError(null);
                    }}
                    onSubmit={handleEditPosition}
                    position={position}
                />
            )}
        </div>
    );
};

export default JobPositionDetails;