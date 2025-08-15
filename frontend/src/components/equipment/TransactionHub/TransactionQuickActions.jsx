import React, { useState, useEffect } from 'react';
import { X, Package, Wrench, Plus, Trash2, Search } from 'lucide-react';
import './QuickActions.scss';
import { equipmentService } from '../../../services/equipmentService';
import { warehouseService } from '../../../services/warehouseService';
import { itemService } from '../../../services/warehouse/itemService';

const TransactionQuickActions = ({
    equipmentId,
    onComplete,
    onCancel
}) => {
    const [activeAction, setActiveAction] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    // Form data
    const [transactionType, setTransactionType] = useState('CONSUMABLE');
    const [selectedWarehouse, setSelectedWarehouse] = useState('');
    const [selectedItems, setSelectedItems] = useState([]);
    const [description, setDescription] = useState('');
    
    // Data states
    const [warehouses, setWarehouses] = useState([]);
    const [availableItems, setAvailableItems] = useState([]);
    const [itemSearchTerm, setItemSearchTerm] = useState('');

    useEffect(() => {
        fetchWarehouses();
    }, []);

    useEffect(() => {
        if (selectedWarehouse) {
            fetchWarehouseItems(selectedWarehouse);
        }
    }, [selectedWarehouse]);

    const fetchWarehouses = async () => {
        try {
            const response = await warehouseService.getAll();
            setWarehouses(response.data || response || []);
        } catch (error) {
            console.error('Failed to fetch warehouses:', error);
            setError('Failed to load warehouses');
        }
    };

    const fetchWarehouseItems = async (warehouseId) => {
        try {
            setLoading(true);
            const response = await warehouseService.getItems(warehouseId);
            setAvailableItems(response.data || response || []);
        } catch (error) {
            console.error('Failed to fetch warehouse items:', error);
            setError('Failed to load warehouse items');
        } finally {
            setLoading(false);
        }
    };

    const quickActions = [
        {
            id: 'request_consumables',
            title: 'Request Consumables',
            description: 'Request consumable items from warehouse',
            icon: Package,
            color: 'blue',
            action: () => {
                setTransactionType('CONSUMABLE');
                setActiveAction('request_items');
            }
        },
        {
            id: 'request_maintenance',
            title: 'Request Maintenance Items',
            description: 'Request items for maintenance activities',
            icon: Wrench,
            color: 'orange',
            action: () => {
                setTransactionType('MAINTENANCE');
                setActiveAction('request_items');
            }
        }
    ];

    const filteredItems = availableItems.filter(item =>
        item.itemType?.name?.toLowerCase().includes(itemSearchTerm.toLowerCase()) ||
        item.itemType?.category?.name?.toLowerCase().includes(itemSearchTerm.toLowerCase())
    );

    const addItemToRequest = (warehouseItem) => {
        const existingIndex = selectedItems.findIndex(item => item.warehouseItemId === warehouseItem.id);
        
        if (existingIndex >= 0) {
            // Update existing item quantity
            setSelectedItems(prev => prev.map((item, index) =>
                index === existingIndex
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            ));
        } else {
            // Add new item
            setSelectedItems(prev => [...prev, {
                warehouseItemId: warehouseItem.id,
                itemTypeId: warehouseItem.itemType.id,
                itemTypeName: warehouseItem.itemType.name,
                availableQuantity: warehouseItem.quantity,
                unit: warehouseItem.itemType.unit,
                category: warehouseItem.itemType.category?.name,
                quantity: 1
            }]);
        }
    };

    const updateItemQuantity = (index, newQuantity) => {
        if (newQuantity <= 0) {
            removeItem(index);
        } else {
            setSelectedItems(prev => prev.map((item, i) =>
                i === index
                    ? { ...item, quantity: Math.min(newQuantity, item.availableQuantity) }
                    : item
            ));
        }
    };

    const removeItem = (index) => {
        setSelectedItems(prev => prev.filter((_, i) => i !== index));
    };

    const generateBatchNumber = () => {
        return Math.floor(Math.random() * 1000000);
    };

    const handleSubmitRequest = async () => {
        if (!selectedWarehouse || selectedItems.length === 0) {
            setError('Please select a warehouse and at least one item');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const batchNumber = generateBatchNumber();
            const transactionItems = selectedItems.map(item => ({
                itemTypeId: item.itemTypeId,
                quantity: item.quantity
            }));

            const requestData = {
                receiverId: selectedWarehouse,
                receiverType: 'WAREHOUSE',
                batchNumber,
                purpose: transactionType,
                items: transactionItems,
                description: description || `${transactionType.toLowerCase()} request`,
                transactionDate: new Date().toISOString()
            };

            await equipmentService.sendTransaction(equipmentId, requestData);
            
            onComplete();
        } catch (error) {
            console.error('Failed to create transaction:', error);
            setError(error.response?.data?.message || 'Failed to create transaction request');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setSelectedWarehouse('');
        setSelectedItems([]);
        setDescription('');
        setItemSearchTerm('');
        setError('');
    };

    const renderQuickActionGrid = () => (
        <div className="quick-actions-grid">
            {quickActions.map(action => {
                const ActionIcon = action.icon;
                return (
                    <button
                        key={action.id}
                        className={`quick-actions-card ${action.color}`}
                        onClick={action.action}
                    >
                        <ActionIcon className="quick-actions-card-icon" />
                        <div className="quick-actions-card-content">
                            <h3>{action.title}</h3>
                            <p>{action.description}</p>
                        </div>
                    </button>
                );
            })}
        </div>
    );

    const renderItemRequestForm = () => (
        <div className="quick-actions-form">
            <div className="quick-actions-form-header">
                <h3>
                    {transactionType === 'CONSUMABLE' ? 'Request Consumables' : 'Request Maintenance Items'}
                </h3>
                <p>Select items to request from warehouse</p>
            </div>

            <div className="quick-actions-form-section">
                <label>Select Warehouse *</label>
                <select
                    value={selectedWarehouse}
                    onChange={(e) => setSelectedWarehouse(e.target.value)}
                    className="quick-actions-form-select"
                    required
                >
                    <option value="">Choose warehouse...</option>
                    {warehouses.map(warehouse => (
                        <option key={warehouse.id} value={warehouse.id}>
                            {warehouse.name} - {warehouse.location}
                        </option>
                    ))}
                </select>
            </div>

            {selectedWarehouse && (
                <>
                    <div className="quick-actions-form-section">
                        <label>Search Items</label>
                        <div className="quick-actions-search-input">
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder="Search by item name or category..."
                                value={itemSearchTerm}
                                onChange={(e) => setItemSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="quick-actions-items-section">
                        <h4>Available Items</h4>
                        {loading ? (
                            <div className="quick-actions-loading">Loading items...</div>
                        ) : filteredItems.length === 0 ? (
                            <div className="quick-actions-empty">
                                No items found in this warehouse
                            </div>
                        ) : (
                            <div className="quick-actions-items-grid">
                                {filteredItems.map(item => (
                                    <div
                                        key={item.id}
                                        className="quick-actions-item-card"
                                        onClick={() => addItemToRequest(item)}
                                    >
                                        <div className="quick-actions-item-info">
                                            <h5>{item.itemType?.name}</h5>
                                            <p>{item.itemType?.category?.name}</p>

                                        </div>
                                        <button className="quick-actions-item-add">
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}

            {selectedItems.length > 0 && (
                <div className="quick-actions-selected-section">
                    <h4>Selected Items ({selectedItems.length})</h4>
                    <div className="quick-actions-selected-list">
                        {selectedItems.map((item, index) => (
                            <div key={index} className="quick-actions-selected-item">
                                <div className="quick-actions-selected-item-info">
                                    <h5>{item.itemTypeName}</h5>
                                    <p>{item.category}</p>
                                </div>
                                <div className="quick-actions-selected-item-controls">
                                    <input
                                        type="number"
                                        min="1"
                                        max={item.availableQuantity}
                                        value={item.quantity}
                                        onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 0)}
                                        className="quick-actions-quantity-input"
                                    />
                                    <button
                                        onClick={() => removeItem(index)}
                                        className="quick-actions-remove-btn"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="quick-actions-form-section">
                <label>Description (Optional)</label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={`Additional details about this ${transactionType.toLowerCase()} request...`}
                    className="quick-actions-form-textarea"
                    rows={3}
                />
            </div>
        </div>
    );

    return (
        <div className="quick-actions-overlay">
            <div className="quick-actions-modal">
                <div className="quick-actions-header">
                    <div className="quick-actions-title">
                        <h2>
                            {activeAction ? 'Create Transaction Request' : 'Quick Actions'}
                        </h2>
                        <p>
                            {activeAction 
                                ? 'Fill out the form to create a new transaction request'
                                : 'Choose an action to get started'
                            }
                        </p>
                    </div>
                    <button 
                        className="quick-actions-close"
                        onClick={onCancel}
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="quick-actions-content">
                    {!activeAction && renderQuickActionGrid()}
                    {activeAction === 'request_items' && renderItemRequestForm()}
                </div>

                {error && (
                    <div className="quick-actions-error">
                        {error}
                    </div>
                )}

                <div className="quick-actions-footer">
                    {activeAction ? (
                        <div className="quick-actions-nav">
                            <button 
                                className="primary-outline"
                                onClick={() => {
                                    setActiveAction(null);
                                    resetForm();
                                }}
                            >
                                Back
                            </button>
                            <button 
                                className="quick-actions-btn primary"
                                onClick={handleSubmitRequest}
                                disabled={loading || !selectedWarehouse || selectedItems.length === 0}
                            >
                                {loading ? 'Creating...' : 'Create Request'}
                            </button>
                        </div>
                    ) : (
                        <button 
                            className="btn-cancel"
                            onClick={onCancel}
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TransactionQuickActions; 