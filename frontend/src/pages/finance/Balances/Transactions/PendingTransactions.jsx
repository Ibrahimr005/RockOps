// import React, { useState, useEffect } from 'react';
// import { FaCheck, FaTimes, FaEye } from 'react-icons/fa';
// import DataTable from '../../../../components/common/DataTable/DataTable';
// import { useSnackbar } from '../../../../contexts/SnackbarContext.jsx';
// import { financeService } from '../../../../services/financeService.js';
// import './PendingTransactions.css';
//
// const PendingTransactions = ({ onDataChange }) => {
//     const [transactions, setTransactions] = useState([]);
//     const [loading, setLoading] = useState(true);
//     const [showRejectModal, setShowRejectModal] = useState(false);
//     const [selectedTransaction, setSelectedTransaction] = useState(null);
//     const [rejectionReason, setRejectionReason] = useState('');
//     const { showSuccess, showError } = useSnackbar();
//
//     useEffect(() => {
//         fetchPendingTransactions();
//     }, []);
//
//     const fetchPendingTransactions = async () => {
//         try {
//             setLoading(true);
//             const response = await financeService.balances.transactions.getPending();
//             setTransactions(response.data || []);
//         } catch (err) {
//             console.error('Error fetching pending transactions:', err);
//             showError('Failed to load pending transactions');
//         } finally {
//             setLoading(false);
//         }
//     };
//
//     const handleApprove = async (transaction) => {
//         if (!window.confirm('Are you sure you want to approve this transaction?')) {
//             return;
//         }
//
//         try {
//             await financeService.balances.transactions.approve(transaction.id);
//             showSuccess('Transaction approved successfully');
//             fetchPendingTransactions();
//             if (onDataChange) onDataChange();
//         } catch (err) {
//             console.error('Error approving transaction:', err);
//             showError(err.response?.data?.message || 'Failed to approve transaction');
//         }
//     };
//
//     const handleRejectClick = (transaction) => {
//         setSelectedTransaction(transaction);
//         setRejectionReason('');
//         setShowRejectModal(true);
//     };
//
//     const handleRejectSubmit = async () => {
//         if (!rejectionReason.trim()) {
//             showError('Please provide a rejection reason');
//             return;
//         }
//
//         try {
//             await financeService.balances.transactions.reject(selectedTransaction.id, rejectionReason);
//             showSuccess('Transaction rejected');
//             setShowRejectModal(false);
//             fetchPendingTransactions();
//             if (onDataChange) onDataChange();
//         } catch (err) {
//             console.error('Error rejecting transaction:', err);
//             showError('Failed to reject transaction');
//         }
//     };
//
//     const formatCurrency = (amount) => {
//         if (!amount || isNaN(amount)) return 'EGP 0.00';
//         return new Intl.NumberFormat('en-EG', {
//             style: 'currency',
//             currency: 'EGP',
//             minimumFractionDigits: 2
//         }).format(amount);
//     };
//
//     const formatDateTime = (dateString) => {
//         if (!dateString) return 'N/A';
//         return new Date(dateString).toLocaleString('en-US', {
//             year: 'numeric',
//             month: 'short',
//             day: 'numeric',
//             hour: '2-digit',
//             minute: '2-digit'
//         });
//     };
//
//     const getTransactionTypeStyle = (type) => {
//         switch (type) {
//             case 'DEPOSIT':
//                 return { color: 'var(--color-success)', fontWeight: 600 };
//             case 'WITHDRAWAL':
//                 return { color: 'var(--color-danger)', fontWeight: 600 };
//             case 'TRANSFER':
//                 return { color: 'var(--color-info)', fontWeight: 600 };
//             default:
//                 return {};
//         }
//     };
//
//     const columns = [
//         {
//             header: 'Created At',
//             accessor: 'createdAt',
//             sortable: true,
//             render: (row) => formatDateTime(row.createdAt)
//         },
//         {
//             header: 'Type',
//             accessor: 'transactionType',
//             sortable: true,
//             render: (row) => (
//                 <span style={getTransactionTypeStyle(row.transactionType)}>
//                     {row.transactionType}
//                 </span>
//             )
//         },
//         {
//             header: 'Amount',
//             accessor: 'amount',
//             sortable: true,
//             render: (row) => (
//                 <span style={{ fontWeight: 700, fontSize: '15px' }}>
//                     {formatCurrency(row.amount)}
//                 </span>
//             )
//         },
//         {
//             header: 'From Account',
//             accessor: 'accountName',
//             sortable: true,
//             render: (row) => (
//                 <div>
//                     <div style={{ fontWeight: 500 }}>{row.accountName || 'N/A'}</div>
//                     <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
//                         {row.accountType?.replace('_', ' ')}
//                     </div>
//                 </div>
//             )
//         },
//         {
//             header: 'To Account',
//             accessor: 'toAccountName',
//             sortable: false,
//             render: (row) => {
//                 if (row.transactionType !== 'TRANSFER') {
//                     return <span style={{ color: 'var(--color-text-secondary)' }}>—</span>;
//                 }
//                 return (
//                     <div>
//                         <div style={{ fontWeight: 500 }}>{row.toAccountName || 'N/A'}</div>
//                         <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
//                             {row.toAccountType?.replace('_', ' ')}
//                         </div>
//                     </div>
//                 );
//             }
//         },
//         {
//             header: 'Created By',
//             accessor: 'createdBy',
//             sortable: true
//         },
//         {
//             header: 'Description',
//             accessor: 'description',
//             sortable: false,
//             render: (row) => (
//                 <span style={{
//                     maxWidth: '200px',
//                     display: 'block',
//                     overflow: 'hidden',
//                     textOverflow: 'ellipsis',
//                     whiteSpace: 'nowrap'
//                 }}>
//                     {row.description || 'N/A'}
//                 </span>
//             )
//         }
//     ];
//
//     const actions = [
//         {
//             label: 'Approve',
//             icon: <FaCheck />,
//             onClick: handleApprove,
//             className: 'action-approve'
//         },
//         {
//             label: 'Reject',
//             icon: <FaTimes />,
//             onClick: handleRejectClick,
//             className: 'action-reject'
//         }
//     ];
//
//     return (
//         <div className="pending-transactions">
//             <DataTable
//                 data={transactions}
//                 columns={columns}
//                 loading={loading}
//                 tableTitle="Pending Transactions"
//                 actions={actions}
//                 showSearch={true}
//                 showFilters={true}
//                 filterableColumns={[
//                     {
//                         header: 'Type',
//                         accessor: 'transactionType',
//                         filterType: 'select',
//                         filterAllText: 'All Types'
//                     }
//                 ]}
//                 emptyMessage="No pending transactions"
//                 defaultSortField="createdAt"
//                 defaultSortDirection="desc"
//             />
//
//             {showRejectModal && (
//                 <div className="modal-overlay">
//                     <div className="modal-container reject-modal">
//                         <div className="modal-header">
//                             <h2>Reject Transaction</h2>
//                             <button
//                                 className="modal-close-btn"
//                                 onClick={() => setShowRejectModal(false)}
//                             >
//                                 <FaTimes />
//                             </button>
//                         </div>
//                         <div className="modal-body">
//                             <p className="reject-info">
//                                 You are rejecting a <strong>{selectedTransaction?.transactionType}</strong> transaction
//                                 for <strong>{formatCurrency(selectedTransaction?.amount)}</strong>.
//                             </p>
//                             <div className="modern-form-field">
//                                 <label className="modern-form-label">
//                                     Rejection Reason <span className="required">*</span>
//                                 </label>
//                                 <textarea
//                                     id="rejectionReason"
//                                     value={rejectionReason}
//                                     onChange={(e) => setRejectionReason(e.target.value)}
//                                     rows="4"
//                                     placeholder="Please provide a reason for rejecting this transaction..."
//                                 />
//                             </div>
//                         </div>
//                         <div className="modal-footer">
//                             <button
//                                 className="btn-secondary"
//                                 onClick={() => setShowRejectModal(false)}
//                             >
//                                 Cancel
//                             </button>
//                             <button
//                                 className="btn-danger"
//                                 onClick={handleRejectSubmit}
//                             >
//                                 Reject Transaction
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// };
//
// export default PendingTransactions;