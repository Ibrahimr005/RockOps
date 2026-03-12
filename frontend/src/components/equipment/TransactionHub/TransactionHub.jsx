import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Package, CheckCircle, RefreshCw } from 'lucide-react';
import './TransactionHub.scss';
import UnifiedTransactionProcessor from './UnifiedTransactionProcessor';
import { equipmentService } from '../../../services/equipmentService';
import Snackbar from '../../common/Snackbar2/Snackbar2';
import { Button } from '../../../components/common/Button';

const TransactionHub = forwardRef(({ 
    equipmentId,
    onTransactionUpdate 
}, ref) => {
    const [activeTab, setActiveTab] = useState("incoming");
    const [loading, setLoading] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    
    // Transaction data states
    const [incomingTransactions, setIncomingTransactions] = useState([]);
    const [transactionHistory, setTransactionHistory] = useState([]);
    
    // UI states
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [showProcessor, setShowProcessor] = useState(false);
    
    // Snackbar state
    const [snackbar, setSnackbar] = useState({
        isVisible: false,
        type: 'success',
        text: ''
    });

    // Tab configuration
    const tabs = [
        {
            id: "incoming",
            label: "Incoming Transactions",
            icon: Package,
            count: incomingTransactions.length,
            description: "Transactions requiring your action"
        },
        {
            id: "history",
            label: "Transaction History",
            icon: CheckCircle,
            count: transactionHistory.length,
            description: "Completed and resolved transactions"
        }
    ];

    // Expose refresh methods to parent
    useImperativeHandle(ref, () => ({
        refreshTransactions: fetchAllTransactions,
        refreshHub: fetchAllTransactions
    }));

    useEffect(() => {
        fetchAllTransactions();
    }, [equipmentId, refreshTrigger]);

    const fetchAllTransactions = async () => {
        if (!equipmentId) return;
        
        setLoading(true);
        try {
            const response = await equipmentService.getEquipmentTransactions(equipmentId);
            const transactions = response.data || [];
            
            // Process and categorize transactions
            const enrichedTransactions = transactions.map((transaction) => ({
                ...transaction,
                senderName: transaction.senderName || 'Unknown',
                receiverName: transaction.receiverName || 'Unknown',
                isIncoming: transaction.receiverId === equipmentId && transaction.status === 'PENDING',
                requiresAction: transaction.status === 'PENDING' &&
                              transaction.receiverId === equipmentId
            }));
            
            // Categorize transactions
            const incoming = enrichedTransactions.filter(t => t.isIncoming);
            const history = enrichedTransactions.filter(t =>
                ['ACCEPTED', 'REJECTED', 'PARTIALLY_ACCEPTED', 'RESOLVED'].includes(t.status)
            );

            setIncomingTransactions(incoming);
            setTransactionHistory(history);
            
        } catch (error) {
            console.error('Failed to fetch transactions:', error);
            showSnackbar('error', 'Failed to load transactions');
        } finally {
            setLoading(false);
        }
    };

    const showSnackbar = (type, text) => {
        setSnackbar({
            isVisible: true,
            type,
            text
        });
    };

    const hideSnackbar = () => {
        setSnackbar(prev => ({ ...prev, isVisible: false }));
    };

    const handleTransactionSelect = (transaction) => {
        setSelectedTransaction(transaction);
        setShowProcessor(true);
    };

    const handleTransactionProcessed = () => {
        setShowProcessor(false);
        setSelectedTransaction(null);
        triggerRefresh();
        if (onTransactionUpdate) {
            onTransactionUpdate();
        }
        showSnackbar('success', 'Transaction processed successfully');
    };

    const triggerRefresh = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    const renderTransactionCard = (transaction) => (
        <div 
            key={transaction.id} 
            className="transaction-hub-card"
            onClick={() => handleTransactionSelect(transaction)}
        >
            <div className="transaction-hub-card-header">
                <div className="transaction-hub-card-info">
                    <span className="transaction-hub-card-batch">
                        Batch #{transaction.batchNumber}
                    </span>
                    <span className={`transaction-hub-card-purpose ${transaction.purpose?.toLowerCase()}`}>
                        {transaction.purpose || 'GENERAL'}
                    </span>
                </div>
                <div className={`transaction-hub-card-status ${transaction.status?.toLowerCase()}`}>
                    {transaction.status}
                </div>
            </div>
            
            <div className="transaction-hub-card-body">
                <div className="transaction-hub-card-parties">
                    <div className="transaction-hub-card-party">
                        <span className="transaction-hub-card-label">From:</span>
                        <span className="transaction-hub-card-value">{transaction.senderName}</span>
                    </div>
                    <div className="transaction-hub-card-party">
                        <span className="transaction-hub-card-label">To:</span>
                        <span className="transaction-hub-card-value">{transaction.receiverName}</span>
                    </div>
                </div>
                
                <div className="transaction-hub-card-details">
                    <span className="transaction-hub-card-items">
                        {transaction.items?.length || 0} items
                    </span>
                    <span className="transaction-hub-card-date">
                        {new Date(transaction.transactionDate).toLocaleDateString('en-GB')}
                    </span>
                </div>
                
                {transaction.requiresAction && (
                    <div className="transaction-hub-card-action-indicator">
                        Action Required
                    </div>
                )}
            </div>
        </div>
    );

    const renderTabContent = () => {
        const currentTab = tabs.find(tab => tab.id === activeTab);
        let transactions = [];
        
        switch (activeTab) {
            case 'incoming':
                transactions = incomingTransactions;
                break;
            case 'history':
                transactions = transactionHistory;
                break;
            default:
                transactions = [];
        }

        if (loading) {
            return (
                <div className="transaction-hub-loading">
                    <RefreshCw className="transaction-hub-loading-icon" />
                    <span>Loading transactions...</span>
                </div>
            );
        }

        if (transactions.length === 0) {
            return (
                <div className="transaction-hub-empty">
                    <currentTab.icon className="transaction-hub-empty-icon" />
                    <h3>No {currentTab.label}</h3>
                    <p>{currentTab.description}</p>
                    {/*{activeTab === 'incoming' && (*/}
                    {/*    <button */}
                    {/*        className="transaction-hub-empty-action"*/}
                    {/*        onClick={() => setShowQuickActions(true)}*/}
                    {/*    >*/}
                    {/*        <Plus size={16} />*/}
                    {/*        Create New Request*/}
                    {/*    </button>*/}
                    {/*)}*/}
                </div>
            );
        }

        return (
            <div className="transaction-hub-content-grid">
                {transactions.map(renderTransactionCard)}
            </div>
        );
    };

    return (
        <div className="transaction-hub-container">
            <div className="transaction-hub-header">
                <div className="transaction-hub-title-section">
                    <h2 className="transaction-hub-title">Equipment Transactions</h2>
                    <p className="transaction-hub-subtitle">
                        Manage incoming and completed transactions
                    </p>
                </div>

                <div className="transaction-hub-actions">
                    <Button
                        variant="ghost"
                        className="transaction-hub-refresh-btn"
                        onClick={triggerRefresh}
                        disabled={loading}
                    >
                        <RefreshCw size={16} className={loading ? 'spinning' : ''} />
                        Refresh
                    </Button>
                </div>
            </div>

            <div className="transaction-hub-tabs">
                {tabs.map(tab => {
                    const TabIcon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            className={`transaction-hub-tab ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <div className="transaction-hub-tab-content">
                                <div className="transaction-hub-tab-header">
                                    <TabIcon size={18} />
                                    <span className="transaction-hub-tab-label">{tab.label}</span>
                                </div>
                                {tab.count > 0 && (
                                    <span className="transaction-hub-tab-count">{tab.count}</span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            <div className="transaction-hub-content">
                {renderTabContent()}
            </div>

            {/* Transaction Processor Modal */}
            {showProcessor && selectedTransaction && (
                <UnifiedTransactionProcessor
                    equipmentId={equipmentId}
                    transaction={selectedTransaction}
                    onComplete={handleTransactionProcessed}
                    onCancel={() => setShowProcessor(false)}
                />
            )}

            {/* Snackbar */}
            <Snackbar
                isVisible={snackbar.isVisible}
                type={snackbar.type}
                text={snackbar.text}
                onClose={hideSnackbar}
            />
        </div>
    );
});

TransactionHub.displayName = 'TransactionHub';

export default TransactionHub; 