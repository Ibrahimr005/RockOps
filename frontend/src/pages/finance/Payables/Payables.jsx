import React, { useState, useEffect } from 'react';
import { FaFileInvoiceDollar, FaMoneyBillWave, FaChartLine, FaClipboardList } from 'react-icons/fa';
import './Payables.css';
import { useSnackbar } from "../../../contexts/SnackbarContext.jsx";
import IntroCard from '../../../components/common/IntroCard/IntroCard';
import { financeService } from '../../../services/financeService.js';

// Import your components
import InvoiceManagement from './InvoiceManagement/InvoiceManagement.jsx';
import PaymentManagement from './PaymentManagement/PaymentManagement';
import AgingReport from './AgingReport/AgingReport';
import PayablesDashboard from './PayablesDashboard/PayablesDashboard.jsx';

const Payables = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const { showSuccess, showError } = useSnackbar();

    const tabs = [
        { id: 'dashboard', label: 'Dashboard', icon: <FaClipboardList /> },
        { id: 'invoices', label: 'Invoice Management', icon: <FaFileInvoiceDollar /> },
        { id: 'payments', label: 'Payment Management', icon: <FaMoneyBillWave /> },
        { id: 'aging', label: 'Aging Report', icon: <FaChartLine /> }
    ];

    // Fetch stats for the intro card
    useEffect(() => {
        fetchPayablesStats();
    }, []);

    const fetchPayablesStats = async () => {
        try {
            setLoading(true);

            console.log('=== FETCHING PAYABLES STATS ===');

            // Use financeService instead of manual fetch calls
            const [
                outstanding,
                overdue,
                recentPayments,
                pendingInvoices
            ] = await Promise.all([
                financeService.invoices.getOutstandingTotal(),
                financeService.invoices.getOverdue(),
                financeService.payments.getAll(0, 100), // page=0, size=100
                financeService.invoices.getByStatus('PENDING')
            ]);

            console.log('Stats data received:', {
                outstanding,
                overdue,
                recentPayments,
                pendingInvoices
            });

// Extract data from Axios responses
            const outstandingData = outstanding.data || outstanding;
            const overdueData = overdue.data || overdue;
            const paymentsData = recentPayments.data || recentPayments;
            const pendingData = pendingInvoices.data || pendingInvoices;

            console.log('=== EXTRACTED DATA ===');
            console.log('Outstanding data:', outstandingData);
            console.log('Overdue data:', overdueData);
            console.log('Payments data:', paymentsData);
            console.log('Pending data:', pendingData);

// Extract arrays safely
            const overdueArray = Array.isArray(overdueData) ? overdueData : [];
            const pendingArray = Array.isArray(pendingData) ? pendingData : [];

// Handle payments response structure (could be paginated)
            let paymentsArray = [];
            if (Array.isArray(paymentsData)) {
                paymentsArray = paymentsData;
            } else if (paymentsData && Array.isArray(paymentsData.content)) {
                paymentsArray = paymentsData.content;
            } else if (paymentsData && Array.isArray(paymentsData.data)) {
                paymentsArray = paymentsData.data;
            }

            console.log('Final extracted data:', {
                overdueArray: overdueArray.length,
                pendingArray: pendingArray.length,
                paymentsArray: paymentsArray.length
            });

// Calculate monthly payments (current month)
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();

            const paymentsThisMonth = paymentsArray.filter(payment => {
                try {
                    if (!payment || !payment.paymentDate) return false;
                    const paymentDate = new Date(payment.paymentDate);
                    return paymentDate.getMonth() === currentMonth &&
                        paymentDate.getFullYear() === currentYear &&
                        payment.status === 'PROCESSED'; // Only count processed payments
                } catch (e) {
                    console.error('Error filtering payment:', payment, e);
                    return false;
                }
            });

            const monthlyPayments = paymentsThisMonth.reduce((sum, payment) => {
                return sum + (parseFloat(payment.amount) || 0);
            }, 0);

// Format the data for the IntroCard
            setStats([
                {
                    value: formatCurrency(outstandingData?.totalOutstandingAmount || 0),
                    label: 'Total Outstanding'
                },
                {
                    value: pendingArray.length.toString(),
                    label: 'Pending Invoices'
                },
                {
                    value: overdueArray.length.toString(),
                    label: 'Overdue Invoices'
                },
                {
                    value: formatCurrency(monthlyPayments),
                    label: 'Monthly Payments'
                }
            ]);

        } catch (err) {
            console.error("Error fetching payables stats:", err);
            showError('Failed to load payables statistics: ' + err.message);

            // Set error state stats
            setStats([
                {
                    value: '--',
                    label: 'Total Outstanding'
                },
                {
                    value: '--',
                    label: 'Pending Invoices'
                },
                {
                    value: '--',
                    label: 'Overdue Invoices'
                },
                {
                    value: '--',
                    label: 'Monthly Payments'
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

// Helper function to format currency
    const formatCurrency = (amount) => {
        if (!amount || amount === 'null' || amount === 'undefined') {
            return '$0';
        }

        const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

        if (isNaN(numericAmount)) {
            return '$0';
        }

        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(numericAmount);
    };

    const renderTabContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <PayablesDashboard />;
            case 'invoices':
                return <InvoiceManagement />;
            case 'payments':
                return <PaymentManagement />;
            case 'aging':
                return <AgingReport />;
            default:
                return <PayablesDashboard />;
        }
    };

    const handleInfoClick = () => {
        showSuccess('Accounts Payable manages all vendor invoices, payment processing, and supplier relationships. Track outstanding balances, process payments, and monitor aging reports to maintain healthy cash flow.');
    };

    return (
        <div className="payables-container">
            {/* Enhanced IntroCard with Icon */}
            <IntroCard
                icon={<FaFileInvoiceDollar />}
                label="FINANCE MANAGEMENT"
                title="Accounts Payable"
                stats={loading ? [] : stats}
                onInfoClick={handleInfoClick}
            />

            <div className="payables-content-container">
                {/* Tab Navigation */}
                <div className="tabs-header">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.icon}
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="payables-content">
                    {renderTabContent()}
                </div>
            </div>
        </div>
    );
};

export default Payables;