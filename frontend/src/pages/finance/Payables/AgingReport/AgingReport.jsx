// src/pages/finance/Payables/AgingReport/AgingReport.jsx
import React, { useState, useEffect } from 'react';
import {
    FaChartLine,
    FaFilePdf,
    FaTable,
    FaDownload,
    FaExclamationTriangle,
    FaClock,
    FaCalendarCheck,
    FaFileInvoiceDollar,
    FaEye,
    FaFilter,
    FaChartBar
} from 'react-icons/fa';
import { BiRefresh } from "react-icons/bi";
import DataTable from '../../../../components/common/DataTable/DataTable.jsx';
import { useSnackbar } from "../../../../contexts/SnackbarContext.jsx";
import { financeService } from '../../../../services/financeService.js';
import './AgingReport.css';

const AgingReport = () => {
    const { showSuccess, showError, showInfo } = useSnackbar();
    const [loading, setLoading] = useState(true);
    const [downloadingPdf, setDownloadingPdf] = useState(false);
    const [activeView, setActiveView] = useState('summary');

    // Aging data state
    const [agingData, setAgingData] = useState({
        summary: {
            aged0To30: 0,
            aged31To60: 0,
            aged61To90: 0,
            agedOver90: 0,
            asOfDate: null
        },
        invoices0To30: [],
        invoices31To60: [],
        invoices61To90: [],
        invoicesOver90: []
    });

    useEffect(() => {
        fetchAgingData();
    }, []);

    const fetchAgingData = async () => {
        try {
            setLoading(true);

            console.log('=== FETCHING AGING DATA ===');

            // Fetch all aging data in parallel using financeService
            const [
                summaryResponse,
                invoices0To30Response,
                invoices31To60Response,
                invoices61To90Response,
                invoicesOver90Response
            ] = await Promise.all([
                financeService.invoices.getAgingSummary('json'),
                financeService.invoices.getAged0To30(),
                financeService.invoices.getAged31To60(),
                financeService.invoices.getAged61To90(),
                financeService.invoices.getAgedOver90()
            ]);

            console.log('Raw aging responses:', {
                summaryResponse,
                invoices0To30Response,
                invoices31To60Response,
                invoices61To90Response,
                invoicesOver90Response
            });

            // Extract data from Axios responses
            const summary = summaryResponse.data || summaryResponse;
            const invoices0To30 = invoices0To30Response.data || invoices0To30Response;
            const invoices31To60 = invoices31To60Response.data || invoices31To60Response;
            const invoices61To90 = invoices61To90Response.data || invoices61To90Response;
            const invoicesOver90 = invoicesOver90Response.data || invoicesOver90Response;

            console.log('Extracted aging data:', {
                summary,
                invoices0To30,
                invoices31To60,
                invoices61To90,
                invoicesOver90
            });

            // Debug: Log the detailed breakdown
            console.log('Summary amounts:', {
                aged0To30: summary.aged0To30,
                aged31To60: summary.aged31To60,
                aged61To90: summary.aged61To90,
                agedOver90: summary.agedOver90
            });

            console.log('Invoice counts:', {
                invoices0To30: Array.isArray(invoices0To30) ? invoices0To30.length : 0,
                invoices31To60: Array.isArray(invoices31To60) ? invoices31To60.length : 0,
                invoices61To90: Array.isArray(invoices61To90) ? invoices61To90.length : 0,
                invoicesOver90: Array.isArray(invoicesOver90) ? invoicesOver90.length : 0
            });

            setAgingData({
                summary: summary || {
                    aged0To30: 0,
                    aged31To60: 0,
                    aged61To90: 0,
                    agedOver90: 0,
                    asOfDate: new Date().toISOString().split('T')[0]
                },
                invoices0To30: Array.isArray(invoices0To30) ? invoices0To30 : [],
                invoices31To60: Array.isArray(invoices31To60) ? invoices31To60 : [],
                invoices61To90: Array.isArray(invoices61To90) ? invoices61To90 : [],
                invoicesOver90: Array.isArray(invoicesOver90) ? invoicesOver90 : []
            });

            showSuccess('Aging report data loaded successfully');
        } catch (error) {
            console.error('Error fetching aging data:', error);
            showError('Could not load aging report data: ' + error.message);

            // Set default empty data
            setAgingData({
                summary: {
                    aged0To30: 0,
                    aged31To60: 0,
                    aged61To90: 0,
                    agedOver90: 0,
                    asOfDate: new Date().toISOString().split('T')[0]
                },
                invoices0To30: [],
                invoices31To60: [],
                invoices61To90: [],
                invoicesOver90: []
            });
        } finally {
            setLoading(false);
        }
    };

    const handlePdfExport = async () => {
        try {
            setDownloadingPdf(true);
            showInfo('Generating PDF report...');

            console.log('=== EXPORTING AGING REPORT PDF ===');

            const response = await financeService.invoices.exportAgingToPDF();

            console.log('PDF export response:', response);

            // Extract blob from response
            const blob = response.data || response;

            if (blob instanceof Blob) {
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `aging-report-${new Date().toISOString().split('T')[0]}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);

                showSuccess('PDF report downloaded successfully');
            } else {
                throw new Error('Invalid response format for PDF download');
            }
        } catch (error) {
            console.error('Error downloading PDF:', error);
            showError('Failed to download PDF report: ' + error.message);
        } finally {
            setDownloadingPdf(false);
        }
    };

    // Calculate totals and percentages
    const totalOutstanding = (agingData.summary.aged0To30 || 0) +
        (agingData.summary.aged31To60 || 0) +
        (agingData.summary.aged61To90 || 0) +
        (agingData.summary.agedOver90 || 0);

    const getPercentage = (amount) => {
        return totalOutstanding > 0 ? ((amount / totalOutstanding) * 100).toFixed(1) : '0.0';
    };

    // Table columns for invoice details
    const invoiceColumns = [
        {
            id: 'invoiceNumber',
            header: 'Invoice #',
            accessor: 'invoiceNumber',
            sortable: true
        },
        {
            id: 'vendorName',
            header: 'Vendor',
            accessor: 'vendorName',
            sortable: true
        },
        {
            id: 'totalAmount',
            header: 'Total Amount',
            accessor: 'totalAmount',
            sortable: true,
            render: (row, value) => `$${value?.toLocaleString() || '0'}`
        },
        {
            id: 'remainingBalance',
            header: 'Remaining Balance',
            accessor: 'remainingBalance',
            sortable: true,
            render: (row, value) => (
                <span className="remaining-balance">
                    ${value?.toLocaleString() || '0'}
                </span>
            )
        },
        {
            id: 'invoiceDate',
            header: 'Invoice Date',
            accessor: 'invoiceDate',
            sortable: true,
            render: (row, value) => {
                try {
                    return value ? new Date(value).toLocaleDateString() : 'N/A';
                } catch (e) {
                    return value || 'Invalid Date';
                }
            }
        },
        {
            id: 'dueDate',
            header: 'Due Date',
            accessor: 'dueDate',
            sortable: true,
            render: (row, value) => {
                try {
                    const date = value ? new Date(value).toLocaleDateString() : 'N/A';
                    const isOverdue = value && new Date(value) < new Date();
                    const daysPastDue = isOverdue ? Math.floor((new Date() - new Date(value)) / (1000 * 60 * 60 * 24)) : 0;

                    return (
                        <div className={`due-date ${isOverdue ? 'overdue' : ''}`}>
                            {isOverdue && <FaExclamationTriangle className="overdue-icon" />}
                            <span>{date}</span>
                            {isOverdue && <span className="days-overdue">({daysPastDue} days)</span>}
                        </div>
                    );
                } catch (e) {
                    return value || 'Invalid Date';
                }
            }
        },
        {
            id: 'status',
            header: 'Status',
            accessor: 'status',
            render: (row, value) => (
                <span className={`payables-status-badge payables-status-${value?.toLowerCase().replace('_', '-') || 'pending'}`}>
                    {value?.replace('_', ' ') || 'Pending'}
                </span>
            )
        }
    ];

    // Table actions
    const invoiceActions = [
        // {
        //     label: 'View Details',
        //     icon: <FaEye />,
        //     onClick: (invoice) => {
        //         showSuccess(`Viewing details for invoice ${invoice.invoiceNumber}`);
        //     },
        //     className: 'view'
        // }
    ];

    // Filter options
    const filterableColumns = [
        {
            accessor: 'vendorName',
            header: 'Vendor',
            filterType: 'text'
        },
        {
            accessor: 'status',
            header: 'Status',
            filterType: 'select'
        }
    ];

    // View options
    const viewOptions = [
        { id: 'summary', label: 'Summary View', icon: <FaChartBar /> },
        { id: '0-30', label: '0-30 Days', icon: <FaCalendarCheck /> },
        { id: '31-60', label: '31-60 Days', icon: <FaClock /> },
        { id: '61-90', label: '61-90 Days', icon: <FaExclamationTriangle /> },
        { id: 'over-90', label: '90+ Days', icon: <FaExclamationTriangle /> }
    ];

    const getCurrentViewData = () => {
        switch (activeView) {
            case '0-30': return agingData.invoices0To30;
            case '31-60': return agingData.invoices31To60;
            case '61-90': return agingData.invoices61To90;
            case 'over-90': return agingData.invoicesOver90;
            default: return [];
        }
    };

    const getCurrentViewTitle = () => {
        switch (activeView) {
            case '0-30': return '0-30 Days (Current)';
            case '31-60': return '31-60 Days (Watch List)';
            case '61-90': return '61-90 Days (Action Required)';
            case 'over-90': return 'Over 90 Days (Critical)';
            default: return 'Summary View';
        }
    };

    if (loading) {
        return (
            <div className="aging-report">
                <div className="loading-container">Loading aging report...</div>
            </div>
        );
    }

    return (
        <div className="aging-report">
            {/* Header */}
            <div className="payables-card-header">
                <h3 className="payables-card-title">
                    <FaChartLine />
                    Aging Report
                </h3>
                <div className="payables-card-actions">
                    {/*<button*/}
                    {/*    className="payables-btn payables-btn-secondary"*/}
                    {/*    onClick={fetchAgingData}*/}
                    {/*    disabled={loading}*/}
                    {/*>*/}
                    {/*    <BiRefresh />*/}
                    {/*    Refresh Data*/}
                    {/*</button>*/}
                    <button
                        className="payables-btn payables-btn-danger"
                        onClick={handlePdfExport}
                        disabled={downloadingPdf}
                    >
                        <FaFilePdf />
                        {downloadingPdf ? 'Generating...' : 'Export PDF'}
                    </button>
                </div>
            </div>

            {/* Report Info */}
            <div className="report-info">
                <div className="report-date">
                    <FaCalendarCheck />
                    <span>Report as of: {agingData.summary.asOfDate ? new Date(agingData.summary.asOfDate).toLocaleDateString() : 'Today'}</span>
                </div>
                <div className="total-outstanding">
                    <FaFileInvoiceDollar />
                    <span>Total Outstanding: ${totalOutstanding.toLocaleString()}</span>
                </div>
            </div>

            {/* Aging Summary Cards */}
            <div className="aging-summary-cards">
                <div
                    className={`aging-card current ${activeView === '0-30' ? 'active' : ''}`}
                    onClick={() => setActiveView('0-30')}
                >
                    <div className="aging-card-header">
                        <h4>0-30 Days</h4>
                        <span className="aging-percentage">{getPercentage(agingData.summary.aged0To30)}%</span>
                    </div>
                    <div className="aging-card-content">
                        <div className="aging-amount">${agingData.summary.aged0To30?.toLocaleString() || '0'}</div>
                        <div className="aging-count">{agingData.invoices0To30.length} invoices</div>
                    </div>
                    <div className="aging-card-status">Current</div>
                </div>

                <div
                    className={`aging-card warning ${activeView === '31-60' ? 'active' : ''}`}
                    onClick={() => setActiveView('31-60')}
                >
                    <div className="aging-card-header">
                        <h4>31-60 Days</h4>
                        <span className="aging-percentage">{getPercentage(agingData.summary.aged31To60)}%</span>
                    </div>
                    <div className="aging-card-content">
                        <div className="aging-amount">${agingData.summary.aged31To60?.toLocaleString() || '0'}</div>
                        <div className="aging-count">{agingData.invoices31To60.length} invoices</div>
                    </div>
                    <div className="aging-card-status">Watch List</div>
                </div>

                <div
                    className={`aging-card danger ${activeView === '61-90' ? 'active' : ''}`}
                    onClick={() => setActiveView('61-90')}
                >
                    <div className="aging-card-header">
                        <h4>61-90 Days</h4>
                        <span className="aging-percentage">{getPercentage(agingData.summary.aged61To90)}%</span>
                    </div>
                    <div className="aging-card-content">
                        <div className="aging-amount">${agingData.summary.aged61To90?.toLocaleString() || '0'}</div>
                        <div className="aging-count">{agingData.invoices61To90.length} invoices</div>
                    </div>
                    <div className="aging-card-status">Action Required</div>
                </div>

                <div
                    className={`aging-card critical ${activeView === 'over-90' ? 'active' : ''}`}
                    onClick={() => setActiveView('over-90')}
                >
                    <div className="aging-card-header">
                        <h4>90+ Days</h4>
                        <span className="aging-percentage">{getPercentage(agingData.summary.agedOver90)}%</span>
                    </div>
                    <div className="aging-card-content">
                        <div className="aging-amount">${agingData.summary.agedOver90?.toLocaleString() || '0'}</div>
                        <div className="aging-count">{agingData.invoicesOver90.length} invoices</div>
                    </div>
                    <div className="aging-card-status">Critical</div>
                </div>
            </div>

            {/* View Toggle */}
            <div className="view-toggle">
                <button
                    className={`view-btn ${activeView === 'summary' ? 'active' : ''}`}
                    onClick={() => setActiveView('summary')}
                >
                    <FaChartBar />
                    Summary View
                </button>
                <button
                    className={`view-btn ${activeView !== 'summary' ? 'active' : ''}`}
                    onClick={() => setActiveView('0-30')}
                >
                    <FaTable />
                    Detailed View
                </button>
            </div>

            {/* Content Area */}
            {activeView === 'summary' ? (
                /* Summary View */
                <div className="summary-view">
                    <div className="summary-charts">
                        <div className="chart-placeholder">
                            <FaChartLine />
                            <h4>Aging Distribution</h4>
                            <div className="chart-bars">
                                <div className="chart-bar">
                                    <div className="bar-label">0-30</div>
                                    <div className="bar-container">
                                        <div
                                            className="bar current"
                                            style={{height: `${Math.max(10, getPercentage(agingData.summary.aged0To30))}%`}}
                                        ></div>
                                    </div>
                                    <div className="bar-value">{getPercentage(agingData.summary.aged0To30)}%</div>
                                </div>
                                <div className="chart-bar">
                                    <div className="bar-label">31-60</div>
                                    <div className="bar-container">
                                        <div
                                            className="bar warning"
                                            style={{height: `${Math.max(10, getPercentage(agingData.summary.aged31To60))}%`}}
                                        ></div>
                                    </div>
                                    <div className="bar-value">{getPercentage(agingData.summary.aged31To60)}%</div>
                                </div>
                                <div className="chart-bar">
                                    <div className="bar-label">61-90</div>
                                    <div className="bar-container">
                                        <div
                                            className="bar danger"
                                            style={{height: `${Math.max(10, getPercentage(agingData.summary.aged61To90))}%`}}
                                        ></div>
                                    </div>
                                    <div className="bar-value">{getPercentage(agingData.summary.aged61To90)}%</div>
                                </div>
                                <div className="chart-bar">
                                    <div className="bar-label">90+</div>
                                    <div className="bar-container">
                                        <div
                                            className="bar critical"
                                            style={{height: `${Math.max(10, getPercentage(agingData.summary.agedOver90))}%`}}
                                        ></div>
                                    </div>
                                    <div className="bar-value">{getPercentage(agingData.summary.agedOver90)}%</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="summary-insights">
                        <div className="insight-card">
                            <h4>Key Insights</h4>
                            <ul>
                                <li>
                                    <strong>Total Outstanding:</strong> ${totalOutstanding.toLocaleString()}
                                </li>
                                <li>
                                    <strong>Critical Amount (90+ days):</strong> ${agingData.summary.agedOver90?.toLocaleString() || '0'}
                                </li>
                                <li>
                                    <strong>Action Required (60+ days):</strong> ${((agingData.summary.aged61To90 || 0) + (agingData.summary.agedOver90 || 0)).toLocaleString()}
                                </li>
                                <li>
                                    <strong>Total Invoices:</strong> {agingData.invoices0To30.length + agingData.invoices31To60.length + agingData.invoices61To90.length + agingData.invoicesOver90.length}
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            ) : (
                /* Detail View */
                <div className="detail-view">
                    <div className="detail-header">
                        <h4>{getCurrentViewTitle()}</h4>
                        <div className="detail-stats">
                            <span className="stat">
                                {getCurrentViewData().length} invoices
                            </span>
                            <span className="stat">
                                ${getCurrentViewData().reduce((sum, inv) => sum + (inv.remainingBalance || 0), 0).toLocaleString()}
                            </span>
                        </div>
                    </div>

                    <div className="payables-table">
                        <DataTable
                            data={getCurrentViewData()}
                            columns={invoiceColumns}
                            actions={invoiceActions}
                            loading={false}
                            showSearch={true}
                            showFilters={true}
                            filterableColumns={filterableColumns}
                            defaultItemsPerPage={15}
                            itemsPerPageOptions={[10, 15, 25, 50]}
                            emptyMessage={`No invoices found in ${getCurrentViewTitle().toLowerCase()}`}
                            className="aging-detail-table"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default AgingReport;