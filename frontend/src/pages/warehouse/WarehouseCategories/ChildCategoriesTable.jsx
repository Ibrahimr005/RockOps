import React, { useState, useEffect } from "react";
import DataTable from "../../../components/common/DataTable/DataTable.jsx"; // Updated import
import { FaEdit, FaTrash } from 'react-icons/fa';
import "./WarehouseViewItemCategories.scss";

const ChildCategoriesTable = ({
                                  onEdit,
                                  onDelete
                              }) => {
    const [childCategories, setChildCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Fetch child categories directly from the API
    useEffect(() => {
        const fetchChildCategories = async () => {
            setLoading(true);
            setError(null);
            try {
                const token = localStorage.getItem("token");

                if (!token) {
                    throw new Error("No authentication token found");
                }

                const response = await fetch(`http://localhost:8080/api/v1/itemCategories/children`, {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    }
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error("Error response:", errorText);
                    throw new Error(`Failed to fetch child categories: ${response.status} ${errorText}`);
                }

                const data = await response.json();
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

    // Define table columns for DataTable component
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

    // Filterable columns for DataTable
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

    // Actions array for DataTable
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
            onClick: (row) => onEdit(row)
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
                <div className="table-header-container">
                    <div className="left-section2">
                        <div className="item-count2">0 categories</div>
                    </div>
                    <div className="section-description">
                        (A more specific category that falls under a parent category, used to better organize and manage items)
                    </div>
                </div>
                <div className="error-container">
                    <p>Error: {error}</p>
                    <p>Please try again later or contact support.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="category-table-container">
            <div className="table-header-container">
                <div className="left-section2">
                    <h2 className="table-section-title">Child Categories</h2>
                    <div className="item-count2">{childCategories.length} categories</div>
                </div>
                <div className="section-description">
                    (A more specific category that falls under a parent category, used to better organize and manage items)
                </div>
            </div>

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
            />
        </div>
    );
};

export default ChildCategoriesTable;