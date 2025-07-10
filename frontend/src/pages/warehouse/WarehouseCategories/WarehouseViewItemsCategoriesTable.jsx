import React, { useState, useEffect } from "react";
import "./WarehouseViewItemCategories.scss";
import ParentCategoriesTable from "./ParentCategoriesTable";
import ChildCategoriesTable from "./ChildCategoriesTable";
import Snackbar from "../../../components/common/Snackbar/Snackbar.jsx";
import ConfirmationDialog from "../../../components/common/ConfirmationDialog/ConfirmationDialog.jsx";
import ProcurementIntroCard from "../../../components/common/IntroCard/IntroCard.jsx";
import itemCategoryImg from "../../../assets/imgs/itemCategoryLight.png";
import itemCategoryDarkImg from "../../../assets/imgs/itemCategoryDarky.png";

const WarehouseViewItemCategoriesTable = ({ warehouseId, onAddButtonClick }) => {
  const [allCategories, setAllCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tableUpdateTrigger, setTableUpdateTrigger] = useState(0);

  // Tab state
  const [activeTab, setActiveTab] = useState('parent');

  // Snackbar states
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState('success');

  // Confirmation dialog states
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Helper function to show snackbar
// Helper function to show snackbar
  const displaySnackbar = (message, type = 'success') => {
    setSnackbarMessage(message);
    setSnackbarType(type);
    setShowSnackbar(true);
  };

  // Helper function to close snackbar
  const closeSnackbar = () => {
    setShowSnackbar(false);
  };

  // Define fetchAllCategories function at the component level
  const fetchAllCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch('http://localhost:8080/api/v1/itemCategories', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API error response:", errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      setAllCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching categories:", error);
      setError(error.message);
      setAllCategories([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all categories on component mount
  useEffect(() => {
    try {
      fetchAllCategories();
    } catch (error) {
      console.error("Error in useEffect:", error);
      setError(error.message);
    }
  }, []);

  // Function to initiate delete confirmation
  const handleDeleteRequest = (id) => {
    // Find the category to get its name for the confirmation dialog
    const category = allCategories.find(cat => cat.id === id);
    setCategoryToDelete({ id, name: category?.name || 'Unknown Category' });
    setShowConfirmDialog(true);
  };

  // Function to confirm deletion
  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) return;

    try {
      setDeleteLoading(true);
      const token = localStorage.getItem("token");

      const response = await fetch(`http://localhost:8080/api/v1/itemCategories/${categoryToDelete.id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Delete error response:", errorText);
        console.log("Raw error text:", errorText);
        console.log("Looking for CHILD_CATEGORIES_EXIST:", errorText.includes("CHILD_CATEGORIES_EXIST"));
        console.log("Looking for ITEM_TYPES_EXIST:", errorText.includes("ITEM_TYPES_EXIST"));

        // Check for specific dependency errors from backend
        if (errorText.includes("CHILD_CATEGORIES_EXIST")) {
          throw new Error("Cannot delete category: has child categories. Remove child categories first.");
        }
        else if (errorText.includes("ITEM_TYPES_EXIST")) {
          throw new Error("Cannot delete category: has item types assigned. Remove item types first.");
        }
        else if (errorText.includes("ItemCategory not found")) {
          throw new Error("Category not found. It may have already been deleted.");
        }
        else if (response.status === 500) {
          // Handle generic 500 errors - provide helpful guidance
          throw new Error("Cannot delete category: has dependencies. Remove child categories and item types first.");
        }
        else {
          throw new Error(`Failed to delete category: ${response.status} - ${errorText}`);
        }
      }

      // Success - update UI
      setAllCategories(prevCategories => prevCategories.filter(cat => cat.id !== categoryToDelete.id));
      setTableUpdateTrigger(prev => prev + 1);
      displaySnackbar(`Category "${categoryToDelete.name}" successfully deleted!`, "success");

      // Refresh data to ensure consistency
      fetchAllCategories();

    } catch (error) {
      console.error("Error deleting item category:", error);
      displaySnackbar(error.message, "error");
    } finally {
      setDeleteLoading(false);
      setShowConfirmDialog(false);
      setCategoryToDelete(null);
    }
  };

  // Function to cancel deletion
  const cancelDeleteCategory = () => {
    setShowConfirmDialog(false);
    setCategoryToDelete(null);
    setDeleteLoading(false);
  };

  // Show loading state
  if (loading) {
    return (
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <p>Loading categories...</p>
        </div>
    );
  }

  // If there's an error, show error message instead of crashing
  if (error) {
    return (
        <div className="error-container">
          <p>Error loading categories: {error}</p>
          <button onClick={fetchAllCategories} className="retry-button">
            Retry
          </button>
        </div>
    );
  }

  return (
      <>
        {/* Item Categories Intro Card */}
        <div className="item-categories-intro-wrapper">
          <ProcurementIntroCard
              title="Item Categories"
              label="WAREHOUSE MANAGEMENT"
              lightModeImage={itemCategoryImg}
              darkModeImage={itemCategoryDarkImg}
              stats={[
                { value: allCategories.filter(cat => !cat.parentCategory).length.toString(), label: "Parent Categories" },
                { value: allCategories.filter(cat => cat.parentCategory).length.toString(), label: "Child Categories" },
              ]}
              className="item-categories-intro"
          />
        </div>

        {/* Tabs Container */}
        <div className="categories-tabs-container">
          <div className="categories-tabs">
            <button
                className={`categories-tab ${activeTab === 'parent' ? 'active' : ''}`}
                onClick={() => setActiveTab('parent')}
            >
              Parent Categories
            </button>
            <button
                className={`categories-tab ${activeTab === 'child' ? 'active' : ''}`}
                onClick={() => setActiveTab('child')}
            >
              Child Categories
            </button>
          </div>
        </div>

        {/* Category Info Cards */}
        <div className="category-info-card">
          <div className="category-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <div className="category-info-content">
            <h3>Item Types Can Only Be Assigned to Child Categories</h3>
            <p>
              <strong>Important:</strong> To create or assign item types, you must use child categories only.
              Child categories require a parent category to be created first. This two-level hierarchy ensures proper organization:
              Parent → Child → Item Types.
            </p>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'parent' && (
            <ParentCategoriesTable
                onDelete={handleDeleteRequest}
                onRefresh={fetchAllCategories}
                displaySnackbar={displaySnackbar}
                key={`parent-${tableUpdateTrigger}`}
            />
        )}

        {activeTab === 'child' && (
            <ChildCategoriesTable
                onDelete={handleDeleteRequest}
                onRefresh={fetchAllCategories}
                displaySnackbar={displaySnackbar}
                key={`child-${tableUpdateTrigger}`}
            />
        )}

        {/* Confirmation Dialog */}
        <ConfirmationDialog
            isVisible={showConfirmDialog}
            type="delete"
            title="Delete Category"
            message={
              categoryToDelete
                  ? `Are you sure you want to delete the category "${categoryToDelete.name}"? This action cannot be undone.`
                  : "Are you sure you want to delete this category?"
            }
            confirmText="Delete"
            cancelText="Cancel"
            onConfirm={confirmDeleteCategory}
            onCancel={cancelDeleteCategory}
            isLoading={deleteLoading}
            size="large"
        />

        {/* Centralized Snackbar */}
        <Snackbar
            type={snackbarType}
            message={snackbarMessage}
            show={showSnackbar}
            onClose={closeSnackbar}
            duration={snackbarType === 'error' ? 5000 : 3000}
        />
      </>
  );
};

export default WarehouseViewItemCategoriesTable;