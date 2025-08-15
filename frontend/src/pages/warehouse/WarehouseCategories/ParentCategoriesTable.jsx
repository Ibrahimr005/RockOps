import React, { useState, useEffect, useRef } from "react";
import DataTable from "../../../components/common/DataTable/DataTable.jsx";
import { FaEdit, FaTrash } from 'react-icons/fa';
import "./WarehouseViewItemCategories.scss";
import { itemCategoryService } from '../../../services/warehouse/itemCategoryService';

const ParentCategoriesTable = ({ onDelete, onRefresh, displaySnackbar }) => {
    const [parentCategories, setParentCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [categoryAction, setCategoryAction] = useState('create');
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryDescription, setNewCategoryDescription] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const modalRef = useRef(null);

    useEffect(() => {
        const fetchParentCategories = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await itemCategoryService.getParents();
                console.log("dataaaa:" + JSON.stringify(data, null, 2));
                setParentCategories(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error("Error fetching parent categories:", error);
                setError(error.message);
                setParentCategories([]);
            } finally {
                setLoading(false);
            }
        };

        fetchParentCategories();
    }, []);

    useEffect(() => {
        if (isModalOpen) {
            document.body.classList.add("modal-open");
        } else {
            document.body.classList.remove("modal-open");
        }

        // Cleanup when component unmounts
        return () => {
            document.body.classList.remove("modal-open");
        };
    }, [isModalOpen]);


    // Modal functions
    const openModal = (category = null) => {
        if (category) {
            setCategoryAction('update');
            setSelectedCategory(category);
            setNewCategoryName(category.name);
            setNewCategoryDescription(category.description);
        } else {
            setCategoryAction('create');
            setSelectedCategory(null);
            setNewCategoryName('');
            setNewCategoryDescription('');
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setNewCategoryName('');
        setNewCategoryDescription('');
        setSelectedCategory(null);
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!newCategoryName || !newCategoryDescription) {
            displaySnackbar("Please provide both name and description.", "error");
            return;
        }

        // Check for duplicate names in existing categories before making API call
        const isDuplicateName = parentCategories.some(category =>
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
                    const data = await itemCategoryService.getParents();
                    setParentCategories(Array.isArray(data) ? data : []);
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
            width: '300px',
            minWidth: '200px'
        },
        {
            header: 'DESCRIPTION',
            accessor: 'description',
            sortable: true,
            width: '400px',
            minWidth: '250px',
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
                data={parentCategories}
                columns={columns}
                loading={loading}
                emptyMessage="No parent categories found"
                actions={actions}
                className="parent-categories-table"
                showSearch={true}
                showFilters={true}
                filterableColumns={filterableColumns}
                itemsPerPageOptions={[5, 10, 15, 20]}
                defaultItemsPerPage={10}
                actionsColumnWidth="120px"
                showAddButton={true}
                addButtonText="Add Parent Category"
                addButtonIcon={
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                }
                onAddClick={() => openModal()}
            />

            {/* Modal for adding/editing parent categories */}
            {isModalOpen && (
                <div className="category-modal-backdrop">
                    <div className="category-modal" ref={modalRef}>
                        <div className="category-modal-header">
                            <h2>{categoryAction === 'update' ? 'Edit Parent Category' : 'Add Parent Category'}</h2>
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
                                        <label htmlFor="parentCategoryName">
                                            Category Name <span style={{ color: 'red' }}>*</span>
                                        </label>
                                        <input
                                            type="text"
                                            id="parentCategoryName"
                                            name="name"
                                            value={newCategoryName}
                                            onChange={(e) => setNewCategoryName(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="form-group2">
                                        <label htmlFor="parentCategoryDescription">
                                            Description <span style={{ color: 'red' }}>*</span>
                                        </label>
                                        <textarea
                                            id="parentCategoryDescription"
                                            name="description"
                                            value={newCategoryDescription}
                                            onChange={(e) => setNewCategoryDescription(e.target.value)}
                                            required
                                        />
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

export default ParentCategoriesTable;