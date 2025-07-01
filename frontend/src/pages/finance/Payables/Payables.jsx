import React, { useState } from 'react';
import { FaFileInvoiceDollar, FaMoneyBillWave, FaChartLine, FaClipboardList } from 'react-icons/fa';
import './Payables.css';
import { useSnackbar } from "../../../contexts/SnackbarContext.jsx";

// Import your components (we'll create these step by step)
import InvoiceManagement from './InvoiceManagement/InvoiceManagement.jsx';
import PaymentManagement from './PaymentManagement/PaymentManagement';
 import AgingReport from './AgingReport/AgingReport';
 import PayablesDashboard from './PayablesDashboard/PayablesDashboard.jsx';

const Payables = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const { showSuccess, showError } = useSnackbar();

    const tabs = [
        { id: 'dashboard', label: 'Dashboard', icon: <FaClipboardList /> },
        { id: 'invoices', label: 'Invoice Management', icon: <FaFileInvoiceDollar /> },
        { id: 'payments', label: 'Payment Management', icon: <FaMoneyBillWave /> },
        { id: 'aging', label: 'Aging Report', icon: <FaChartLine /> }
    ];

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

    return (
        <div className="payables-container">
            <div className="payables-tabs">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`payables-tab ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.icon}
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>
            <div className="payables-content">
                {renderTabContent()}
            </div>
        </div>
    );
};

export default Payables;