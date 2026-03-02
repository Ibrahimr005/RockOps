// EquipmentItemForm.jsx — Equipment spec item picker for RequestOrderModal Step 2
import React, { useState, useEffect } from 'react';
import { FaPlus, FaTimes } from 'react-icons/fa';
import { equipmentTypeService } from '../../../services/equipmentTypeService.js';
import { equipmentBrandService } from '../../../services/equipmentBrandService.js';
import './EquipmentItemForm.scss';

const EMPTY_EQUIPMENT_ITEM = {
    name: '',
    description: '',
    equipmentTypeId: '',
    equipmentBrandId: '',
    model: '',
    manufactureYear: '',
    countryOfOrigin: '',
    specifications: '',
    estimatedBudget: '',
    quantity: '1',
    comment: ''
};

const EquipmentItemForm = ({ items, onChange, isSubmitting }) => {
    const [equipmentTypes, setEquipmentTypes] = useState([]);
    const [equipmentBrands, setEquipmentBrands] = useState([]);

    useEffect(() => {
        const fetchLookups = async () => {
            try {
                const [typesRes, brandsRes] = await Promise.all([
                    equipmentTypeService.getAllEquipmentTypes(),
                    equipmentBrandService.getAllEquipmentBrands()
                ]);
                const typesData = typesRes?.data || typesRes;
                const brandsData = brandsRes?.data || brandsRes;
                setEquipmentTypes(Array.isArray(typesData) ? typesData : []);
                setEquipmentBrands(Array.isArray(brandsData) ? brandsData : []);
            } catch (err) {
                console.error('Error fetching equipment lookups:', err);
            }
        };
        fetchLookups();
    }, []);

    const handleItemChange = (index, field, value) => {
        const updated = [...items];
        updated[index] = { ...updated[index], [field]: value };
        onChange(updated);
    };

    const handleAddItem = () => {
        onChange([...items, { ...EMPTY_EQUIPMENT_ITEM }]);
    };

    const handleRemoveItem = (index) => {
        if (items.length <= 1) return;
        const updated = [...items];
        updated.splice(index, 1);
        onChange(updated);
    };

    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 30 }, (_, i) => currentYear + 1 - i);

    return (
        <div className="equipment-item-form">
            <div className="section-header">
                <h3 className="modal-section-title">Equipment Specifications</h3>
                <button
                    type="button"
                    className="btn-add-item"
                    onClick={handleAddItem}
                    disabled={isSubmitting}
                >
                    <FaPlus />
                    Add Another Equipment
                </button>
            </div>

            <div className="items-container">
                {items.map((item, index) => (
                    <div key={index} className="item-card equipment-item-card">
                        <div className="item-header">
                            <span className="item-number">Equipment {index + 1}</span>
                            {items.length > 1 && (
                                <button
                                    type="button"
                                    className="btn-remove-item"
                                    onClick={() => handleRemoveItem(index)}
                                    disabled={isSubmitting}
                                >
                                    <FaTimes />
                                    Remove
                                </button>
                            )}
                        </div>

                        <div className="item-body">
                            {/* Row 1: Name + Equipment Type */}
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">
                                        Equipment Name <span className="required">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={item.name || ''}
                                        onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                                        placeholder="e.g. CAT 320 Excavator"
                                        disabled={isSubmitting}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">
                                        Equipment Type <span className="required">*</span>
                                    </label>
                                    <select
                                        className="form-select"
                                        value={item.equipmentTypeId || ''}
                                        onChange={(e) => handleItemChange(index, 'equipmentTypeId', e.target.value)}
                                        disabled={isSubmitting}
                                    >
                                        <option value="">Select Equipment Type</option>
                                        {equipmentTypes.map(type => (
                                            <option key={type.id} value={type.id}>
                                                {type.name || 'Unknown Type'}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Row 2: Brand + Model */}
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Brand</label>
                                    <select
                                        className="form-select"
                                        value={item.equipmentBrandId || ''}
                                        onChange={(e) => handleItemChange(index, 'equipmentBrandId', e.target.value)}
                                        disabled={isSubmitting}
                                    >
                                        <option value="">Select Brand</option>
                                        {equipmentBrands.map(brand => (
                                            <option key={brand.id} value={brand.id}>
                                                {brand.name || 'Unknown Brand'}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Model</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={item.model || ''}
                                        onChange={(e) => handleItemChange(index, 'model', e.target.value)}
                                        placeholder="e.g. 320GC"
                                        disabled={isSubmitting}
                                    />
                                </div>
                            </div>

                            {/* Row 3: Manufacture Year + Country of Origin */}
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Manufacture Year</label>
                                    <select
                                        className="form-select"
                                        value={item.manufactureYear || ''}
                                        onChange={(e) => handleItemChange(index, 'manufactureYear', e.target.value)}
                                        disabled={isSubmitting}
                                    >
                                        <option value="">Select Year</option>
                                        {yearOptions.map(year => (
                                            <option key={year} value={year}>{year}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Country of Origin</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={item.countryOfOrigin || ''}
                                        onChange={(e) => handleItemChange(index, 'countryOfOrigin', e.target.value)}
                                        placeholder="e.g. Japan, USA"
                                        disabled={isSubmitting}
                                    />
                                </div>
                            </div>

                            {/* Row 4: Quantity + Estimated Budget */}
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">
                                        Quantity <span className="required">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={item.quantity || ''}
                                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                        onWheel={(e) => e.target.blur()}
                                        min="1"
                                        step="1"
                                        placeholder="1"
                                        disabled={isSubmitting}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Estimated Budget ($)</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={item.estimatedBudget || ''}
                                        onChange={(e) => handleItemChange(index, 'estimatedBudget', e.target.value)}
                                        onWheel={(e) => e.target.blur()}
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        disabled={isSubmitting}
                                    />
                                </div>
                            </div>

                            {/* Specifications textarea */}
                            <div className="form-group">
                                <label className="form-label">Specifications</label>
                                <textarea
                                    className="form-textarea"
                                    value={item.specifications || ''}
                                    onChange={(e) => handleItemChange(index, 'specifications', e.target.value)}
                                    placeholder="Enter detailed technical specifications, features, or requirements"
                                    rows={3}
                                    disabled={isSubmitting}
                                />
                            </div>

                            {/* Description / Additional Notes */}
                            <div className="form-group">
                                <label className="form-label">Additional Notes</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={item.comment || ''}
                                    onChange={(e) => handleItemChange(index, 'comment', e.target.value)}
                                    placeholder="Any extra details about this equipment request"
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default EquipmentItemForm;
