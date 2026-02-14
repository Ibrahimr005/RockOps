import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../../components/common/PageHeader/PageHeader.jsx';
import Tabs from '../../../components/common/Tabs/Tabs.jsx';
import Snackbar from '../../../components/common/Snackbar/Snackbar.jsx';
import PendingReturns from './PendingReturns/PendingReturns.jsx';
import ConfirmedReturns from './ConfirmedReturns/ConfirmedReturns.jsx';
import { poReturnService } from '../../../services/procurement/poReturnService.js';
import './PurchaseOrderReturns.scss';

const PurchaseOrderReturnsPage = () => {
    const navigate = useNavigate();
    const [returns, setReturns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'confirmed'

    const [showNotification, setShowNotification] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationType, setNotificationType] = useState('success');

    useEffect(() => {
        fetchReturns();
    }, []);

    const fetchReturns = async () => {
        try {
            setLoading(true);
            const data = await poReturnService.getAll();
            setReturns(data);
            setError(null);
        } catch (err) {
            setError('Failed to load purchase order returns.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const pendingReturns = useMemo(() =>
            returns.filter(ret => ret.status === 'PENDING'),
        [returns]
    );

    const confirmedReturns = useMemo(() =>
            returns.filter(ret => ret.status === 'CONFIRMED'),
        [returns]
    );

    const showSuccessNotification = (message) => {
        setNotificationMessage(String(message || 'Operation successful'));
        setNotificationType('success');
        setShowNotification(true);
    };

    const showErrorNotification = (message) => {
        setNotificationMessage(String(message || 'An error occurred'));
        setNotificationType('error');
        setShowNotification(true);
    };

    return (
        <div className="po-returns-container">
            <PageHeader
                title="Purchase Order Returns"
                subtitle="Track and manage all purchase order return requests awaiting confirmation from merchants"
            />

            <Tabs
                tabs={[
                    {
                        id: 'pending',
                        label: 'Pending Returns',
                        badge: pendingReturns.length
                    },
                    {
                        id: 'confirmed',
                        label: 'Confirmed Returns',
                        badge: confirmedReturns.length
                    }
                ]}
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />

            <div className="po-returns-table-container">
                {activeTab === 'pending' ? (
                    <PendingReturns
                        returns={pendingReturns}
                        loading={loading}
                        onDataChange={fetchReturns}
                        onSuccess={showSuccessNotification}
                        onError={showErrorNotification}
                    />
                ) : (
                    <ConfirmedReturns
                        returns={confirmedReturns}
                        loading={loading}
                        onDataChange={fetchReturns}
                        onSuccess={showSuccessNotification}
                        onError={showErrorNotification}
                    />
                )}
            </div>

            <Snackbar
                type={notificationType}
                text={notificationMessage}
                isVisible={showNotification}
                onClose={() => setShowNotification(false)}
                duration={3000}
            />
        </div>
    );
};

export default PurchaseOrderReturnsPage;