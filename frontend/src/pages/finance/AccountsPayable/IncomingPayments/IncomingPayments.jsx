import React, { useState, useEffect } from 'react';
import { FiClock, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import PageHeader from '../../../../components/common/PageHeader/PageHeader';
import Tabs from '../../../../components/common/Tabs/Tabs';
import Snackbar from '../../../../components/common/Snackbar/Snackbar';
import PendingIncomingPayments from './PendingIncomingPayments/PendingIncomingPayments';
import ConfirmedIncomingPayments from './ConfirmedIncomingPayments/ConfirmedIncomingPayments';
import { incomingPaymentService } from '../../../../services/finance/incomingPaymentService';
import './IncomingPayments.scss';

const IncomingPayments = () => {
    const [activeTab, setActiveTab] = useState('pending');
    const [incomingPayments, setIncomingPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success');

    useEffect(() => {
        fetchIncomingPayments();
    }, []);

    const fetchIncomingPayments = async () => {
        try {
            setLoading(true);
            const data = await incomingPaymentService.getAll();
            console.log('📦 Incoming Payments Data:', data);  // ADD THIS LINE
            setIncomingPayments(data);
            setError(null);
        } catch (err) {
            setError('Failed to load incoming payments.');
            console.error(err);
            showErrorNotification('Failed to load incoming payments: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const pendingPayments = incomingPayments.filter(p => p.status === 'PENDING');
    const confirmedPayments = incomingPayments.filter(p => p.status === 'CONFIRMED');

    const showSuccessNotification = (message) => {
        setNotificationMessage(message);
        setNotificationType('success');
        setShowNotification(true);
    };

    const showErrorNotification = (message) => {
        setNotificationMessage(message);
        setNotificationType('error');
        setShowNotification(true);
    };

    return (
        <div className="incoming-payments-container">

            <Tabs
                tabs={[
                    {
                        id: 'pending',
                        label: 'Pending Review',
                        badge: pendingPayments.length,
                        icon: <FiClock />
                    },
                    {
                        id: 'confirmed',
                        label: 'Confirmed',
                        badge: confirmedPayments.length,
                        icon: <FiCheckCircle />
                    }
                ]}
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />

            <div className="incoming-payments-table-container">
                {activeTab === 'pending' ? (
                    <PendingIncomingPayments
                        payments={pendingPayments}
                        loading={loading}
                        onDataChange={fetchIncomingPayments}
                        onSuccess={showSuccessNotification}
                        onError={showErrorNotification}
                    />
                ) : (
                    <ConfirmedIncomingPayments
                        payments={confirmedPayments}
                        loading={loading}
                        onDataChange={fetchIncomingPayments}
                        onSuccess={showSuccessNotification}
                        onError={showErrorNotification}
                    />
                )}
            </div>

            <Snackbar
                show={showNotification}
                type={notificationType}
                message={notificationMessage}
                onClose={() => setShowNotification(false)}
                duration={notificationType === 'error' ? 5000 : 3000}
            />
        </div>
    );
};

export default IncomingPayments;