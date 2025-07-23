import React, { useState, useEffect, useRef } from "react";
import DataTable from "../../../components/common/DataTable/DataTable.jsx";
import { FaEdit, FaTrash } from 'react-icons/fa';
import "./WarehouseViewItemCategories.scss";
import { itemCategoryService } from '../../../services/warehouse/itemCategoryService';

const ChildCategoriesTable = ({ onDelete, onRefresh, displaySnackbar }) => {
    const [childCategories, setChildCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [categoryAction, setCategoryAction] = useState('create');
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryDescription, setNewCategoryDescription] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedParentCategory, setSelectedParentCategory] = useState(null);
    const [validParentCategories, setValidParentCategories] = useState([]);
    const modalRef = useRef(null);

    useEffect(() => {
        const fetchChildCategories = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await itemCategoryService.getChildren();
                setChildCategories(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error("Error fetching child categories:", error);
                setError(error.message);
                setChildCategories([]);
            } finally {
                setLoading(false);
            }
        };

        fetchChildCategories();
    }, []);

    // Fetch parent categories for dropdown
    useEffect(() => {
        const fetchParentCategories = async () => {
            try {
                const data = await itemCategoryService.getParents();
                setValidParentCategories(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error("Error fetching parent categories:", error);
            }
        };

        fetchParentCategories();
    }, []);

    // Modal functions
    const openModal = (category = null) => {
        if (category) {
            setCategoryAction('update');
            setSelectedCategory(category);
            setNewCategoryName(category.name);
            setNewCategoryDescription(category.description);
            setSelectedParentCategory(category.parentCategory ? category.parentCategory.id : null);
        } else {
            setCategoryAction('create');
            setSelectedCategory(null);
            setNewCategoryName('');
            setNewCategoryDescription('');
            setSelectedParentCategory(null);
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setNewCategoryName('');
        setNewCategoryDescription('');
        setSelectedCategory(null);
        setSelectedParentCategory(null);
    };

    // Handle form submission
    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!newCategoryName || !newCategoryDescription) {
            displaySnackbar("Please provide both name and description.", "error");
            return;
        }

        // Add validation for parent category
        if (!selectedParentCategory) {
            displaySnackbar("Please select a parent category. Child categories must have a parent.", "error");
            return;
        }

        // Check for duplicate names in existing categories before making API call
        const isDuplicateName = childCategories.some(category =>
            category.name.toLowerCase().trim() === newCategoryName.toLowerCase().trim() &&
            (categoryAction === 'create' || category.id !== selectedCategory?.id)
        );

        if (isDuplicateName) {
            displaySnackbar("A category with this name already exists. Please choose a different name.", "error");
            return;
        }

        try {
            const requestBody = {
                name: newCategoryName.trim(),
                description: newCategoryDescription.trim()
            };

            if (selectedParentCategory) {
                requestBody.parentCategoryId = selectedParentCategory;
            }

            if (categoryAction === "create") {
                await itemCategoryService.create(requestBody);
            } else {
                await itemCategoryService.update(selectedCategory.id, requestBody);
            }

            closeModal();
            onRefresh(); // Refresh the main categories list

            displaySnackbar(
                `Category successfully ${categoryAction === 'update' ? 'updated' : 'added'}!`,
                "success"
            );

            // Refresh local list
            const fetchData = async () => {
                try {
                    const data = await itemCategoryService.getChildren();
                    setChildCategories(Array.isArray(data) ? data : []);
                } catch (error) {
                    console.error("Error refreshing categories:", error);
                }
            };
            fetchData();

        } catch (error) {
            console.error("Error saving category:", error);

            // Handle specific error messages
            let errorMessage = error.message;
            if (errorMessage.includes('already exists') ||
                errorMessage.includes('duplicate') ||
                errorMessage.includes('409') ||
                errorMessage.includes('422')) {
                errorMessage = "A category with this name already exists. Please choose a different name.";
            } else if (errorMessage.includes('400')) {
                errorMessage = "Invalid category data. Please check your input.";
            }

            displaySnackbar(errorMessage, "error");
        }
    };

    // Close modal when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                closeModal();
            }
        };

        if (isModalOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isModalOpen]);

    const columns = [
        {
            header: 'CATEGORY',
            accessor: 'name',
            sortable: true,
            width: '200px',
            minWidth: '150px'
        },
        {
            header: 'PARENT CATEGORY',
            accessor: 'parentCategory.name',
            sortable: true,
            width: '200px',
            minWidth: '150px',
            render: (row) => row.parentCategory ? row.parentCategory.name : "None"
        },
        {
            header: 'DESCRIPTION',
            accessor: 'description',
            sortable: true,
            width: '300px',
            minWidth: '200px',
            render: (row) => row.description || 'No description'
        }
    ];

    const filterableColumns = [
        {
            header: 'CATEGORY',
            accessor: 'name',
            filterType: 'text'
        },
        {
            header: 'PARENT CATEGORY',
            accessor: 'parentCategory.name',
            filterType: 'select'
        },
        {
            header: 'DESCRIPTION',
            accessor: 'description',
            filterType: 'text'
        }
    ];

    const actions = [
        {
            label: 'Edit',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
            ),
            className: 'edit',
            onClick: (row) => openModal(row)
        },
        {
            label: 'Delete',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
            ),
            className: 'delete',
            onClick: (row) => onDelete(row.id)
        }
    ];

    if (error) {
        return (
            <div className="category-table-container">
                <div className="error-container">
                    <p>Error: {error}</p>
                    <p>Please try again later or contact support.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="category-table-container">
            <DataTable
                data={childCategories}
                columns={columns}
                loading={loading}
                emptyMessage="No child categories found"
                actions={actions}
                className="child-categories-table"
                showSearch={true}
                showFilters={true}
                filterableColumns={filterableColumns}
                itemsPerPageOptions={[5, 10, 15, 20]}
                defaultItemsPerPage={10}
                actionsColumnWidth="120px"
                showAddButton={true}
                addButtonText="Add Child Category"
                addButtonIcon={
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                }
                onAddClick={() => openModal()}
            />

            {/* Modal for adding/editing child categories */}
            {isModalOpen && (
                <div className="category-modal-backdrop">
                    <div className="category-modal" ref={modalRef}>
                        <div className="category-modal-header">
                            <h2>{categoryAction === 'update' ? 'Edit Child Category' : 'Add Child Category'}</h2>
                            <button className="category-modal-close" onClick={closeModal}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6L6 18M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>

                        <div className="category-modal-content">
                            <form onSubmit={handleSubmit}>
                                <div className="form-row2">
                                    <div className="form-group2">
                                        <label htmlFor="childCategoryName">
                                            Category Name <span style={{ color: 'red' }}>*</span>
                                        </label>
                                        <input
                                            type="text"
                                            id="childCategoryName"
                                            name="name"
                                            value={newCategoryName}
                                            onChange={(e) => setNewCategoryName(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="form-group2">
                                        <label htmlFor="childCategoryDescription">
                                            Description <span style={{ color: 'red' }}>*</span>
                                        </label>
                                        <textarea
                                            id="childCategoryDescription"
                                            name="description"
                                            value={newCategoryDescription}
                                            onChange={(e) => setNewCategoryDescription(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-row2">
                                    <div className="form-group2">
                                        <label htmlFor="parentCategory">
                                            Parent Category <span style={{ color: 'red' }}>*</span>
                                        </label>
                                        <select
                                            id="parentCategory"
                                            value={selectedParentCategory || ""}
                                            onChange={(e) => setSelectedParentCategory(e.target.value || null)}
                                            required
                                        >
                                            <option value="" disabled>Select a parent category</option>
                                            {validParentCategories.map(category => (
                                                <option key={category.id} value={category.id}>
                                                    {category.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="category-modal-footer">
                                    <button type="submit" className="btn-primary">
                                        {categoryAction === 'update' ? 'Update Category' : 'Add Category'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChildCategoriesTable;