import React, { useState, useEffect } from 'react';
import { FaFileInvoiceDollar, FaMoneyBillWave, FaChartLine, FaClipboardList } from 'react-icons/fa';
import './Payables.css';
import { useSnackbar } from "../../../contexts/SnackbarContext.jsx";
import IntroCard from '../../../components/common/IntroCard/IntroCard';

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
            const token = localStorage.getItem('token');

            if (!token) {
                throw new Error('No authentication token found');
            }

            // Use the same endpoints as PayablesDashboard
            const [
                outstandingResponse,
                overdueResponse,
                recentPaymentsResponse,
                pendingInvoicesResponse
            ] = await Promise.all([
                // 1. Total Outstanding
                fetch('http://localhost:8080/api/v1/invoices/outstanding-total', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }),
                // 2. Overdue Invoices
                fetch('http://localhost:8080/api/v1/invoices/overdue', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }),
                // 3. Recent Payments (for monthly calculation)
                fetch('http://localhost:8080/api/v1/payments?page=0&size=100', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }),
                // 4. Pending Invoices (using status filter)
                fetch('http://localhost:8080/api/v1/invoices/status?status=PENDING', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                })
            ]);

            // Check if requests succeeded
            const responses = [outstandingResponse, overdueResponse, recentPaymentsResponse, pendingInvoicesResponse];
            for (let response of responses) {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
            }

            // Parse responses
            const [
                outstanding,
                overdue,
                recentPayments,
                pendingInvoices
            ] = await Promise.all([
                outstandingResponse.json(),
                overdueResponse.json(),
                recentPaymentsResponse.json(),
                pendingInvoicesResponse.json()
            ]);

            // Calculate monthly payments (current month)
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            const paymentsThisMonth = (recentPayments.content || recentPayments || []).filter(payment => {
                try {
                    const paymentDate = new Date(payment.paymentDate);
                    return paymentDate.getMonth() === currentMonth &&
                        paymentDate.getFullYear() === currentYear &&
                        payment.status === 'PROCESSED'; // Only count processed payments
                } catch (e) {
                    return false;
                }
            });
            const monthlyPayments = paymentsThisMonth.reduce((sum, payment) => sum + (payment.amount || 0), 0);

            // Format the data for the IntroCard
            setStats([
                {
                    value: formatCurrency(outstanding.totalOutstandingAmount || 0),
                    label: 'Total Outstanding'
                },
                {
                    value: (pendingInvoices?.length || 0).toString(),
                    label: 'Pending Invoices'
                },
                {
                    value: (overdue?.length || 0).toString(),
                    label: 'Overdue Invoices'
                },
                {
                    value: formatCurrency(monthlyPayments),
                    label: 'Monthly Payments'
                }
            ]);

        } catch (err) {
            console.error("Error fetching payables stats:", err);
            showError('Failed to load payables statistics');

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